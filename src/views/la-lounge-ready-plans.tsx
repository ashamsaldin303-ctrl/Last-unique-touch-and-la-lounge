'use client'

/**
 * LA LOUNGE — Ready-Made Plans Execution (route /la-lounge/ready-plans).
 *
 * Reproduces the original repo page (header / 4 plan cards / CTA) and
 * develops it: gradient visual headers with icon medallions and price
 * badges, "includes" checklists, price label rows, request buttons and a
 * magenta hover glow. Plan `includes` arrays resolve straight from the
 * message JSON (t() stringifies arrays, so we resolve the raw values).
 */

import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import {
  Gem,
  Sparkles,
  Landmark,
  Minimize2,
  Check,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'
import { useI18n, type Locale } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { Reveal } from '@/components/shared/reveal'
import { PageHeader } from '@/components/shared/page-header'
import { SectionHeading, TiltCard, MagneticButton } from '@/components/shared/upgrade'
import arMessages from '@/messages/ar.json'
import enMessages from '@/messages/en.json'

type PlanKey = 'classic' | 'modern' | 'cultural' | 'minimalist'

/** Resolve an array-typed message value (includes[4]) from the message JSONs. */
function resolveArray(locale: Locale, key: string): string[] {
  const root = (locale === 'ar' ? arMessages : enMessages) as unknown as Record<string, unknown>
  const value = key
    .split('.')
    .reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part]
      }
      return undefined
    }, root)
  return Array.isArray(value) ? (value as string[]) : []
}

const PLAN_VISUALS: Record<PlanKey, { icon: LucideIcon; gradient: string; accent: string }> = {
  classic: {
    icon: Gem,
    gradient: 'linear-gradient(135deg, #2a2418 0%, #4a3a1d 45%, #1a1610 100%)',
    accent: '#C9A24B',
  },
  modern: {
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #2a0a1d 0%, #5a0e3a 45%, #1c0410 100%)',
    accent: '#E6007E',
  },
  cultural: {
    icon: Landmark,
    gradient: 'linear-gradient(135deg, #2a1810 0%, #4a2a14 45%, #1c1008 100%)',
    accent: '#D49A4A',
  },
  minimalist: {
    icon: Minimize2,
    gradient: 'linear-gradient(135deg, #1f1f1f 0%, #2e2e2e 45%, #141414 100%)',
    accent: '#E8E8E8',
  },
}

const PLAN_KEYS: PlanKey[] = ['classic', 'modern', 'cultural', 'minimalist']

/**
 * Spaced-caps label that respects Arabic script (reference:
 * la-lounge-products.tsx). Latin gets letter-spacing + uppercase; Arabic
 * gets word-spacing instead — letter-spacing would tear the joined
 * letters apart.
 */
const labelTypo = (locale: Locale): CSSProperties =>
  locale === 'ar'
    ? { wordSpacing: '0.3em' }
    : { letterSpacing: '0.05em', textTransform: 'uppercase' }

