import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function parseImages(imagesField: string | null): string[] {
  if (!imagesField) return []
  try {
    const parsed = JSON.parse(imagesField)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const PER_PAGE = 12

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    // 'ALL' (or omitted brand filter) returns every brand's storefront in
    // one catalog — used by the unified products page brand filter.
    const brandParam = searchParams.get('brand') ?? 'LUT'
    const brand = brandParam === 'ALL' ? undefined : brandParam
    const category = searchParams.get('category') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const sort = searchParams.get('sort') ?? 'newest'
    // parseInt (not Number) so garbage like `page=abc` degrades to page 1
    // instead of NaN → Prisma skip validation error → 500.
    const pageRaw = Number.parseInt(searchParams.get('page') ?? '1', 10)
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1

    // Search runs IN the query (not post-pagination) so results on any page
    // are returned and `total`/`totalPages` reflect the filtered set.
    // Note: Prisma rejects `mode: 'insensitive'` on SQLite (verified live),
    // but SQLite's LIKE is ASCII-case-insensitive by default, so `contains`
    // already gives case-insensitive matching (Arabic has no case).
    //
    // LIKE wildcard sanitization (audit r3-r1 L4): Prisma `contains` on
    // SQLite does NOT escape the LIKE metacharacters `%`/`_` (live-verified:
    // search='%' matched the whole catalog), so a raw term would act as a
    // wildcard pattern. Both characters are stripped, keeping `contains` a
    // literal substring test; a term made ONLY of wildcards ('%', '_')
    // reduces to '' and is answered with an empty set (`id in []`) instead
    // of silently degrading to match-all.
    const rawQ = search?.trim()
    const q = rawQ?.replace(/[%_]/g, '')
    const searchWhere: Record<string, unknown> = rawQ
      ? q
        ? {
            OR: [
              { nameAr: { contains: q } },
              { nameEn: { contains: q } },
              { descriptionAr: { contains: q } },
              { descriptionEn: { contains: q } },
            ],
          }
        : { id: { in: [] } }
      : {}

    const where: Record<string, unknown> = {
      ...(brand ? { brand } : {}),
      isActive: true,
      ...(category && category !== 'all' ? { category: { slug: category } } : {}),
      ...searchWhere,
    }

    const products = await db.product.findMany({
      where,
      include: { category: true },
      orderBy:
        sort === 'price-asc'
          ? { rentalPricePerDay: 'asc' }
          : sort === 'price-desc'
            ? { rentalPricePerDay: 'desc' }
            : { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    })

    const total = await db.product.count({ where })

    // Category facets: when browsing a single brand show that brand's
    // categories; for the unified catalog aggregate them all (unique by id).
    const categoryRows = brand
      ? await db.category.findMany({ where: { brand } })
      : await db.category.findMany()
    const seen = new Set<string>()
    const categories = categoryRows.filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        brand: p.brand,
        slug: p.slug,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        descriptionAr: p.descriptionAr,
        descriptionEn: p.descriptionEn,
        rentalPricePerDay: p.rentalPricePerDay,
        securityDeposit: p.securityDeposit,
        images: parseImages(p.images),
        model3dUrl: p.model3dUrl,
        stock: p.stock,
        isActive: p.isActive,
        categoryId: p.categoryId,
        category: p.category,
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
      categories,
    })
  } catch (error) {
    console.error('[api/products] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
