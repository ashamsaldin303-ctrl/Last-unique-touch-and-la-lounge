import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Stock-aware availability check — mirrors the original repo's logic:
 * sum booked quantities with overlapping dates (PENDING/CONFIRMED) and
 * compare against product stock.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const quantity = Math.max(1, Number(searchParams.get('quantity') ?? '1'))

    if (!start || !end) {
      return NextResponse.json({ error: 'invalid_dates' }, { status: 400 })
    }

    const startDate = new Date(start)
    const endDate = new Date(end)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      return NextResponse.json({ error: 'invalid_dates' }, { status: 400 })
    }

    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const bookings = await db.booking.findMany({
      where: {
        productId: id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { quantity: true },
    })

    const bookedQty = bookings.reduce((sum, b) => sum + b.quantity, 0)
    const availableStock = Math.max(0, product.stock - bookedQty)

    return NextResponse.json({
      available: availableStock >= quantity,
      availableStock,
      stock: product.stock,
    })
  } catch (error) {
    console.error('[api/products/availability] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
