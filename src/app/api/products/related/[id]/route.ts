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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const brand = searchParams.get('brand') ?? 'LUT'

    const product = await db.product.findUnique({ where: { id }, include: { category: true } })
    // Missing product is a real 404; a brand mismatch is deliberate — the
    // storefront asked about another brand's product, so an empty rail (200)
    // keeps the client's fallback path simple.
    if (!product) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (product.brand !== brand) {
      return NextResponse.json({ products: [] })
    }

    const related = await db.product.findMany({
      where: { brand, isActive: true, categoryId: product.categoryId, id: { not: product.id } },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    })

    return NextResponse.json({
      products: related.map((p) => ({
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
    })
  } catch (error) {
    // Distinguish outages from "no related products": a DB failure is a 500,
    // not an empty 200 that hides the problem from monitoring.
    console.error('[api/products/related] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
