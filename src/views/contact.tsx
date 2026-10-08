'use client'

/**
 * CONTACT — /contact (hash route #/{locale}/contact)
 *
 * General LUT contact page: PageHeader → two-column layout (react-hook-form +
 * zod form | info panel with gold medallions, social links, decorative image)
 * → dark map-pin band with subtle gold particles.
 *
 * POSTs to /api/contact with brand 'LUT'. All copy via t() (RTL-aware).
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  Instagram,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { Reveal } from '@/components/shared/reveal'
import { PageHeader } from '@/components/shared/page-header'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Particles } from '@/components/shared/particles'


/* ============================================================
   Form schema — custom short messages ('required' | 'min' |
   'invalid') are mapped to contact.form.errors.* keys.
   ============================================================ */

const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'required')
    .min(3, 'min')
    .max(100, 'max'),
  email: z
    .string()
    .min(1, 'required')
    .email('invalid')
    .max(200, 'max'),
  phone: z
    .string()
    .refine(
      // ASCII + Arabic-Indic digits (٠-٩): Kuwaiti users type local numerals,
      // which are valid phone numbers (matches the client-side display).
      (v) => v.trim() === '' || /^\+?[0-9٠-٩\s-]{8,20}$/.test(v.trim()),
      'invalid'
    ),
  subject: z
    .string()
    .min(1, 'required')
    .min(5, 'min')
    .max(200, 'max'),
  message: z
    .string()
    .min(1, 'required')
    .min(20, 'min')
    .max(5000, 'max'), // aligned with server zod limit (5000) — matches contact.form.errors.messageMaxLength
})

type ContactFormValues = z.infer<typeof contactSchema>

/* WhatsApp target — kept in sync with the floating WhatsApp button. */
const WHATSAPP_NUMBER = '96550000000'
/** Display form (+965 5000 0000) derived from the single number constant. */
const WHATSAPP_DISPLAY = `+${WHATSAPP_NUMBER.slice(0, 3)} ${WHATSAPP_NUMBER.slice(3, 7)} ${WHATSAPP_NUMBER.slice(7)}`
const INSTAGRAM_URL = 'https://instagram.com/last.unique.touch'

/** Post-mount prefers-reduced-motion check (SSR-safe: first render is
 *  `false`, matching the server markup, then flips after hydration). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    // Post-mount external-state sync (same pattern as the i18n locale restore).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/* ============================================================
   Page
   ============================================================ */

