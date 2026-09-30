'use client'

/**
 * BookingModal — "Your Birthday" party-package booking dialog.
 *
 * Ported from the original repo's your-birthday-view.tsx booking modal
 * (focus trap + Escape close + success auto-close), rebuilt on top of the
 * shadcn/Radix Dialog which provides the focus trap, Escape handling and
 * focus restoration natively. Field validation mirrors the server-side
 * zod schema in /api/bookings/birthday (name≥3, phone≥7, location≥2,
 * eventDate required). All copy comes from yourBirthday.booking.* keys.
 */

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
  User,
} from 'lucide-react'

interface BookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Package label shown under the modal title (from the trigger context). */
  selectedPackage?: string | null
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  location: '',
  eventDate: '',
  notes: '',
}

const bookingSchema = z.object({
  name: z.string().min(3, 'name'),
  phone: z.string().min(7, 'phone'),
  email: z.string().email().optional().or(z.literal('')),
  location: z.string().min(2, 'location'),
  eventDate: z.string().min(1, 'eventDate'),
  notes: z.string().optional(),
})

type BookingForm = typeof EMPTY_FORM

/** Map an API error code to a message key under yourBirthday.booking.errors.* */
const KNOWN_ERROR_CODES = [
  'invalid_input',
  'invalid_json',
  'invalid_event_date',
  'event_date_out_of_range',
  'rate_limited',
  'duplicate_request',
  'internal_error',
] as const

export function BookingModal({ open, onOpenChange, selectedPackage = null }: BookingModalProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Reset the form a moment after the dialog fully closes so the success
  // screen doesn't flash back to the empty form mid-exit-animation.
  useEffect(() => {
    if (open) return
    const timer = setTimeout(() => {
      setSuccess(false)
      setForm(EMPTY_FORM)
    }, 300)
    return () => clearTimeout(timer)
  }, [open])

  // Auto-close after success (mirrors the original 2.5s pattern).
  useEffect(() => {
    if (!open || !success) return
    const timer = setTimeout(() => onOpenChange(false), 3000)
    return () => clearTimeout(timer)
  }, [open, success, onOpenChange])

  const set = (key: keyof BookingForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const parsed = bookingSchema.safeParse(form)
    if (!parsed.success) {
      // No per-field message keys exist for booking — surface the shared
      // invalid-input message as a toast (server parity).
      toast({
        title: t('yourBirthday.booking.errors.invalid_input'),
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/bookings/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          location: form.location,
          eventDate: form.eventDate,
          notes: form.notes || undefined,
          selectedPackage: selectedPackage ?? undefined,
        }),
      })

      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        bookingId?: string
        error?: string
      }

      if (!response.ok || !result.ok) {
        const code = result.error ?? 'internal_error'
        const key = (KNOWN_ERROR_CODES as readonly string[]).includes(code) ? code : 'internal_error'
        toast({
          title: t(`yourBirthday.booking.errors.${key}`),
          variant: 'destructive',
        })
        return
      }

      setSuccess(true)
    } catch {
      toast({
        title: t('yourBirthday.booking.errors.network'),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-y-auto max-h-[90dvh] border-primary/30 bg-card p-6 sm:p-8"
        dir="auto"
      >
        {/* Decorative corner glows — gold, on-brand */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -start-16 size-36 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -end-16 size-36 rounded-full bg-[#f5c6d9]/40 blur-3xl"
        />

        {success ? (
          <div className="relative space-y-4 py-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary">
              <CheckCircle2 className="size-10 animate-pulse" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="font-display text-2xl text-foreground">
                {t('yourBirthday.booking.success.title')}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {t('yourBirthday.booking.success.body')}
              </DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative space-y-5" noValidate>
            <DialogHeader className="space-y-1 text-start">
              <DialogTitle className="flex items-center gap-3 text-start leading-snug">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/40 text-primary">
                  <PartyPopper className="size-5" />
                </span>
                <span className="font-display text-xl text-foreground">
                  {t('yourBirthday.booking.modalTitle')}
                </span>
              </DialogTitle>
              {selectedPackage ? (
                <DialogDescription className="text-xs text-muted-foreground">
                  {t('yourBirthday.booking.selectedPackageLabel')} {selectedPackage}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">
                  {t('yourBirthday.booking.modalTitle')}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="birthday-booking-name" className="text-foreground">
                  {t('yourBirthday.booking.form.name')}
                </Label>
                <div className="relative">
                  <User
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground"
                  />
                  <Input
                    id="birthday-booking-name"
                    type="text"
                    required
                    minLength={3}
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => set('name')(e.target.value)}
                    className="ps-10 min-h-11 bg-background"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="birthday-booking-phone" className="text-foreground">
                  {t('yourBirthday.booking.form.phone')}
                </Label>
                <div className="relative">
                  <Phone
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground"
                  />
                  <Input
                    id="birthday-booking-phone"
                    type="tel"
                    required
                    minLength={7}
                    autoComplete="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => set('phone')(e.target.value)}
                    className="ps-10 min-h-11 bg-background text-start"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="birthday-booking-email" className="text-foreground">
                  {t('yourBirthday.booking.form.email')}
                </Label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground"
                  />
                  <Input
                    id="birthday-booking-email"
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => set('email')(e.target.value)}
                    className="ps-10 min-h-11 bg-background text-start"
                  />
                </div>
              </div>

              {/* Event date */}
              <div className="space-y-1.5">
                <Label htmlFor="birthday-booking-date" className="text-foreground">
                  {t('yourBirthday.booking.form.eventDate')}
                </Label>
                <div className="relative">
                  <CalendarDays
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground"
                  />
                  <Input
                    id="birthday-booking-date"
                    type="date"
                    required
                    min={today}
                    value={form.eventDate}
                    onChange={(e) => set('eventDate')(e.target.value)}
                    className="ps-10 min-h-11 bg-background"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label htmlFor="birthday-booking-location" className="text-foreground">
                  {t('yourBirthday.booking.form.location')}
                </Label>
                <div className="relative">
                  <MapPin
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground"
                  />
                  <Input
                    id="birthday-booking-location"
                    type="text"
                    required
                    minLength={2}
                    value={form.location}
                    onChange={(e) => set('location')(e.target.value)}
                    className="ps-10 min-h-11 bg-background"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="birthday-booking-notes" className="text-foreground">
                  {t('yourBirthday.booking.form.notes')}
                </Label>
                <Textarea
                  id="birthday-booking-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes')(e.target.value)}
                  className="bg-background min-h-11"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="btn-lux w-full min-h-11 text-base font-bold rounded-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" />
                  {t('yourBirthday.booking.submitting')}
                </>
              ) : (
                t('yourBirthday.booking.submit')
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-[0.7rem] text-muted-foreground">
              <AlertCircle aria-hidden="true" className="size-3" />
              {t('yourBirthday.booking.form.phone')} · {t('yourBirthday.booking.form.location')}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
