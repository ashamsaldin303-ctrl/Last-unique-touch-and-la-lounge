import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const itemSchema = z.object({
  productId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  days: z.number().int().min(1).max(365),
})

const orderSchema = z.object({
  customerName: z.string().min(3).max(100),
  customerPhone: z.string().min(7).max(30),
  customerEmail: z.string().email().max(200),
  address: z.string().min(10).max(500),
  city: z.string().min(2).max(100),
  notes: z.string().max(2000).optional().or(z.literal('')),
  items: z.array(itemSchema).min(1).max(50),
})

/**
 * POST /api/orders — creates rental bookings from cart items.
 * Prices are recomputed server-side from the DB (client totals are ignored).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const { customerName, customerPhone, customerEmail, address, city, notes, items } = parsed.data

    const results: Array<{ id: string; totalAmount: number }> = []
    let grandTotal = 0

    for (const item of items) {
      const product = await db.product.findUnique({ where: { id: item.productId } })
      if (!product || !product.isActive) {
        return NextResponse.json({ error: 'invalid_products' }, { status: 400 })
      }

      const startDate = new Date(item.startDate)
      const endDate = new Date(item.endDate)
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
        return NextResponse.json({ error: 'invalid_dates' }, { status: 400 })
      }

      // Stock-aware overlap check
      const overlapping = await db.booking.findMany({
        where: {
          productId: product.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        select: { quantity: true },
      })
      const bookedQty = overlapping.reduce((sum, b) => sum + b.quantity, 0)
      if (bookedQty + item.quantity > product.stock) {
        return NextResponse.json({ error: 'insufficient_stock' }, { status: 409 })
      }

      const itemTotal = product.rentalPricePerDay * item.days * item.quantity
      const deposit = product.securityDeposit * item.quantity
      const totalAmount = Math.round((itemTotal + deposit) * 1000) / 1000
      grandTotal += totalAmount

      const booking = await db.booking.create({
        data: {
          brand: product.brand,
          productId: product.id,
          startDate,
          endDate,
          status: 'PENDING',
          customerName,
          customerPhone,
          customerEmail,
          quantity: item.quantity,
          totalAmount,
          address,
          city,
          notes: notes || null,
        },
      })
      results.push({ id: booking.id, totalAmount })
    }

    await db.securityLog.create({
      data: {
        event: 'order_created',
        details: JSON.stringify({
          items: results.length,
          email: customerEmail,
          total: Math.round(grandTotal * 1000) / 1000,
        }),
      },
    })

    return NextResponse.json({
      ok: true,
      orderId: results[0]?.id ?? '',
      bookings: results,
      total: Math.round(grandTotal * 1000) / 1000,
    })
  } catch (error) {
    console.error('[api/orders] POST error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
