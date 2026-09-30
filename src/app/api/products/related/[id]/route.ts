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
    if (!product || product.brand !== brand) {
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
    console.error('[api/products/related] GET error:', error)
    return NextResponse.json({ products: [] })
  }
}
