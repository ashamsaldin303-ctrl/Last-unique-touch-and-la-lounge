'use client'

/**
 * Your Birthday — contact page (route /your-birthday/contact).
 *
 * Mirrors the original repo's contact-view.tsx layout (2/3 form + 1/3 info
 * cards) in the birthday palette — white cards, deep-purple ink, gold
 * medallions. Posts to /api/contact with brand: 'YOUR_BIRTHDAY' so the
 * message lands in the birthday tenant inbox. Validation uses
 * contact.form.errors.* keys; success state with sendAnother.
 *
 * UPGRADE LAYER (visible polish — zod + POST logic untouched): info cards
 * as TiltCards with glow borders + staggered reveals, pulsing gold
 * medallions, and a magnetic submit button (submits via requestSubmit so
 * the react onSubmit/zod pipeline stays intact).
 */

import { useRef, useState } from 'react'
import { z } from 'zod'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/shared/page-header'
import { Reveal } from '@/components/shared/reveal'
import { TiltCard, MagneticButton } from '@/components/shared/upgrade'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
} from 'lucide-react'

const contactSchema = z.object({
  name: z.string().min(3),
  email: z.string().email().max(200),
  phone: z.string().regex(/^\+?[0-9\s-]{8,20}$/).optional().or(z.literal('')),
  subject: z.string().min(5).max(200),
  message: z.string().min(20).max(5000),
})

type ContactFormValues = z.infer<typeof contactSchema>

const EMPTY: ContactFormValues = { name: '', email: '', phone: '', subject: '', message: '' }

/** zod issue path → message key for inline per-field errors. */
const FIELD_ERROR_KEYS: Record<string, string> = {
  name: 'contact.form.errors.nameMinLength',
  email: 'contact.form.errors.emailInvalid',
  phone: 'contact.form.errors.phoneInvalid',
  subject: 'contact.form.errors.subjectMinLength',
  message: 'contact.form.errors.messageMinLength',
}

