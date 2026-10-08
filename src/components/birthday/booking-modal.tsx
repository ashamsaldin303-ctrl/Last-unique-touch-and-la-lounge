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

import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogClose,
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
  X,
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

/** zod issue field → message key for inline per-field errors (pattern
 * ported from birthday-contact.tsx). */
const FIELD_ERROR_KEYS: Record<string, string> = {
  name: 'yourBirthday.booking.errors.nameMin',
  phone: 'yourBirthday.booking.errors.phoneMin',
  email: 'yourBirthday.booking.errors.emailInvalid',
  location: 'yourBirthday.booking.errors.locationMin',
  eventDate: 'yourBirthday.booking.errors.eventDateRequired',
}

/** Input ids in DOM order — used to focus the first invalid field. */
const FIELD_IDS: Record<string, string> = {
  name: 'birthday-booking-name',
  phone: 'birthday-booking-phone',
  email: 'birthday-booking-email',
  eventDate: 'birthday-booking-date',
  location: 'birthday-booking-location',
}

/** Local yyyy-mm-dd — date inputs are LOCAL; new Date().toISOString() is
 *  UTC, which let past dates through in UTC+3 (Kuwait 00:00–03:00) and
 *  blocked today in UTC− (same rationale as dateFromToday in
 *  birthday-products.tsx). */
function toLocalDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  /** Aborts an in-flight booking POST when the dialog closes/unmounts. */
  const abortRef = useRef<AbortController | null>(null)

  // Reset the form a moment after the dialog fully closes so the success
  // screen doesn't flash back to the empty form mid-exit-animation. Also
  // abort any POST still in flight so it can't flip state post-close.
  useEffect(() => {
    if (open) return
    abortRef.current?.abort()
    abortRef.current = null
    const timer = setTimeout(() => {
      setSuccess(false)
      setForm(EMPTY_FORM)
      setFieldErrors({})
    }, 300)
    return () => clearTimeout(timer)
  }, [open])

  // Unmount while open (route change) — abort the in-flight POST.
  useEffect(() => () => abortRef.current?.abort(), [])

  // Auto-close after success (mirrors the original 2.5s pattern).
  useEffect(() => {
    if (!open || !success) return
    const timer = setTimeout(() => onOpenChange(false), 3000)
    return () => clearTimeout(timer)
  }, [open, success, onOpenChange])

  const set = (key: keyof BookingForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear that field's inline error as soon as the user edits it.
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const parsed = bookingSchema.safeParse(form)
    if (!parsed.success) {
      // Per-field inline errors (birthday-contact pattern) + aria-invalid;
      // the shared toast stays as a secondary signal.
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '')
        if (field && !errors[field]) {
          errors[field] = t(FIELD_ERROR_KEYS[field] ?? 'yourBirthday.booking.errors.invalid_input')
        }
      }
      setFieldErrors(errors)
      toast({
        title: t('yourBirthday.booking.errors.invalid_input'),
        variant: 'destructive',
      })
      // Focus the first invalid input (DOM order) so keyboard/SR users
      // land directly on the field to fix.
      const firstInvalid = ['name', 'phone', 'email', 'eventDate', 'location'].find(
        (f) => !!errors[f]
      )
      if (firstInvalid) document.getElementById(FIELD_IDS[firstInvalid])?.focus()
      return
    }

    setSubmitting(true)
    const controller = new AbortController()
    abortRef.current = controller
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
        signal: controller.signal,
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
      // Aborted (dialog closed/unmounted mid-flight) — drop state updates.
      if (controller.signal.aborted) return
      toast({
        title: t('yourBirthday.booking.errors.network'),
        variant: 'destructive',
      })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setSubmitting(false)
    }
  }

  // Local calendar dates (see toLocalDateInput) + the server's 18-month
  // event_date_out_of_range cap mirrored client-side.
  const today = toLocalDateInput(new Date())
  const horizon = new Date()
  horizon.setMonth(horizon.getMonth() + 18)
  const maxDate = toLocalDateInput(horizon)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-y-auto max-h-[90dvh] border-primary/30 bg-card p-6 sm:p-8"
        showCloseButton={false}
        dir="auto"
      >
        {/* Localized close button — the shared DialogContent fallback label
            is hardcoded English (Arabic-first app); same position/styling as
            the default one it replaces. */}
        <DialogClose
          className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        >
          <X aria-hidden="true" />
          <span className="sr-only">{t('yourBirthday.booking.close')}</span>
        </DialogClose>
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
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'birthday-booking-name-error' : undefined}
                    className="ps-10 min-h-11 bg-background"
                  />
                </div>
                {fieldErrors.name && (
                  <p
                    id="birthday-booking-name-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-destructive"
                  >
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    {fieldErrors.name}
                  </p>
                )}
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
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={fieldErrors.phone ? 'birthday-booking-phone-error' : undefined}
                    className="ps-10 min-h-11 bg-background text-start"
                  />
                </div>
                {fieldErrors.phone && (
                  <p
                    id="birthday-booking-phone-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-destructive"
                  >
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    {fieldErrors.phone}
                  </p>
                )}
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
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'birthday-booking-email-error' : undefined}
                    className="ps-10 min-h-11 bg-background text-start"
                  />
                </div>
                {fieldErrors.email && (
                  <p
                    id="birthday-booking-email-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-destructive"
                  >
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    {fieldErrors.email}
                  </p>
                )}
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
                    max={maxDate}
                    value={form.eventDate}
                    onChange={(e) => set('eventDate')(e.target.value)}
                    aria-invalid={!!fieldErrors.eventDate}
                    aria-describedby={fieldErrors.eventDate ? 'birthday-booking-date-error' : undefined}
                    className="ps-10 min-h-11 bg-background"
                  />
                </div>
                {fieldErrors.eventDate && (
                  <p
                    id="birthday-booking-date-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-destructive"
                  >
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    {fieldErrors.eventDate}
                  </p>
                )}
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
                    aria-invalid={!!fieldErrors.location}
                    aria-describedby={fieldErrors.location ? 'birthday-booking-location-error' : undefined}
                    className="ps-10 min-h-11 bg-background"
                  />
                </div>
                {fieldErrors.location && (
                  <p
                    id="birthday-booking-location-error"
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-destructive"
                  >
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    {fieldErrors.location}
                  </p>
                )}
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
