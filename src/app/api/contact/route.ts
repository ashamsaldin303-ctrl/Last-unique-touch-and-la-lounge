import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const contactSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional().or(z.literal('')),
  subject: z.string().min(5).max(200),
  message: z.string().min(20).max(5000),
  brand: z.enum(['LUT', 'LA_LOUNGE', 'YOUR_BIRTHDAY']).default('LUT'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = contactSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const { name, email, phone, subject, message, brand } = parsed.data

    await db.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
        brand,
      },
    })

    await db.securityLog.create({
      data: {
        event: 'contact_form_submitted',
        details: JSON.stringify({ brand, email }),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/contact] POST error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
