'use client'

/**
 * LUT — CONTACT (/last-unique-touch/contact)
 *
 * Reproduces the original contact-view: validated contact form
 * (name / email / optional phone / subject / message) posted to
 * /api/contact with brand 'LUT', plus the info cards (address / phone /
 * email / hours) and the WhatsApp + Instagram links.
 *
 * Improvements: PageHeader with a rising gold-particle field and arabesque
 * accents, gold icon medallions with staggered reveals, animated success
 * state (form swaps to a gold check medallion + "send another"), toast
 * feedback, RTL-aware layout, 44px touch targets everywhere.
 *
 * UPGRADE LAYER (visible polish — form logic, zod + API flow untouched):
 * glow-border cards · tilt info card with icon-ring medallions · magnetic
 * submit button (gold shine sweep) · staggered reveal on form fields.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/shared/page-header'
import { Reveal } from '@/components/shared/reveal'
import { TiltCard, MagneticButton } from '@/components/shared/upgrade'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Particles } from '@/components/shared/particles'

/* Same number as the floating WhatsApp button (component-level constant). */
const WHATSAPP_URL = 'https://wa.me/96550000000'
const INSTAGRAM_URL = 'https://instagram.com/last.unique.touch'


/* ================= LUT arabesque ornament ================= */

/** Repeating 8-pointed-star lattice — faint decorative layer. */
function ArabesquePattern({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="76" height="76" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="22" y="22" width="32" height="32" />
            <rect x="22" y="22" width="32" height="32" transform="rotate(45 38 38)" />
          </g>
          <circle cx="38" cy="38" r="2" fill="currentColor" />
          <circle cx="0" cy="0" r="1.5" fill="currentColor" />
          <circle cx="76" cy="76" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

type ContactFormData = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

export default function LutContactPage() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  /* Move focus to the success heading when the form swaps to the success
     panel — otherwise keyboard/SR users are stranded at <body>. */
  const successRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (submitted) successRef.current?.focus()
  }, [submitted])

  /* Validation rules mirror the original contact-view (and the server):
     name ≥ 3 ≤ 100, valid email ≤ 200, phone optional but valid when present,
     subject ≥ 5 ≤ 200, message ≥ 20 ≤ 5000. Messages come from t() so errors
     localize (incl. the max rules — no raw zod English defaults can leak). */
  const contactSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, t('contact.form.errors.nameRequired'))
          .min(3, t('contact.form.errors.nameMinLength'))
          .max(100, t('contact.form.errors.nameMaxLength')),
        email: z
          .string()
          .min(1, t('contact.form.errors.emailRequired'))
          .email(t('contact.form.errors.emailInvalid'))
          .max(200, t('contact.form.errors.emailMaxLength')),
        phone: z
          .string()
          // ASCII + Arabic-Indic digits (٠-٩) — parity with the /contact form,
          // so Kuwaiti users typing local numerals pass here too.
          .regex(/^\+?[0-9٠-٩\s-]{8,20}$/, t('contact.form.errors.phoneInvalid'))
          .or(z.literal('')),
        subject: z
          .string()
          .min(1, t('contact.form.errors.subjectRequired'))
          .min(5, t('contact.form.errors.subjectMinLength'))
          .max(200, t('contact.form.errors.subjectMaxLength')),
        message: z
          .string()
          .min(1, t('contact.form.errors.messageRequired'))
          .min(20, t('contact.form.errors.messageMinLength'))
          .max(5000, t('contact.form.errors.messageMaxLength')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  })

  const onSubmit = async (data: ContactFormData) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, brand: 'LUT' }),
        // 10s timeout: a hung connection must not lock the submit button.
        signal: AbortSignal.timeout(10_000),
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
        setSubmitError(messageMap[code] ?? t('contact.form.errors.internalError'))
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      setSubmitted(true)
      reset()
      toast({ title: t('contact.form.success') })
    } catch {
      setSubmitError(t('contact.form.errors.networkError'))
      setSubmitting(false)
    }
  }

  const contactInfo: Array<{
    icon: typeof MapPin
    label: string
    value: string
    ltr?: boolean
  }> = [
    { icon: MapPin, label: t('contact.info.address'), value: t('contact.info.addressValue') },
    { icon: Phone, label: t('contact.info.phone'), value: t('contact.info.phoneValue'), ltr: true },
    { icon: Mail, label: t('contact.info.email'), value: t('contact.info.emailValue'), ltr: true },
    { icon: Clock, label: t('contact.info.hours'), value: t('contact.info.hoursValue') },
  ]

  return (
    <div className="relative w-full">
      {/* ================= HEADER + gold particle field ================= */}
      <section className="relative overflow-hidden pt-24 sm:pt-28">
        <Particles />
        <ArabesquePattern
          id="lut-contact-arabesque"
          className="pointer-events-none absolute inset-0 h-full w-full text-primary opacity-[0.04]"
        />
        <div className="relative z-10">
          <PageHeader
            eyebrow={t('lut.eyebrow')}
            title={t('contact.title')}
            subtitle={t('contact.subtitle')}
          />
        </div>
      </section>

      {/* ================= FORM + INFO ================= */}
      <section className="relative px-4 pb-16 pt-4 sm:px-6 sm:pb-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-5">
          {/* ---- Form card (upgrade: glow border + staggered field reveals) ---- */}
          <Reveal className="lg:col-span-3">
            <div className="glow-border relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-24px_rgba(60,42,15,0.28)] sm:p-8">
              <AnimatePresence mode="wait">
                {submitted ? (
                  /* ---- Success state (replaces the form) ---- */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="py-10 text-center sm:py-14"
                  >
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 14 }}
                      className="animate-pulse-ring mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"
                    >
                      <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
                    </motion.div>
                    <h2
                      ref={successRef}
                      tabIndex={-1}
                      className="mb-6 rounded-md font-display text-2xl leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:text-3xl"
                    >
                      {t('contact.form.success')}
                    </h2>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                      className="min-h-11 rounded-full border-primary/40 px-8 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      {t('contact.form.sendAnother')}
                    </Button>
                  </motion.div>
                ) : (
                  /* ---- Contact form ---- */
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35 }}
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="space-y-5"
                  >
                    {submitError && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {/* Name + Email (upgrade: staggered reveal) */}
                    <Reveal delay={0.08}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">{t('contact.form.name')}</Label>
                        <Input
                          id="name"
                          autoComplete="name"
                          maxLength={100}
                          {...register('name')}
                          aria-invalid={!!errors.name}
                          aria-describedby={errors.name ? 'name-error' : undefined}
                          className="bg-background min-h-11"
                        />
                        {errors.name && (
                          <p
                            id="name-error"
                            role="alert"
                            className="flex items-center gap-1.5 text-xs text-destructive"
                          >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{errors.name.message}</span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">{t('contact.form.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          dir="ltr"
                          autoComplete="email"
                          maxLength={200}
                          {...register('email')}
                          aria-invalid={!!errors.email}
                          aria-describedby={errors.email ? 'email-error' : undefined}
                          className="bg-background min-h-11"
                        />
                        {errors.email && (
                          <p
                            id="email-error"
                            role="alert"
                            className="flex items-center gap-1.5 text-xs text-destructive"
                          >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{errors.email.message}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    </Reveal>

                    {/* Phone + Subject (upgrade: staggered reveal) */}
                    <Reveal delay={0.16}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">{t('contact.form.phone')}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          dir="ltr"
                          autoComplete="tel"
                          maxLength={20}
                          {...register('phone')}
                          aria-invalid={!!errors.phone}
                          aria-describedby={errors.phone ? 'phone-error' : undefined}
                          className="bg-background min-h-11"
                        />
                        {errors.phone && (
                          <p
                            id="phone-error"
                            role="alert"
                            className="flex items-center gap-1.5 text-xs text-destructive"
                          >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{errors.phone.message}</span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="subject">{t('contact.form.subject')}</Label>
                        <Input
                          id="subject"
                          maxLength={200}
                          {...register('subject')}
                          aria-invalid={!!errors.subject}
                          aria-describedby={errors.subject ? 'subject-error' : undefined}
                          className="bg-background min-h-11"
                        />
                        {errors.subject && (
                          <p
                            id="subject-error"
                            role="alert"
                            className="flex items-center gap-1.5 text-xs text-destructive"
                          >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{errors.subject.message}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    </Reveal>

                    {/* Message (upgrade: staggered reveal) */}
                    <Reveal delay={0.24}>
                      <div className="space-y-1.5">
                      <Label htmlFor="message">{t('contact.form.message')}</Label>
                      <Textarea
                        id="message"
                        rows={6}
                        maxLength={5000}
                        {...register('message')}
                        aria-invalid={!!errors.message}
                        aria-describedby={errors.message ? 'message-error' : undefined}
                        className="bg-background"
                      />
                      {errors.message && (
                        <p
                          id="message-error"
                          role="alert"
                          className="flex items-center gap-1.5 text-xs text-destructive"
                        >
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{errors.message.message}</span>
                        </p>
                      )}
                    </div>

                    </Reveal>

                    {/* Submit — magnetic button with gold shine (upgrade).
                        type="submit" keeps the native form flow (Enter key
                        works); disabled guards double submits. */}
                    <Reveal delay={0.32}>
                      <MagneticButton
                        type="submit"
                        disabled={submitting}
                        ariaLabel={t('contact.form.submit')}
                        className="h-12 w-full rounded-full text-base font-semibold bg-lut hover:bg-lut/90 text-primary-foreground"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            <span>{t('contact.form.submitting')}</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" aria-hidden="true" />
                            <span>{t('contact.form.submit')}</span>
                          </>
                        )}
                      </MagneticButton>
                    </Reveal>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>

          {/* ---- Info card (upgrade: tilt + glow border + icon rings) ---- */}
          <Reveal delay={0.15} className="lg:col-span-2">
            <TiltCard className="h-full rounded-2xl" max={5}>
              <div className="glow-border card-lift relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-24px_rgba(60,42,15,0.28)] sm:p-8">
              {/* corner arabesque accent */}
              <ArabesquePattern
                id="lut-contact-info-arabesque"
                className="pointer-events-none absolute -end-8 -top-8 h-40 w-40 text-primary opacity-[0.06]"
              />

              <div className="relative space-y-6">
                {contactInfo.map((info, i) => {
                  const Icon = info.icon
                  return (
                    <Reveal key={info.label} delay={0.08 * i}>
                      <motion.div
                        whileHover={{ x: locale === 'ar' ? -4 : 4 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="flex items-start gap-4"
                      >
                        <div className="icon-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary transition-transform duration-500 hover:scale-110">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="mb-0.5 text-xs text-muted-foreground">{info.label}</p>
                          <p
                            className="break-words text-sm font-medium text-foreground"
                            dir={info.ltr ? 'ltr' : undefined}
                          >
                            {info.value}
                          </p>
                        </div>
                      </motion.div>
                    </Reveal>
                  )
                })}

                {/* WhatsApp + Instagram */}
                <div className="relative border-t border-border pt-5">
                  <p className="eyebrow mb-4 text-[9px] text-muted-foreground">
                    {t('contact.info.whatsapp')} · {t('contact.info.instagram')}
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <motion.a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('contact.info.whatsapp')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-xl border border-border px-4',
                        'text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5'
                      )}
                    >
                      <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span>{t('contact.info.whatsapp')}</span>
                    </motion.a>
                    <motion.a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('contact.info.instagram')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-xl border border-border px-4',
                        'text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5'
                      )}
                    >
                      <Instagram className="h-5 w-5 text-primary" aria-hidden="true" />
                      <span>{t('contact.info.instagram')}</span>
                    </motion.a>
                  </div>
                </div>

                {/* Closing accent */}
                <div className="flex items-center justify-center gap-3 pt-2" aria-hidden="true">
                  <span className="h-px w-16 bg-gradient-to-r from-transparent to-primary/40" />
                  <CalendarClock className="h-4 w-4 text-primary/60" />
                  <span className="h-px w-16 bg-gradient-to-l from-transparent to-primary/40" />
                </div>
              </div>
            </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
