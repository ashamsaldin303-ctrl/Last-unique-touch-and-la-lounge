import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { guardBodySize } from '@/app/api/_lib/guards'
import { logSecurityEvent, requireAdmin } from '@/lib/admin-auth'
import {
  findAvailableSlug,
  listCategoryItems,
  productInclude,
  productInputSchema,
  serializeProduct,
  slugify,
  validationDetails,
} from '@/app/api/_lib/product-shape'

export const dynamic = 'force-dynamic'

/** Body-size cap for the JSON create payload (images are URLs, not blobs). */
const MAX_BODY_BYTES = 256 * 1024

function parsePagination(searchParams: URLSearchParams): { page: number; pageSize: number } {
  const page = Number.parseInt(searchParams.get('page') ?? '', 10)
  const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '', 10)
  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(pageSize, 50) : 10,
  }
}

/**
 * GET /api/admin/products — paginated product list (protected).
 * Query params: `brand` (optional — absent = all brands), `page` (default 1),
 * `pageSize` (default 10, max 50), `search` (contains over nameAr/nameEn/slug;
 * SQLite LIKE is already ASCII-case-insensitive so NO `mode:'insensitive'`;
 * `%`/`_` are stripped — Prisma does not escape LIKE wildcards, see below),
 * `categoryId`, `includeInactive` (default TRUE — admins see inactive rows
 * too; only the literal `false` filters to active products).
 *
 * Response: `{ items, page, pageSize, total, totalPages, categories }` where
 * `categories` covers the requested brand (or all brands) with product counts.
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { searchParams } = new URL(req.url)
    const { page, pageSize } = parsePagination(searchParams)
    const brandParam = searchParams.get('brand')?.trim()
    const brand = brandParam && brandParam.length > 0 ? brandParam : undefined
    // LIKE wildcard sanitization (audit r3-r1 L4): Prisma `contains` on
    // SQLite does NOT escape the LIKE metacharacters `%`/`_` (live-verified:
    // search='%' matched every row), so a raw term would act as a wildcard
    // pattern. Both characters are stripped, keeping `contains` a literal
    // substring test; a term made ONLY of wildcards ('%', '_') reduces to ''
    // and is answered with an empty set (`id in []`) instead of silently
    // degrading to match-all.
    const searchRaw = searchParams.get('search')?.trim()
    const search = searchRaw?.replace(/[%_]/g, '')
    const categoryId = searchParams.get('categoryId')?.trim()
    const includeInactive = searchParams.get('includeInactive') !== 'false'

    const where: Prisma.ProductWhereInput = {}
    if (brand) where.brand = brand
    if (categoryId && categoryId.length > 0) where.categoryId = categoryId
    if (!includeInactive) where.isActive = true
    if (searchRaw) {
      where.OR = search
        ? [
            { nameAr: { contains: search } },
            { nameEn: { contains: search } },
            { slug: { contains: search } },
          ]
        : [{ id: { in: [] } }]
    }

    const [total, products, categories] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: productInclude,
      }),
      listCategoryItems(brand),
    ])

    return NextResponse.json({
      items: products.map(serializeProduct),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      categories,
    })
  } catch (error) {
    console.error('[api/admin/products] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/products — create a product (protected, ≤256KB JSON body).
 * Validation failures answer 400 `{ error: 'validation', details: {field: code} }`.
 * `slug` defaults to slugify(nameEn || nameAr) with uniqueness suffixes
 * (`-2`..`-50`, then random hex); `categoryId` defaults to the brand's first
 * category — an unknown/mismatched category answers 400, a brand without
 * categories answers 400 `{ error: 'no_categories' }`.
 * Success: 201 `{ item }`; slug unique-constraint race: 409 `{ error:'slug_exists' }`.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const oversized = guardBodySize(req, MAX_BODY_BYTES)
  if (oversized) return oversized

  try {
    const body = await req.json().catch(() => null)
    const parsed = productInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', details: validationDetails(parsed.error) },
        { status: 400 },
      )
    }
    const input = parsed.data

    // --- Category resolution: explicit (must exist + match brand) or the
    // brand's first category by nameAr. A brand with no categories is a
    // catalog-level misconfiguration, answered with its own error code.
    let categoryId = input.categoryId
    if (categoryId) {
      const category = await db.category.findFirst({
        where: { id: categoryId, brand: input.brand },
        select: { id: true },
      })
      if (!category) {
        const exists = await db.category.findUnique({
          where: { id: categoryId },
          select: { brand: true },
        })
        return NextResponse.json(
          {
            error: 'validation',
            details: { categoryId: exists ? 'brand_mismatch' : 'not_found' },
          },
          { status: 400 },
        )
      }
    } else {
      const first = await db.category.findFirst({
        where: { brand: input.brand },
        orderBy: { nameAr: 'asc' },
        select: { id: true },
      })
      if (!first) {
        return NextResponse.json({ error: 'no_categories' }, { status: 400 })
      }
      categoryId = first.id
    }

    // --- Slug resolution: explicit slug else slugified name, unique per brand.
    const base = input.slug ?? slugify(input.nameEn || input.nameAr)
    const slug = await findAvailableSlug(base, (candidate) =>
      db.product
        .findFirst({ where: { brand: input.brand, slug: candidate }, select: { id: true } })
        .then((found) => found !== null),
    )

    try {
      const product = await db.product.create({
        data: {
          brand: input.brand,
          slug,
          nameAr: input.nameAr,
          nameEn: input.nameEn,
          descriptionAr: input.descriptionAr ?? '',
          descriptionEn: input.descriptionEn ?? '',
          rentalPricePerDay: input.priceKwd,
          securityDeposit: input.depositKwd,
          stock: input.stock ?? 1,
          images: JSON.stringify(input.images ?? []),
          categoryId,
        },
        include: productInclude,
      })

      logSecurityEvent('admin_product_create', req, { id: product.id })
      return NextResponse.json({ item: serializeProduct(product) }, { status: 201 })
    } catch (error) {
      // A concurrent create may still win the brand+slug unique race.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: 'slug_exists' }, { status: 409 })
      }
      throw error
    }
  } catch (error) {
    console.error('[api/admin/products] POST error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
