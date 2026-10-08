import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { maskPiiValue } from '@/lib/admin-auth'
import { checkRateLimit, guardBodySize } from '@/app/api/_lib/guards'

export const dynamic = 'force-dynamic'

const MS_PER_DAY = 1000 * 60 * 60 * 24

const itemSchema = z.object({
  productId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  // Advisory only — never trusted for pricing. The server recomputes the
  // duration from startDate/endDate (see POST below) and rejects material
  // drift between the two.
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

/** Round to KWD's 3-decimal minor unit (consistent with Float storage). */
function roundKwd(amount: number): number {
  return Math.round(amount * 1000) / 1000
}

/** Transaction-internal sentinel errors mapped to HTTP responses. */
class OrderConflictError extends Error {}
class OrderInvalidProductsError extends Error {}

/**
 * POST /api/orders — creates rental bookings from cart items.
 * Prices AND durations are recomputed server-side from the DB (client totals
 * and `days` are ignored for pricing). All writes happen in one transaction:
 * a failure on any item rolls the entire order back.
 */
export async function POST(req: NextRequest) {
  try {
    // Public endpoint guards: 10 requests / minute / IP (in-memory sliding
    // window, independent per route) + pre-parse body-size cap.
    const limited = checkRateLimit(req, 'orders', 10, 60 * 1000)
    if (limited) return limited
    const oversized = guardBodySize(req)
    if (oversized) return oversized

    const body = await req.json().catch(() => null)
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const { customerName, customerPhone, customerEmail, address, city, notes, items } = parsed.data

    // Date sanity bounds shared by every item: no past start dates and no
    // bookings more than 18 months out (mirrors the birthday route's horizon).
    // 'YYYY-MM-DD' strings parse to UTC midnight, so this is a UTC anchor.
    const todayUtcMidnight = new Date(new Date().toISOString().slice(0, 10))
    const horizon = new Date()
    horizon.setMonth(horizon.getMonth() + 18)

    // Phase 1 — validate EVERY item before any write. Nothing is persisted
    // here, so a failure on item k cannot orphan bookings for items 1..k-1.
    type OrderPlan = {
      productId: string
      startDate: Date
      endDate: Date
      quantity: number
    }
    const plans: OrderPlan[] = []

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
      if (startDate < todayUtcMidnight || endDate > horizon) {
        return NextResponse.json({ error: 'invalid_dates' }, { status: 400 })
      }

      // Server-authoritative duration: ceil of the day difference between
      // the stored dates, clamped to 1..365 — mirrors the storefront's
      // rentalDays() semantics. Date-only strings anchor to UTC midnight,
      // so the difference is whole days regardless of the server timezone.
      const serverDays = Math.min(365, Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY)))
      // Client `days` is advisory: a drift larger than one day means the
      // cart is stale — reject instead of silently repricing.
      if (Math.abs(item.days - serverDays) > 1) {
        return NextResponse.json({ error: 'days_mismatch' }, { status: 400 })
      }

      plans.push({ productId: item.productId, startDate, endDate, quantity: item.quantity })
    }

    // Phase 2 — one transaction for all writes. Product rows are re-read and
    // stock re-checked INSIDE the transaction, closing the check-then-create
    // race; any failure rolls the whole order back (single error response).
    const results = await db.$transaction(
      async (tx) => {
        const out: Array<{ id: string; totalAmount: number }> = []
        for (const plan of plans) {
          const product = await tx.product.findUnique({ where: { id: plan.productId } })
          if (!product || !product.isActive) {
            throw new OrderInvalidProductsError()
          }

          // Stock-aware overlap check (reads this transaction's own writes,
          // so duplicate cart lines of the same product are counted too).
          const overlapping = await tx.booking.findMany({
            where: {
              productId: product.id,
              status: { in: ['PENDING', 'CONFIRMED'] },
              startDate: { lte: plan.endDate },
              endDate: { gte: plan.startDate },
            },
            select: { quantity: true },
          })
          const bookedQty = overlapping.reduce((sum, b) => sum + b.quantity, 0)
          if (bookedQty + plan.quantity > product.stock) {
            throw new OrderConflictError()
          }

          // Pricing uses the server-recomputed duration, never client `days`.
          const serverDays = Math.min(
            365,
            Math.max(
              1,
              Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / MS_PER_DAY)
            )
          )
          const itemTotal = roundKwd(product.rentalPricePerDay * serverDays * plan.quantity)
          const deposit = roundKwd(product.securityDeposit * plan.quantity)
          const totalAmount = roundKwd(itemTotal + deposit)

          const booking = await tx.booking.create({
            data: {
              brand: product.brand,
              productId: product.id,
              startDate: plan.startDate,
              endDate: plan.endDate,
              status: 'PENDING',
              customerName,
              customerPhone,
              customerEmail,
              quantity: plan.quantity,
              totalAmount,
              address,
              city,
              notes: notes || null,
            },
          })
          out.push({ id: booking.id, totalAmount: booking.totalAmount })
        }
        return out
      },
      { timeout: 10_000 }
    )

    let grandTotal = 0
    for (const result of results) grandTotal += result.totalAmount
    const grandTotalRounded = roundKwd(grandTotal)

    // Post-commit audit log (r2 NEW-4): fire-and-forget — the bookings are
    // already COMMITTED, so a SecurityLog write failure must never convert
    // this success into a 500 (the client would retry and duplicate the
    // order). Email masked per r1-a3 #10.
    void db.securityLog
      .create({
        data: {
          event: 'order_created',
          details: JSON.stringify({
            items: results.length,
            email: maskPiiValue(customerEmail),
            total: grandTotalRounded,
          }),
        },
      })
      .catch((err: unknown) => {
        console.error('[api/orders] security log write failed:', err)
      })

    return NextResponse.json({
      ok: true,
      orderId: results[0]?.id ?? '',
      bookings: results,
      total: grandTotalRounded,
    })
  } catch (error) {
    if (error instanceof OrderConflictError) {
      return NextResponse.json({ error: 'insufficient_stock' }, { status: 409 })
    }
    if (error instanceof OrderInvalidProductsError) {
      return NextResponse.json({ error: 'invalid_products' }, { status: 400 })
    }
    console.error('[api/orders] POST error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
