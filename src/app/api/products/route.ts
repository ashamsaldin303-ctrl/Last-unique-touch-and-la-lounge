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
    const brand = searchParams.get('brand') ?? 'LUT'
    const category = searchParams.get('category') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const sort = searchParams.get('sort') ?? 'newest'
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))

    const where: Record<string, unknown> = { brand, isActive: true }
    if (category && category !== 'all') where.category = { slug: category }

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

    // Search filter (applied post-query for AR/EN both) — count matches separately
    let filtered = products
    if (search) {
      const q = search.trim().toLowerCase()
      filtered = products.filter(
        (p) =>
          p.nameAr.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.descriptionAr.toLowerCase().includes(q) ||
          p.descriptionEn.toLowerCase().includes(q)
      )
    }

    const total = await db.product.count({
      where: {
        brand,
        isActive: true,
        ...(category && category !== 'all' ? { category: { slug: category } } : {}),
      },
    })

    const categories = await db.category.findMany({ where: { brand } })

    return NextResponse.json({
      products: filtered.map((p) => ({
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
      total: search ? filtered.length + (page - 1) * PER_PAGE : total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
      categories,
    })
  } catch (error) {
    console.error('[api/products] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
