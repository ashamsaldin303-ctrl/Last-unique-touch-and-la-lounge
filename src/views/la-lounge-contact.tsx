'use client'

/**
 * LA LOUNGE — Contact (route /la-lounge/contact).
 *
 * Mirrors the original repo's contact-view.tsx layout (header + 2/1 split of
 * form and info cards) restyled for the La Lounge dark charcoal + magenta
 * theme. Submits to POST /api/contact with brand 'LA_LOUNGE' and maps the
 * API error codes to contact.form.errors.* messages. Phone row renders only
 * when the message value is a real number (no "XXX" placeholder — same rule
 * as the original contact-info helper).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
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
  type LucideIcon,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { Reveal } from '@/components/shared/reveal'
import { TiltCard, MagneticButton } from '@/components/shared/upgrade'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type ContactFormData = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

/** Same WhatsApp destination as the site's floating button. */
const WHATSAPP_URL = 'https://wa.me/96550000000'
const INSTAGRAM_URL = 'https://instagram.com/last.unique.touch'

export default function LaLoungeContactPage() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  /* Localized zod schema (same pattern as lut-contact.tsx): per-rule t()
  messages for every check incl. the max rules — replaces the raw-English
  module-level schema and the getValues()-during-render workaround. Limits
  mirror the server (/api/contact): name ≤ 100, email ≤ 200, subject ≤ 200,
  message ≤ 5000. */
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

  /* Move focus to the success heading when the form swaps to the success
     panel — otherwise keyboard/SR users are stranded at <body>. */
  const successRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (submitted) successRef.current?.focus()
  }, [submitted])

  const onSubmit = async (data: ContactFormData) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, brand: 'LA_LOUNGE' }),
        // 10s timeout: a hung connection must not lock the submit button.
        signal: AbortSignal.timeout(10_000),
      })
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string }

      if (!response.ok || !result.ok) {
        const code = result?.error ?? 'internal_error'
        const messageMap: Record<string, string> = {
          invalid_input: t('contact.form.errors.invalidInput'),
          invalid_json: t('contact.form.errors.invalidInput'),
          rate_limited: t('contact.form.errors.rateLimited'),
          internal_error: t('contact.form.errors.internalError'),
        }
        setSubmitError(messageMap[code] ?? messageMap.internal_error)
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

  // Phone row only when the message value is a real number (no XXX placeholder).
  const rawPhone = t('contact.info.phoneValue')
  const phoneIsReal = Boolean(rawPhone) && !rawPhone.includes('XXX') && rawPhone.trim().length > 0

  const contactInfo: Array<{ icon: LucideIcon; label: string; value: string; dir?: 'ltr' | 'rtl' }> = [
    { icon: MapPin, label: t('contact.info.address'), value: t('contact.info.addressValue') },
    ...(phoneIsReal
      ? [{ icon: Phone as LucideIcon, label: t('contact.info.phone'), value: rawPhone, dir: 'ltr' as const }]
      : []),
    { icon: Mail, label: t('contact.info.email'), value: t('contact.info.emailValue'), dir: 'ltr' as const },
    { icon: Clock, label: t('contact.info.hours'), value: t('contact.info.hoursValue') },
  ]

  const inputClass =
    'h-11 bg-[#1d0f17] border-primary/45 text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/80 focus-visible:ring-primary/30'

  return (
    <div className="flex-1 bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgba(230,0,126,0.18) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-12">
          {/* ============ Header ============ */}
          <Reveal className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-primary/50" aria-hidden="true" />
              <span className="eyebrow text-primary">{t('brandSelector.lalounge.name')}</span>
              <span className="h-px w-8 bg-primary/50" aria-hidden="true" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t('contact.title')}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {t('contact.subtitle')}
            </p>
            <div className="gold-divider w-40 mt-8" aria-hidden="true" />
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ============ Form ============ */}
            <Reveal className="lg:col-span-2">
              {submitted ? (
                <div className="glass-card rounded-2xl p-8 text-center shadow-[0_12px_40px_-8px_rgba(230,0,126,0.25)]">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 15 }}
                    className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/15 border border-primary/40 shadow-[0_10px_30px_-10px_rgba(230,0,126,0.6)]"
                  >
                    <CheckCircle2 className="size-9 text-primary" aria-hidden="true" />
                  </motion.div>
                  <h2
                    ref={successRef}
                    tabIndex={-1}
                    className="mb-3 rounded-md font-display text-2xl font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {t('contact.form.success')}
                  </h2>
                  <MagneticButton
                    onClick={() => setSubmitted(false)}
                    className="min-h-11 px-6 border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                    ariaLabel={t('contact.form.sendAnother')}
                  >
                    {t('contact.form.sendAnother')}
                  </MagneticButton>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="glass-card rounded-2xl p-6 sm:p-8 space-y-5 shadow-[0_12px_40px_-8px_rgba(230,0,126,0.2)]" noValidate>
                  {submitError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">{t('contact.form.name')}</Label>
                      <Input
                        id="name"
                        autoComplete="name"
                        maxLength={100}
                        {...register('name')}
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                        className={inputClass}
                      />
                      {errors.name && (
                        <p id="name-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1" role="alert">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
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
                        className={inputClass}
                      />
                      {errors.email && (
                        <p id="email-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1" role="alert">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{errors.email.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone + Subject */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className={inputClass}
                      />
                      {errors.phone && (
                        <p id="phone-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1" role="alert">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
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
                        className={inputClass}
                      />
                      {errors.subject && (
                        <p id="subject-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1" role="alert">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{errors.subject.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <Label htmlFor="message">{t('contact.form.message')}</Label>
                    <Textarea
                      id="message"
                      rows={6}
                      maxLength={5000}
                      {...register('message')}
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                      className="bg-[#160a11] border-primary/25 text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:ring-primary/40 min-h-28"
                    />
                    {errors.message && (
                      <p id="message-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1" role="alert">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{errors.message.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Submit — magnetic button (type submit keeps the RHF
                      form flow: onClick is absent so the native form
                      submission drives handleSubmit(onSubmit)). */}
                  <MagneticButton
                    type="submit"
                    disabled={submitting}
                    className="w-full min-h-12 py-3 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_12px_40px_-8px_rgba(230,0,126,0.35)]"
                    ariaLabel={t('contact.form.submit')}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        {t('contact.form.submitting')}
                      </>
                    ) : (
                      t('contact.form.submit')
                    )}
                  </MagneticButton>
                </form>
              )}
            </Reveal>

            {/* ============ Info cards ============ */}
            <Reveal delay={0.15} className="lg:col-span-1">
              <TiltCard className="h-full rounded-2xl" max={5}>
                <div className="glow-border glass-card rounded-2xl p-6 h-full space-y-6 shadow-[0_12px_40px_-8px_rgba(230,0,126,0.2)]">
                  {contactInfo.map((info, idx) => {
                    const Icon = info.icon
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: locale === 'ar' ? -12 : 12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                        whileHover={{ x: locale === 'ar' ? -4 : 4 }}
                        className="flex items-start gap-3.5"
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/12 shadow-[0_8px_24px_-10px_rgba(230,0,126,0.55)]">
                          <Icon className="size-5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">{info.label}</p>
                          <p className="text-sm font-medium text-foreground break-words" dir={info.dir}>
                            {info.value}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}

                  {/* Social */}
                  <div className="pt-4 border-t border-primary/10">
                    <p className="text-xs text-muted-foreground mb-3">
                      {`${t('contact.info.whatsapp')} / ${t('contact.info.instagram')}`}
                    </p>
                    <div className="flex items-center gap-3">
                      <motion.a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -3, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex size-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary no-underline"
                        aria-label={t('contact.info.whatsapp')}
                      >
                        <MessageCircle className="size-5" aria-hidden="true" />
                      </motion.a>
                      <motion.a
                        href={INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ y: -3, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex size-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary no-underline"
                        aria-label={t('contact.info.instagram')}
                      >
                        <Instagram className="size-5" aria-hidden="true" />
                      </motion.a>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  )
}