export default function ContactPage() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  })

  const onSubmit = async (data: ContactFormValues) => {
    setSubmitError(null)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, brand: 'LUT' }),
      })
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
      }

      if (!response.ok || !result.ok) {
        const code = result.error ?? 'internal_error'
        const messageMap: Record<string, string> = {
          invalid_input: t('contact.form.errors.invalidInput'),
          invalid_json: t('contact.form.errors.invalidInput'),
          rate_limited: t('contact.form.errors.rateLimited'),
          internal_error: t('contact.form.errors.internalError'),
        }
        const message = messageMap[code] ?? messageMap.internal_error
        setSubmitError(message)
        return
      }

      setSubmitted(true)
      reset()
      toast({ title: t('contact.form.success') })
    } catch {
      setSubmitError(t('contact.form.errors.networkError'))
    }
  }

  /* ---- info panel data ---- */
  const contactInfo: Array<{
    icon: typeof MapPin
    label: string
    value: string
    dir?: 'ltr' | 'rtl'
  }> = [
    { icon: MapPin, label: t('contact.info.address'), value: t('contact.info.addressValue') },
    { icon: Phone, label: t('contact.info.phone'), value: t('contact.info.phoneValue'), dir: 'ltr' },
    { icon: Mail, label: t('contact.info.email'), value: t('contact.info.emailValue'), dir: 'ltr' },
    { icon: Clock, label: t('contact.info.hours'), value: t('contact.info.hoursValue') },
  ]

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    t('contact.info.addressValue')
  )}`

  return (
    <div className="bg-background">
      {/* ============ Page header ============ */}
      <PageHeader
        eyebrow={t('brand.lut')}
        title={t('contact.title')}
        subtitle={t('contact.subtitle')}
        className="pt-14 sm:pt-20"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* ============ Form (2 columns wide) ============ */}
          <div className="lg:col-span-2">
            {submitted ? (
              <Reveal>
                <div className="glass-card relative rounded-3xl p-8 sm:p-12 text-center shadow-xl overflow-hidden">
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                  />
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]">
                    <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-5 leading-relaxed">
                    {t('contact.form.success')}
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setSubmitted(false)}
                    className="h-11 px-6 rounded-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    {t('contact.form.sendAnother')}
                  </Button>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="glass-card relative rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden space-y-5"
                  aria-label={t('contact.title')}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                  />

                  {submitError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"
                    >
                      <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-sm font-medium">
                        {t('contact.form.name')}
                      </Label>
                      <Input
                        id="name"
                        autoComplete="name"
                        {...register('name')}
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                        className="h-11 bg-background"
                      />
                      {errors.name && (
                        <p id="name-error" role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {errors.name.message === 'min'
                              ? t('contact.form.errors.nameMinLength')
                              : errors.name.message === 'max'
                                ? t('contact.form.errors.nameMaxLength')
                                : t('contact.form.errors.nameRequired')}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-medium">
                        {t('contact.form.email')}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        {...register('email')}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        className="h-11 bg-background"
                      />
                      {errors.email && (
                        <p id="email-error" role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {errors.email.message === 'required'
                              ? t('contact.form.errors.emailRequired')
                              : errors.email.message === 'max'
                                ? t('contact.form.errors.emailMaxLength')
                                : t('contact.form.errors.emailInvalid')}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone + Subject */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm font-medium">
                        {t('contact.form.phone')}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        dir="ltr"
                        autoComplete="tel"
                        {...register('phone')}
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                        className="h-11 bg-background"
                      />
                      {errors.phone && (
                        <p id="phone-error" role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                          <span>{t('contact.form.errors.phoneInvalid')}</span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="subject" className="text-sm font-medium">
                        {t('contact.form.subject')}
                      </Label>
                      <Input
                        id="subject"
                        {...register('subject')}
                        aria-invalid={!!errors.subject}
                        aria-describedby={errors.subject ? 'subject-error' : undefined}
                        className="h-11 bg-background"
                      />
                      {errors.subject && (
                        <p id="subject-error" role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {errors.subject.message === 'min'
                              ? t('contact.form.errors.subjectMinLength')
                              : errors.subject.message === 'max'
                                ? t('contact.form.errors.subjectMaxLength')
                                : t('contact.form.errors.subjectRequired')}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-sm font-medium">
                      {t('contact.form.message')}
                    </Label>
                    <Textarea
                      id="message"
                      rows={6}
                      {...register('message')}
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                      className="bg-background min-h-[140px]"
                    />
                    {errors.message && (
                      <p id="message-error" role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {errors.message.message === 'min'
                            ? t('contact.form.errors.messageMinLength')
                            : errors.message.message === 'max'
                              ? t('contact.form.errors.messageMaxLength')
                              : t('contact.form.errors.messageRequired')}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-lux w-full h-12 text-base font-semibold rounded-xl disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 me-2 animate-spin" aria-hidden="true" />
                        {t('contact.form.submitting')}
                      </>
                    ) : (
                      t('contact.form.submit')
                    )}
                  </Button>
                </form>
              </Reveal>
            )}
          </div>

          {/* ============ Info panel ============ */}
          <div className="lg:col-span-1 space-y-4">
            {contactInfo.map((info, idx) => {
              const Icon = info.icon
              return (
                <Reveal key={info.label} delay={idx * 0.08}>
                  <div className="glass-card lux-card rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]">
                      <Icon className="size-5 text-gold" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">{info.label}</p>
                      <p className="text-sm font-medium text-foreground break-words" dir={info.dir}>
                        {info.value}
                      </p>
                    </div>
                  </div>
                </Reveal>
              )
            })}

            {/* Social links — anchored rows with labels so the brand-colored
                medallions read as deliberate contact channels, not floating
                buttons. */}
            <Reveal delay={0.35}>
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-px w-6 bg-primary/40" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground">
                    {t('contact.info.whatsapp')} · {t('contact.info.instagram')}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('contact.info.whatsapp')}
                    className="group flex items-center gap-3.5 rounded-xl border border-transparent p-2.5 transition-colors duration-300 hover:border-gold/25 hover:bg-gold/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className="flex w-11 h-11 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: '#25D366', boxShadow: '0 8px 20px -6px rgba(37, 211, 102, 0.45)' }}
                    >
                      <MessageCircle className="size-5" aria-hidden="true" />
                    </span>
                    <span className="flex flex-col items-start gap-0.5">
                      <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-gold">
                        WhatsApp
                      </span>
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        {WHATSAPP_DISPLAY}
                      </span>
                    </span>
                  </a>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('contact.info.instagram')}
                    className="group flex items-center gap-3.5 rounded-xl border border-transparent p-2.5 transition-colors duration-300 hover:border-gold/25 hover:bg-gold/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className="flex w-11 h-11 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background:
                          'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                        boxShadow: '0 8px 20px -6px rgba(220, 39, 67, 0.4)',
                      }}
                    >
                      <Instagram className="size-5" aria-hidden="true" />
                    </span>
                    <span className="flex flex-col items-start gap-0.5">
                      <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-gold">
                        Instagram
                      </span>
                      <span className="text-xs text-muted-foreground" dir="ltr">
                        @last.unique.touch
                      </span>
                    </span>
                  </a>
                </div>
              </div>
            </Reveal>

            {/* Decorative image — framed product photograph on an ivory plate
                (the chandelier asset ships with a white background, so we
                present it like a mounted catalog photo instead of cropping it) */}
            <Reveal delay={0.45}>
              <div className="lux-card relative rounded-2xl overflow-hidden border border-border group">
                <div className="relative aspect-[4/3] bg-[#F7F2E9]">
                  <Image
                    src="/products/crystal-chandelier.png"
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-contain p-5 sm:p-8 transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* ============ Map-pin band — gold particles ============ */}
      <section
        className="relative overflow-hidden bg-ink py-16 sm:py-20"
        aria-label={t('contact.info.address')}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_65%_70%_at_50%_120%,rgba(139,107,61,0.25),transparent_70%)]"
        />
        <Particles count={14} />

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <Reveal>
            <span
              className={`inline-flex w-14 h-14 rounded-full bg-primary/15 items-center justify-center${reducedMotion ? '' : ' animate-pulse-ring'}`}
            >
              <MapPin className="size-7 text-gold" aria-hidden="true" />
            </span>
            <p className="text-xs text-white/45 mt-6 mb-2">{t('contact.info.address')}</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-display text-2xl sm:text-3xl text-white/90 hover:text-gold transition-colors underline-offset-8 hover:underline"
            >
              {t('contact.info.addressValue')}
              <ExternalLink className="size-4 opacity-60" aria-hidden="true" />
            </a>
            <div className="gold-divider w-40 mx-auto mt-8" aria-hidden="true" />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
