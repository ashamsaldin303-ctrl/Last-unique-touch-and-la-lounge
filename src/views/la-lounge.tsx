'use client'

/**
 * LA LOUNGE — brand landing page (route /la-lounge).
 *
 * Faithful restoration of the original repo's la-lounge-view.tsx:
 * a fixed full-screen 3D event-blueprint scene (vanilla Three.js —
 * magenta/purple wireframe lounge layout with main stage, dancefloor,
 * banquet chairs, sofas, planters, food truck, totems, string lights,
 * truss segments and turnstiles on a drafting grid) rendered over a light
 * "blueprint paper" background. The hero title sits centered above it;
 * the three service cards + CTA below use dark glass (bg-card/80) exactly
 * like the original.
 *
 * UPGRADE LAYER (visible polish, background & structure untouched):
 * magnetic hero CTA · tilt + glow service cards · animated stats band ·
 * 3-stage process with drawn connector · auto-rotating testimonials ·
 * magnetic finale CTA band. After the light blueprint hero + services the
 * page flows into dark charcoal-plum sections (bg-background) where the
 * upgrade kit's dark-mode variants shine.
 */

import type { CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import {
  ArrowDown,
  ClipboardList,
  Armchair,
  Sparkles,
  MessageSquare,
  PencilRuler,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Reveal } from '@/components/shared/reveal'
import {
  SectionHeading,
  StatsBand,
  ProcessSteps,
  TestimonialsSection,
  TiltCard,
  MagneticButton,
  type TestimonialItem,
} from '@/components/shared/upgrade'
import { useRouter } from '@/lib/router'
import { useI18n, type Locale } from '@/lib/i18n'

// v31-build-B6: lazy-load the vanilla-Three.js event-blueprint scene.
// ssr:false because WebGL only exists in the browser; the component itself
// also gates on `shouldEnable3D()` and returns null on incapable devices.
const LaLounge3DBackground = dynamic(() => import('@/components/3d/la-lounge-3d-background'), {
  ssr: false,
  loading: () => null,
})

/**
 * Spaced-caps treatment that respects Arabic script (reference:
 * la-lounge-products.tsx). Latin gets letter-spacing + uppercase; Arabic
 * gets word-spacing instead — letter-spacing would tear the joined
 * letters apart.
 */
const eyebrowTypo = (locale: Locale): CSSProperties =>
  locale === 'ar'
    ? { wordSpacing: '0.45em' }
    : { letterSpacing: '0.3em', textTransform: 'uppercase' }

export default function LaLoungePage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()

  // Task 3: three La Lounge services, each linking to its own feature page.
  //   1. Custom Furniture Manufacturing   → /la-lounge/custom-furniture
  //   2. Complete Event Planning & Execution → /la-lounge/event-planning
  //   3. Ready-Made Plans Execution       → /la-lounge/ready-plans
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  const services: Array<{
    title: string
    desc: string
    icon: LucideIcon
    examples: string[]
    href: string
  }> = [
    {
      title: t('laLounge.services.customFurniture.title'),
      desc: t('laLounge.services.customFurniture.desc'),
      icon: Armchair,
      href: '/la-lounge/custom-furniture',
      examples: [
        t('laLounge.services.customFurniture.ex1'),
        t('laLounge.services.customFurniture.ex2'),
        t('laLounge.services.customFurniture.ex3'),
        t('laLounge.services.customFurniture.ex4'),
      ],
    },
    {
      title: t('laLounge.services.eventPlanning.title'),
      desc: t('laLounge.services.eventPlanning.desc'),
      icon: ClipboardList,
      href: '/la-lounge/event-planning',
      examples: [
        t('laLounge.services.eventPlanning.ex1'),
        t('laLounge.services.eventPlanning.ex2'),
        t('laLounge.services.eventPlanning.ex3'),
        t('laLounge.services.eventPlanning.ex4'),
      ],
    },
    {
      title: t('laLounge.services.readyPlans.title'),
      desc: t('laLounge.services.readyPlans.desc'),
      icon: Sparkles,
      href: '/la-lounge/ready-plans',
      examples: [
        t('laLounge.services.readyPlans.ex1'),
        t('laLounge.services.readyPlans.ex2'),
        t('laLounge.services.readyPlans.ex3'),
        t('laLounge.services.readyPlans.ex4'),
      ],
    },
  ]

  const processSteps = [
    { title: t('laLounge.process.step1.title'), desc: t('laLounge.process.step1.desc'), icon: MessageSquare },
    { title: t('laLounge.process.step2.title'), desc: t('laLounge.process.step2.desc'), icon: PencilRuler },
    { title: t('laLounge.process.step3.title'), desc: t('laLounge.process.step3.desc'), icon: Sparkles },
  ]

  const testimonials: TestimonialItem[] = [
    { name: t('laLounge.testimonials.item1.name'), role: t('laLounge.testimonials.item1.role'), text: t('laLounge.testimonials.item1.text') },
    { name: t('laLounge.testimonials.item2.name'), role: t('laLounge.testimonials.item2.role'), text: t('laLounge.testimonials.item2.text') },
    { name: t('laLounge.testimonials.item3.name'), role: t('laLounge.testimonials.item3.role'), text: t('laLounge.testimonials.item3.text') },
  ]

  const scrollToServices = () => {
    // Respect prefers-reduced-motion: jump instead of smooth-scrolling.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document
      .getElementById('services')
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <div className="relative w-full bg-transparent">
      {/* Light "blueprint paper" behind the transparent 3D canvas — the
          original rendered over the (transparent → white) body. Painted as a
          fixed layer BELOW the canvas (z-0, earlier in DOM) so the magenta
          wireframe scene stays fully visible. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none bg-[var(--ll-sheet)]"
      />

      {/* === v31-build-B6: Fixed full-screen 3D blueprint background ===
          Sits behind all page content (z-0). Hero + services use z-10 so
          they stack above it. Renders null on incapable devices. */}
      <ErrorBoundary>
        <LaLounge3DBackground />
      </ErrorBoundary>

      {/* === Hero section — title centered, 3D blueprint background === */}
      <div className="relative z-10 min-h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-center">
        {/* Centered title */}
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-primary text-xs" style={eyebrowTypo(locale)}>
              {t('laLounge.eyebrow')}
            </span>
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-display font-light text-primary tracking-widest drop-shadow-sm mb-4">
            {t('brandSelector.lalounge.name')}
          </h1>

          <p
            className={`text-sm sm:text-base max-w-lg mb-8 font-semibold${
              locale === 'en' ? ' tracking-wide' : ''
            }`}
            style={{
              color: 'var(--ll-ink)',
              textShadow:
                '0 1px 3px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.6)',
            }}
          >
            {t('laLounge.subtitle')}
          </p>

          {/* Services button — scrolls to services section (upgrade:
              magnetic pull + shine sweep) */}
          <MagneticButton
            onClick={scrollToServices}
            className={`bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_rgba(230,0,126,0.35)] min-h-11${
              locale === 'en' ? ' tracking-wide' : ''
            }`}
          >
            {t('laLounge.featuresButton')}
          </MagneticButton>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-primary/70">
          <ArrowDown className="w-5 h-5 animate-bounce" aria-hidden="true" />
        </div>
      </div>

      {/* === Services section — revealed on scroll (over the light
          blueprint paper; cards keep the original dark glass) === */}
      <div id="services" className="relative z-10 py-20 px-4 bg-transparent">
        <div className="max-w-5xl mx-auto">
          {/* SectionHeading with dark-ink overrides so the title stays
              readable over the light blueprint paper (theme foreground is
              cream, designed for the dark sections below). */}
          <SectionHeading
            title={t('laLounge.servicesTitle')}
            subtitle={t('laLounge.servicesSubtitle')}
            className="[&>h2]:text-primary [&>p]:text-[var(--ll-ink)]/70 mb-12"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service, i) => {
              const Icon = service.icon
              return (
                <Reveal key={i} delay={i * 0.12} className="h-full">
                  <TiltCard className="h-full rounded-lg" max={6}>
                    <div className="glow-border card-lift bg-card/80 backdrop-blur-md border border-primary/10 rounded-lg p-8 text-center transition-shadow flex flex-col h-full">
                      <div className="flex items-center justify-center mb-5 text-primary">
                        <Icon className="size-6" />
                      </div>
                      <h3 className="font-display text-xl text-primary mb-3">{service.title}</h3>
                      <p className="text-sm text-foreground/60 leading-relaxed mb-4">
                        {service.desc}
                      </p>
                      {/* V10 user request: examples list inside each service card */}
                      <ul className="text-start space-y-1.5 mt-4 pt-4 border-t border-primary/10">
                        {service.examples.map((example, j) => (
                          <li
                            key={j}
                            className="text-xs text-foreground/70 flex items-center gap-2"
                          >
                            <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                            {example}
                          </li>
                        ))}
                      </ul>
                      {/* Task 3a: "Learn More" button → service feature page */}
                      <button
                        onClick={() => navigate(service.href)}
                        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
                      >
                        {t('laLounge.learnMore')}
                        <ArrowIcon className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </TiltCard>
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============ STATS BAND (upgrade) — bridge into the dark region:
          animated magenta counters over charcoal plum ============ */}
      <section className="relative z-10 bg-background border-t border-primary/10 py-12 sm:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <StatsBand
            accent="#E6007E"
            stats={[
              { value: 500, suffix: '+', label: t('hero.statLabels.luxuryItems') },
              { value: 2000, suffix: '+', label: t('hero.statLabels.events') },
              { value: 5, suffix: '', label: t('hero.statLabels.years') },
            ]}
          />
        </div>
      </section>

      {/* ============ PROCESS — 3 stages with drawn connector (upgrade) ============
          relative z-10 so the section paints above the fixed blueprint
          paper/canvas layers (static sections would render beneath them). */}
      <ProcessSteps
        eyebrow={t('laLounge.process.eyebrow')}
        title={t('laLounge.process.title')}
        steps={processSteps}
        className="relative z-10"
      />

      {/* ============ TESTIMONIALS — auto-rotating, magenta accent (upgrade) ============
          The wrapper lifts the kit's section above the fixed z-0 blueprint
          layers (the component has no className/z-index passthrough). */}
      <div className="relative z-10">
        <TestimonialsSection
          title={t('laLounge.testimonials.title')}
          subtitle={t('laLounge.testimonials.subtitle')}
          items={testimonials}
          accent="#E6007E"
        />
      </div>

      {/* ============ CTA — magnetic button + animated glow (upgrade) ============ */}
      <section className="relative z-10 bg-background py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-8 sm:p-12 text-center card-lift glow-border">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.35]"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 80% at 20% 0%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 70%), radial-gradient(ellipse 50% 70% at 90% 100%, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 70%)',
                }}
              />
              <h2 className="relative font-display text-2xl sm:text-3xl text-foreground mb-3">
                {t('laLounge.cta.title')}
              </h2>
              <p className="relative text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6">
                {t('laLounge.cta.subtitle')}
              </p>
              <MagneticButton
                onClick={() => navigate('/la-lounge/contact')}
                className={`bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_rgba(230,0,126,0.35)] min-h-11${
                  locale === 'en' ? ' tracking-wide' : ''
                }`}
                ariaLabel={t('laLounge.contactButton')}
              >
                {t('laLounge.contactButton')}
                <ArrowIcon className="size-4" aria-hidden="true" />
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
