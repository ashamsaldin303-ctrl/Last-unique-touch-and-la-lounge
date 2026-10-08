import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guardBodySize } from '@/app/api/_lib/guards'
import { logSecurityEvent, requireAdmin } from '@/lib/admin-auth'
import {
  PRODUCT_BRANDS,
  findAvailableSlug,
  listCategoryItems,
  serializeCategory,
  slugify,
  validationDetails,
} from '@/app/api/_lib/product-shape'

export const dynamic = 'force-dynamic'

/** Body-size cap for the JSON category payload. */
const MAX_BODY_BYTES = 256 * 1024

const categoryInputSchema = z
  .object({
    nameAr: z.string().trim().min(1).max(60),
    nameEn: z.string().trim().min(1).max(60),
    brand: z.enum(PRODUCT_BRANDS),
  })
  .strict()

/**
 * GET /api/admin/categories — categories with product counts (protected).
 * Query param: `brand` (optional — absent = all brands).
 * Response: 200 `{ categories: CategoryItem[] }`.
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { searchParams } = new URL(req.url)
    const brandParam = searchParams.get('brand')?.trim()
    const brand = brandParam && brandParam.length > 0 ? brandParam : undefined
    const categories = await listCategoryItems(brand)
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[api/admin/categories] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/categories — create a category (protected, ≤256KB body).
 * Duplicate names within the same brand (nameAr OR nameEn, case-insensitive)
 * answer 409 `{ error:'category_exists' }`. The model's required slug is
 * generated server-side (slugify + uniqueness suffixes). Success: 201
 * `{ category: CategoryItem }`.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const oversized = guardBodySize(req, MAX_BODY_BYTES)
  if (oversized) return oversized

  try {
    const body = await req.json().catch(() => null)
    const parsed = categoryInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', details: validationDetails(parsed.error) },
        { status: 400 },
      )
    }
    const input = parsed.data

    // Case-insensitive duplicate check within the brand (SQLite LIKE rules
    // are not relied on here — the per-brand list is tiny, compare in JS).
    const siblings = await db.category.findMany({
      where: { brand: input.brand },
      select: { nameAr: true, nameEn: true },
    })
    const nameArLower = input.nameAr.toLowerCase()
    const nameEnLower = input.nameEn.toLowerCase()
    const duplicate = siblings.some(
      (c) => c.nameAr.toLowerCase() === nameArLower || c.nameEn.toLowerCase() === nameEnLower,
    )
    if (duplicate) {
      return NextResponse.json({ error: 'category_exists' }, { status: 409 })
    }

    const base = slugify(input.nameEn || input.nameAr)
    const slug = await findAvailableSlug(
      base,
      (candidate) =>
        db.category
          .findFirst({ where: { brand: input.brand, slug: candidate }, select: { id: true } })
          .then((found) => found !== null),
    )

    try {
      const category = await db.category.create({
        data: {
          nameAr: input.nameAr,
          nameEn: input.nameEn,
          brand: input.brand,
          slug,
        },
        include: { _count: { select: { products: true } } },
      })

      logSecurityEvent('admin_category_create', req, { id: category.id })
      return NextResponse.json({ category: serializeCategory(category) }, { status: 201 })
    } catch (error) {
      // Lost the brand+slug unique race against a concurrent create.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: 'category_exists' }, { status: 409 })
      }
      throw error
    }
  } catch (error) {
    console.error('[api/admin/categories] POST error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
