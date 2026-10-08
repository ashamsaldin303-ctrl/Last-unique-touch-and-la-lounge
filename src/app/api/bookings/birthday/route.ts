import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { logSecurityEvent } from '@/lib/admin-auth'
import { checkRateLimit, guardBodySize } from '@/app/api/_lib/guards'

export const dynamic = 'force-dynamic'

const bookingSchema = z.object({
  name: z.string().min(3).max(100),
  phone: z.string().min(7).max(30),
  email: z.string().email().max(200).optional().or(z.literal('')),
  location: z.string().min(2).max(200),
  eventDate: z.string().min(1),
  notes: z.string().max(2000).optional().or(z.literal('')),
  selectedPackage: z.string().max(200).optional().or(z.literal('')),
})

/**
 * POST /api/bookings/birthday — "Your Birthday" party-package booking
 * (no product attached). Mirrors the original repo's route.
 */
export async function POST(req: NextRequest) {
  try {
    // Public endpoint guards: 10 requests / minute / IP (in-memory sliding
    // window, independent per route) + pre-parse body-size cap.
    const limited = checkRateLimit(req, 'bookings/birthday', 10, 60 * 1000)
    if (limited) return limited
    const oversized = guardBodySize(req)
    if (oversized) return oversized

    const body = await req.json().catch(() => null)
    const parsed = bookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const { name, phone, email, location, eventDate, notes, selectedPackage } = parsed.data

    const date = new Date(eventDate)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'invalid_event_date' }, { status: 400 })
    }
    // No past events (mirrors the orders route's past-date guard). Date-only
    // strings anchor to UTC midnight, so a same-day booking always passes.
    const todayUtcMidnight = new Date(new Date().toISOString().slice(0, 10))
    if (date < todayUtcMidnight) {
      return NextResponse.json({ error: 'invalid_event_date' }, { status: 400 })
    }
    // Must be within the next 18 months
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 18)
    if (date > maxDate) {
      return NextResponse.json({ error: 'event_date_out_of_range' }, { status: 400 })
    }

    // Event day + 1 (typical single-day package)
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 1)

    const booking = await db.booking.create({
      data: {
        brand: 'YOUR_BIRTHDAY',
        startDate: date,
        endDate,
        status: 'PENDING',
        customerName: name,
        customerPhone: phone,
        customerEmail: email || 'no-email@example.com',
        quantity: 1,
        totalAmount: 0, // package pricing is quoted by the coordinator
        notes: [
          selectedPackage ? `الباقة: ${selectedPackage}` : null,
          `الموقع: ${location}`,
          notes || null,
        ]
          .filter(Boolean)
          .join(' — '),
      },
    })

    logSecurityEvent('birthday_booking_created', req, {
      phone,
      selectedPackage: selectedPackage || null,
    })

    return NextResponse.json({ ok: true, bookingId: booking.id })
  } catch (error) {
    console.error('[api/bookings/birthday] POST error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