export default function LaLoungeReadyPlansPage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <div className="flex-1 bg-background text-foreground">
      {/* ============ Header ============ */}
      <section className="relative overflow-hidden pt-28 sm:pt-32 pb-4 px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgba(230,0,126,0.18) 0%, transparent 70%)' }}
        />
        <PageHeader
          eyebrow={t('laLoungeReadyPlans.eyebrow')}
          title={t('laLoungeReadyPlans.title')}
          subtitle={t('laLoungeReadyPlans.subtitle')}
        />
      </section>

      {/* ============ Plan cards ============ */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="✦"
            title={t('laLoungeReadyPlans.plansTitle')}
            subtitle={t('laLoungeReadyPlans.plansSubtitle')}
            className="mb-12 sm:mb-16"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLAN_KEYS.map((key, i) => {
              const visual = PLAN_VISUALS[key]
              const Icon = visual.icon
              const includes = resolveArray(locale, `laLoungeReadyPlans.plans.${key}.includes`)
              const name = t(`laLoungeReadyPlans.plans.${key}.name`)
              const desc = t(`laLoungeReadyPlans.plans.${key}.desc`)
              const price = t(`laLoungeReadyPlans.plans.${key}.price`)

              return (
                <Reveal key={key} delay={(i % 2) * 0.12} className="h-full">
                  <TiltCard className="h-full rounded-2xl" max={6}>
                    <article
                      className="glow-border glass-card lux-card group h-full rounded-2xl overflow-hidden flex flex-col hover:shadow-[0_12px_40px_-8px_rgba(230,0,126,0.35)]"
                    >
                      {/* Visual header — gradient + icon monogram + price badge */}
                      <div className="relative flex h-36 sm:h-40 items-center justify-center overflow-hidden" style={{ background: visual.gradient }}>
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 opacity-25"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(-25deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 26px)',
                          }}
                        />
                        {/* Plan watermark monogram */}
                        <Icon
                          className="pointer-events-none absolute -bottom-8 -end-6 size-36 opacity-[0.08] transition-transform duration-700 group-hover:rotate-[8deg] group-hover:scale-110"
                          style={{ color: visual.accent }}
                          aria-hidden="true"
                        />
                        <motion.div
                          initial={{ scale: 0.85, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.15 + (i % 2) * 0.12, type: 'spring', stiffness: 200, damping: 16 }}
                          whileHover={{ scale: 1.08, rotate: -5 }}
                          className="relative flex size-16 items-center justify-center rounded-full border-2"
                          style={{ borderColor: visual.accent, background: 'rgba(0,0,0,0.3)' }}
                        >
                          <Icon className="size-7" style={{ color: visual.accent }} aria-hidden="true" />
                        </motion.div>

                        {/* Price badge — top-end */}
                        <span
                          className="absolute top-3 end-3 inline-flex items-center rounded-full border px-3 py-1.5 text-[0.65rem] font-semibold backdrop-blur-sm"
                          style={{
                            borderColor: `${visual.accent}66`,
                            background: `${visual.accent}1a`,
                            color: visual.accent,
                          }}
                        >
                          {price}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="p-6 flex flex-col gap-4 flex-1">
                        <div>
                          <h3 className="font-display text-2xl text-primary mb-2">{name}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                        </div>

                        {/* Includes checklist */}
                        <div className="flex-1">
                          <p
                            style={labelTypo(locale)}
                            className="text-[0.7rem] text-muted-foreground/80 mb-2.5"
                          >
                            {t('laLoungeReadyPlans.includedLabel')}
                          </p>
                          <ul className="space-y-2">
                            {includes.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/85">
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 border border-primary/30">
                                  <Check className="size-3 text-primary" aria-hidden="true" />
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Price label + request CTA */}
                        <div className="pt-4 mt-1 border-t border-primary/10">
                          <div className="flex items-end justify-between mb-4">
                            <span
                              style={labelTypo(locale)}
                              className="text-[0.7rem] text-muted-foreground/80"
                            >
                              {t('laLoungeReadyPlans.priceLabel')}
                            </span>
                            <span className="font-display text-base font-semibold" style={{ color: visual.accent }}>
                              {price}
                            </span>
                          </div>
                          <MagneticButton
                            onClick={() => navigate('/la-lounge/contact')}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full min-h-11 px-5 text-xs"
                            ariaLabel={t('laLoungeReadyPlans.requestButton')}
                          >
                            {t('laLoungeReadyPlans.requestButton')}
                            <ArrowIcon className="size-3.5" aria-hidden="true" />
                          </MagneticButton>
                        </div>
                      </div>
                    </article>
                  </TiltCard>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ CTA — bring your own plan ============ */}
      <section className="pt-8 sm:pt-10 pb-16 sm:pb-20 px-4 border-t border-primary/10">
        <Reveal className="max-w-3xl mx-auto text-center">
          <div className="gold-divider w-40 mx-auto mb-6" aria-hidden="true" />
          <MagneticButton
            onClick={() => navigate('/la-lounge/contact')}
            className={`bg-primary text-primary-foreground hover:bg-primary/90 min-h-12 shadow-[0_12px_40px_-8px_rgba(230,0,126,0.35)]${
              locale === 'en' ? ' tracking-wide' : ''
            }`}
            ariaLabel={t('laLoungeReadyPlans.ctaButton')}
          >
            {t('laLoungeReadyPlans.ctaButton')}
            <ArrowIcon className="size-4" aria-hidden="true" />
          </MagneticButton>
        </Reveal>
      </section>
    </div>
  )
}
