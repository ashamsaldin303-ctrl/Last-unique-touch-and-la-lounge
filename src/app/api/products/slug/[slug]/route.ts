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

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(req.url)
    // Brand is OPTIONAL: the product catalog spans all three storefronts, so
    // a slug lookup must not be fenced to one brand (red-carpet / led-dance-
    // floor live under LA_LOUNGE / YOUR_BIRTHDAY). When a brand IS supplied it
    // still narrows the lookup (used by brand-scoped storefronts).
    const brand = searchParams.get('brand')

    const product = await db.product.findFirst({
      where: { slug, ...(brand ? { brand } : {}), isActive: true },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({
      product: {
        id: product.id,
        brand: product.brand,
        slug: product.slug,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        descriptionAr: product.descriptionAr,
        descriptionEn: product.descriptionEn,
        rentalPricePerDay: product.rentalPricePerDay,
        securityDeposit: product.securityDeposit,
        images: parseImages(product.images),
        model3dUrl: product.model3dUrl,
        stock: product.stock,
        isActive: product.isActive,
        categoryId: product.categoryId,
        category: product.category,
      },
    })
  } catch (error) {
    console.error('[api/products/slug] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