export default function BirthdayContactPage() {
  const { t } = useI18n()
  const { toast } = useToast()

  const [form, setForm] = useState<ContactFormValues>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Upgrade: MagneticButton renders type="button", so it submits the form
  // programmatically — the onSubmit/zod/POST pipeline is untouched.
  const formRef = useRef<HTMLFormElement>(null)

  const set = (key: keyof ContactFormValues) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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

    const parsed = contactSchema.safeParse(form)
    if (!parsed.success) {
      const issues = parsed.error.issues
      const errors: Record<string, string> = {}
      for (const issue of issues) {
        const field = String(issue.path[0] ?? '')
        if (field && !errors[field]) {
          errors[field] = t(FIELD_ERROR_KEYS[field] ?? 'contact.form.errors.invalidInput')
        }
      }
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, brand: 'YOUR_BIRTHDAY' }),
      })
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string }

      if (!response.ok || !result.ok) {
        const code = result.error ?? 'internal_error'
        const message =
          code === 'invalid_input' || code === 'invalid_json'
            ? t('contact.form.errors.invalidInput')
            : code === 'rate_limited'
              ? t('contact.form.errors.rateLimited')
              : t('contact.form.errors.internalError')
        setSubmitError(message)
        toast({ title: message, variant: 'destructive' })
        return
      }

      setSubmitted(true)
      setForm(EMPTY)
      setFieldErrors({})
    } catch {
      const message = t('contact.form.errors.networkError')
      setSubmitError(message)
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const infoCards = [
    { icon: MapPin, label: t('contact.info.address'), value: t('contact.info.addressValue') },
    { icon: Phone, label: t('contact.info.phone'), value: t('contact.info.phoneValue'), ltr: true },
    { icon: Mail, label: t('contact.info.email'), value: t('contact.info.emailValue'), ltr: true },
    { icon: Clock, label: t('contact.info.hours'), value: t('contact.info.hoursValue') },
  ]

  return (
    <div className="page-enter relative flex-1 bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(75, 24, 88, 0.08), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <PageHeader
          eyebrow={t('yourBirthday.nav.brand')}
          title={t('contact.title')}
          subtitle={t('contact.subtitle')}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* ============ FORM ============ */}
          <Reveal className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-6 sm:p-8">
              {submitted ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
                    <CheckCircle2 className="size-10" />
                  </div>
                  <h2 className="font-display mb-4 text-2xl text-foreground">
                    {t('contact.form.success')}
                  </h2>
                  <Button
                    onClick={() => setSubmitted(false)}
                    variant="outline"
                    className="min-h-11 rounded-full border-primary/40 px-6 text-primary hover:text-primary"
                  >
                    {t('contact.form.sendAnother')}
                  </Button>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {submitError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-foreground"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* name + email */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="bd-contact-name">{t('contact.form.name')}</Label>
                      <Input
                        id="bd-contact-name"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => set('name')(e.target.value)}
                        aria-invalid={!!fieldErrors.name}
                        aria-describedby={fieldErrors.name ? 'bd-contact-name-error' : undefined}
                        className="min-h-11 bg-background"
                      />
                      {fieldErrors.name && (
                        <p
                          id="bd-contact-name-error"
                          role="alert"
                          className="flex items-center gap-1.5 text-xs text-primary"
                        >
                          <AlertCircle className="size-3.5 shrink-0" />
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bd-contact-email">{t('contact.form.email')}</Label>
                      <Input
                        id="bd-contact-email"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => set('email')(e.target.value)}
                        aria-invalid={!!fieldErrors.email}
                        aria-describedby={fieldErrors.email ? 'bd-contact-email-error' : undefined}
                        className="min-h-11 bg-background text-start"
                      />
                      {fieldErrors.email && (
                        <p
                          id="bd-contact-email-error"
                          role="alert"
                          className="flex items-center gap-1.5 text-xs text-primary"
                        >
                          <AlertCircle className="size-3.5 shrink-0" />
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* phone + subject */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="bd-contact-phone">{t('contact.form.phone')}</Label>
                      <Input
                        id="bd-contact-phone"
                        type="tel"
                        dir="ltr"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(e) => set('phone')(e.target.value)}
                        aria-invalid={!!fieldErrors.phone}
                        aria-describedby={fieldErrors.phone ? 'bd-contact-phone-error' : undefined}
                        className="min-h-11 bg-background text-start"
                      />
                      {fieldErrors.phone && (
                        <p
                          id="bd-contact-phone-error"
                          role="alert"
                          className="flex items-center gap-1.5 text-xs text-primary"
                        >
                          <AlertCircle className="size-3.5 shrink-0" />
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bd-contact-subject">{t('contact.form.subject')}</Label>
                      <Input
                        id="bd-contact-subject"
                        type="text"
                        value={form.subject}
                        onChange={(e) => set('subject')(e.target.value)}
                        aria-invalid={!!fieldErrors.subject}
                        aria-describedby={
                          fieldErrors.subject ? 'bd-contact-subject-error' : undefined
                        }
                        className="min-h-11 bg-background"
                      />
                      {fieldErrors.subject && (
                        <p
                          id="bd-contact-subject-error"
                          role="alert"
                          className="flex items-center gap-1.5 text-xs text-primary"
                        >
                          <AlertCircle className="size-3.5 shrink-0" />
                          {fieldErrors.subject}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* message */}
                  <div className="space-y-1.5">
                    <Label htmlFor="bd-contact-message">{t('contact.form.message')}</Label>
                    <Textarea
                      id="bd-contact-message"
                      rows={6}
                      value={form.message}
                      onChange={(e) => set('message')(e.target.value)}
                      aria-invalid={!!fieldErrors.message}
                      aria-describedby={fieldErrors.message ? 'bd-contact-message-error' : undefined}
                      className="bg-background"
                    />
                    {fieldErrors.message && (
                      <p
                        id="bd-contact-message-error"
                        role="alert"
                        className="flex items-center gap-1.5 text-xs text-primary"
                      >
                        <AlertCircle className="size-3.5 shrink-0" />
                        {fieldErrors.message}
                      </p>
                    )}
                  </div>

                  {/* Upgrade: magnetic gold submit — fires requestSubmit so
                      validation + POST flow through the form's onSubmit. */}
                  <MagneticButton
                    onClick={() => formRef.current?.requestSubmit()}
                    ariaLabel={t('contact.form.submit')}
                    className={`min-h-12 w-full text-base font-bold bg-primary text-primary-foreground ${
                      submitting ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="me-2 size-4 animate-spin" />
                        {t('contact.form.submitting')}
                      </>
                    ) : (
                      <>
                        <Send aria-hidden="true" className="me-2 size-4" />
                        {t('contact.form.submit')}
                      </>
                    )}
                  </MagneticButton>
                </form>
              )}
            </div>
          </Reveal>

          {/* ============ INFO CARDS (upgrade: TiltCards + glow + stagger) ============ */}
          <div className="space-y-4">
            {infoCards.map((card, i) => (
              <Reveal key={card.label} delay={i * 0.08}>
                <TiltCard className="rounded-2xl" max={5}>
                  <div className="lux-card glow-border card-lift flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
                    <span className="icon-ring flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-primary">
                      <card.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="eyebrow mb-1 text-muted-foreground">{card.label}</p>
                      <p
                        className="truncate text-sm font-semibold text-foreground"
                        dir={card.ltr ? 'ltr' : undefined}
                        style={card.ltr ? { textAlign: 'start' } : undefined}
                      >
                        {card.value}
                      </p>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}

            {/* festive note card */}
            <Reveal delay={0.35}>
              <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-secondary to-[#fdf0f5] p-6">
                <Sparkles
                  aria-hidden="true"
                  className="absolute -end-3 -top-3 size-16 rotate-12 text-primary/15"
                />
                <p className="relative font-display text-lg text-foreground">
                  {t('yourBirthday.cta.title')}
                </p>
                <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">
                  {t('yourBirthday.cta.subtitle')}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  )
}
