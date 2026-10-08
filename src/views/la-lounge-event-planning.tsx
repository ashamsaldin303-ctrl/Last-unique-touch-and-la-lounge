'use client'

/**
 * LA LOUNGE — Complete Event Planning & Execution (route /la-lounge/event-planning).
 *
 * Reproduces the original repo page (header / 5-stage process / 3 scenario
 * cards / 2 before→after pairs / CTA) and develops it: animated timeline,
 * scenario cards with magenta gradient headers + watermarks, and a
 * before/after showcase where a muted "before" card transforms into a
 * magenta-glowing "after" card across an animated arrow.
 */

import { motion, useReducedMotion } from 'framer-motion'
import {
  MessageSquare,
  Lightbulb,
  ListChecks,
  PlayCircle,
  ClipboardCheck,
  Building2,
  Heart,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { Reveal } from '@/components/shared/reveal'
import { PageHeader } from '@/components/shared/page-header'
import { SectionHeading, TiltCard, MagneticButton } from '@/components/shared/upgrade'

export default function LaLoungeEventPlanningPage() {
  const { t, locale, dir } = useI18n()
  const { navigate } = useRouter()
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight
  // Gate infinite decorative motion on the user's OS preference.
  const reducedMotion = useReducedMotion()

  const steps: Array<{ icon: LucideIcon; title: string; desc: string }> = [
    { icon: MessageSquare, title: t('laLoungeEventPlanning.steps.s1.title'), desc: t('laLoungeEventPlanning.steps.s1.desc') },
    { icon: Lightbulb, title: t('laLoungeEventPlanning.steps.s2.title'), desc: t('laLoungeEventPlanning.steps.s2.desc') },
    { icon: ListChecks, title: t('laLoungeEventPlanning.steps.s3.title'), desc: t('laLoungeEventPlanning.steps.s3.desc') },
    { icon: PlayCircle, title: t('laLoungeEventPlanning.steps.s4.title'), desc: t('laLoungeEventPlanning.steps.s4.desc') },
    { icon: ClipboardCheck, title: t('laLoungeEventPlanning.steps.s5.title'), desc: t('laLoungeEventPlanning.steps.s5.desc') },
  ]

  const scenarios: Array<{ icon: LucideIcon; name: string; desc: string }> = [
    { icon: Building2, name: t('laLoungeEventPlanning.scenarios.items.i1.name'), desc: t('laLoungeEventPlanning.scenarios.items.i1.desc') },
    { icon: Heart, name: t('laLoungeEventPlanning.scenarios.items.i2.name'), desc: t('laLoungeEventPlanning.scenarios.items.i2.desc') },
    { icon: Sparkles, name: t('laLoungeEventPlanning.scenarios.items.i3.name'), desc: t('laLoungeEventPlanning.scenarios.items.i3.desc') },
  ]

  // i1/i2 and i3/i4 form before→after pairs.
  const beforeAfter = [
    {
      beforeName: t('laLoungeEventPlanning.beforeAfter.items.i1.name'),
      beforeDesc: t('laLoungeEventPlanning.beforeAfter.items.i1.desc'),
      afterName: t('laLoungeEventPlanning.beforeAfter.items.i2.name'),
      afterDesc: t('laLoungeEventPlanning.beforeAfter.items.i2.desc'),
    },
    {
      beforeName: t('laLoungeEventPlanning.beforeAfter.items.i3.name'),
      beforeDesc: t('laLoungeEventPlanning.beforeAfter.items.i3.desc'),
      afterName: t('laLoungeEventPlanning.beforeAfter.items.i4.name'),
      afterDesc: t('laLoungeEventPlanning.beforeAfter.items.i4.desc'),
    },
  ]

  const originStart = dir === 'rtl' ? 'right center' : 'left center'
  const arrowDrift = dir === 'rtl' ? -10 : 10

  return (
    <div className="flex-1 bg-background text-foreground">
      {/* ============ Header ============ */}
      <section className="relative overflow-hidden pt-28 sm:pt-32 pb-4 px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: 'radial-gradient(60% 50% at 50% 0%, rgba(230,0,126,0.18) 0%, transparent 70%)',
          }}
        />
        <PageHeader
          eyebrow={t('laLoungeEventPlanning.eyebrow')}
          title={t('laLoungeEventPlanning.title')}
          subtitle={t('laLoungeEventPlanning.subtitle')}
        />
      </section>

      {/* ============ Process — 5-stage timeline ============ */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="✦"
            title={t('laLoungeEventPlanning.process.title')}
            subtitle={t('laLoungeEventPlanning.process.subtitle')}
            className="mb-12 sm:mb-16"
          />

          <div className="relative">
            {/* Connecting lines — animated scale on reveal */}
            <motion.div
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              style={{ transformOrigin: originStart }}
              className="hidden lg:block absolute top-7 inset-x-[9%] h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            />
            <motion.div
              aria-hidden="true"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              style={{ transformOrigin: 'top center' }}
              className="lg:hidden absolute top-4 bottom-4 start-[27px] w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent"
            />

            <ol className="grid gap-10 lg:grid-cols-5 lg:gap-5">
              {steps.map((step, i) => {
                const Icon = step.icon
                return (
                  <Reveal key={i} as="li" delay={i * 0.1} className="flex lg:flex-col items-start lg:items-center gap-5 lg:gap-0">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 220, damping: 15 }}
                      whileHover={{ scale: 1.1 }}
                      className="relative z-10 shrink-0 flex size-14 items-center justify-center rounded-full border border-primary/50 bg-[#1c0c16] shadow-[0_0_24px_-4px_rgba(230,0,126,0.55)]"
                    >
                      <span className="font-display text-lg font-semibold text-primary">{i + 1}</span>
                      <span
                        aria-hidden="true"
                        className={`absolute inset-0 rounded-full border border-primary/20${reducedMotion ? '' : ' animate-pulse-ring'}`}
                      />
                    </motion.div>

                    <article className="glass-card lux-card flex-1 lg:mt-6 rounded-2xl p-5 lg:p-6 flex flex-col lg:items-center lg:text-center h-full">
                      <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                        <Icon className="size-5 text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="font-display text-base lg:text-lg text-foreground mb-2">{step.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                    </article>
                  </Reveal>
                )
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ============ Scenarios — magenta gradient headers ============ */}
      <section className="py-16 sm:py-20 px-4 border-t border-primary/10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="✦"
            title={t('laLoungeEventPlanning.scenarios.title')}
            subtitle={t('laLoungeEventPlanning.scenarios.subtitle')}
            className="mb-12 sm:mb-16"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scenarios.map((scenario, i) => {
              const Icon = scenario.icon
              return (
                <Reveal key={i} delay={i * 0.12} className="h-full">
                  <TiltCard className="h-full rounded-2xl" max={6}>
                    <article className="glow-border glass-card lux-card group h-full rounded-2xl overflow-hidden flex flex-col">
                      {/* Gradient header */}
                      <div className="relative flex h-28 items-center overflow-hidden bg-gradient-to-br from-primary/40 via-primary/15 to-transparent px-6">
                        <Icon
                          className="pointer-events-none absolute -bottom-7 -end-5 size-32 text-primary opacity-[0.10] rotate-[-10deg] transition-transform duration-700 group-hover:rotate-[6deg] group-hover:scale-110"
                          aria-hidden="true"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 opacity-25"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(-25deg, rgba(230,0,126,0.5) 0, rgba(230,0,126,0.5) 1px, transparent 1px, transparent 24px)',
                          }}
                        />
                        <div className="relative flex items-center gap-4">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 220, damping: 16 }}
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_rgba(230,0,126,0.65)]"
                          >
                            <Icon className="size-5" aria-hidden="true" />
                          </motion.div>
                          <h3 className="font-display text-lg sm:text-xl text-foreground">{scenario.name}</h3>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-6 flex-1">
                        <p className="text-sm text-muted-foreground leading-relaxed">{scenario.desc}</p>
                      </div>
                    </article>
                  </TiltCard>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ Before / After transformation ============ */}
      <section className="py-16 sm:py-20 px-4 border-t border-primary/10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="✦"
            title={t('laLoungeEventPlanning.beforeAfter.title')}
            subtitle={t('laLoungeEventPlanning.beforeAfter.subtitle')}
            className="mb-12 sm:mb-16"
          />

          <div className="space-y-10">
            {beforeAfter.map((pair, i) => (
              <Reveal key={i} delay={0.1}>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch gap-4 md:gap-5">
                  {/* BEFORE — muted, desaturated */}
                  <article className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 sm:p-7 min-h-[200px] flex flex-col grayscale-[45%] opacity-75">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(135deg, #26222b 0%, #353138 45%, #1a181c 100%)' }}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 22px)',
                      }}
                    />
                    <div className="relative flex flex-col h-full">
                      <span
                        className={`inline-flex w-fit items-center rounded-full border border-foreground/20 bg-foreground/5 px-3 py-1 text-[0.65rem] font-medium text-foreground/60 mb-4${
                          locale === 'en' ? ' uppercase tracking-wider' : ''
                        }`}
                      >
                        {t('laLoungeEventPlanning.beforeAfter.before')}
                      </span>
                      <h3 className="font-display text-xl text-foreground/90 mb-2">{pair.beforeName}</h3>
                      <p className="text-sm text-foreground/60 leading-relaxed">{pair.beforeDesc}</p>
                    </div>
                  </article>

                  {/* Animated transformation arrow (static under
                      prefers-reduced-motion) */}
                  <div className="flex md:flex-col items-center justify-center py-2 md:py-0" aria-hidden="true">
                    <motion.div
                      animate={reducedMotion ? { x: 0 } : { x: [0, arrowDrift, 0] }}
                      transition={
                        reducedMotion
                          ? { duration: 0.3 }
                          : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                      }
                      className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_40px_-8px_rgba(230,0,126,0.55)]"
                    >
                      <ArrowIcon className="size-5" />
                    </motion.div>
                  </div>

                  {/* AFTER — vibrant magenta glow */}
                  <article className="relative overflow-hidden rounded-2xl border border-primary/40 bg-[#200a18] p-6 sm:p-7 min-h-[200px] flex flex-col shadow-[0_12px_40px_-8px_rgba(230,0,126,0.35)]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(135deg, #2a0a1d 0%, #5a0e3a 45%, #1c0410 100%)' }}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{
                        background: 'radial-gradient(circle at 70% 30%, rgba(230,0,126,0.38) 0%, transparent 55%)',
                      }}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(-25deg, rgba(230,0,126,0.5) 0, rgba(230,0,126,0.5) 1px, transparent 1px, transparent 26px)',
                      }}
                    />
                    <div className="relative flex flex-col h-full">
                      <span
                        className={`inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[0.65rem] font-medium text-primary mb-4${
                          locale === 'en' ? ' uppercase tracking-wider' : ''
                        }`}
                      >
                        {t('laLoungeEventPlanning.beforeAfter.after')}
                      </span>
                      <h3 className="font-display text-xl text-primary mb-2">{pair.afterName}</h3>
                      <p className="text-sm text-foreground/85 leading-relaxed">{pair.afterDesc}</p>
                    </div>
                  </article>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-16 sm:py-20 px-4 border-t border-primary/10">
        <Reveal className="max-w-3xl mx-auto text-center">
          <div className="gold-divider w-40 mx-auto mb-8" aria-hidden="true" />
          <MagneticButton
            onClick={() => navigate('/la-lounge/contact')}
            className={`bg-primary text-primary-foreground hover:bg-primary/90 min-h-12 shadow-[0_12px_40px_-8px_rgba(230,0,126,0.35)]${
              locale === 'en' ? ' tracking-wide' : ''
            }`}
            ariaLabel={t('laLoungeEventPlanning.ctaButton')}
          >
            {t('laLoungeEventPlanning.ctaButton')}
            <ArrowIcon className="size-4" aria-hidden="true" />
          </MagneticButton>
        </Reveal>
      </section>
    </div>
  )
}
