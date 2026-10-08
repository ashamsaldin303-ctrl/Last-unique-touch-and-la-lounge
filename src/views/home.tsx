'use client'

/**
 * HOME — the neutral maison (umbrella) landing page.  (Task 27)
 *
 * The landing belongs to no single brand: it is the "house" that
 * embraces the three worlds. The original structure is preserved —
 * the fixed 3D "CosmicBackground" (nebula shaders + twinkling star
 * layers + gold dust + orbiting rings) renders behind the three
 * holo-chamber ExperienceCards and the stats bar, with the CSS
 * fallback layers (dark gradient) visible until WebGL initializes.
 *
 * Neutral identity: the page renders under data-brand="neutral"
 * (champagne on warm near-black — see globals.css), and every
 * brand moment below the hero carries its OWN accent through the
 * tri-* utilities: LUT bronze, La Lounge magenta, Birthday gold.
 *
 * Sections: hero (brand selector) → tri-brand marquee → THREE
 * WORLDS (per-brand door cards with dual CTAs) → why us → process
 * → testimonials → house CTA with tri-brand dots.
 */

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Gem,
  CalendarCheck,
  Truck,
  Box,
  MousePointerClick,
  CalendarRange,
  PartyPopper,
  ArrowLeft,
} from 'lucide-react'
import { useRouter } from '@/lib/router'
import { useI18n } from '@/lib/i18n'
import { ExperienceCard } from '@/components/landing/experience-card'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Reveal } from '@/components/shared/reveal'
import {
  SectionHeading,
  ProcessSteps,
  TestimonialsSection,
  TiltCard,
  MagneticButton,
  AnimatedCounter,
  type TestimonialItem,
} from '@/components/shared/upgrade'

// Lazy-load the 3D cosmic background so Three.js stays out of the initial
// bundle. ssr:false because WebGL only exists in the browser. The component
// itself gates on device capabilities and renders on capable hardware only.
const CosmicBackground = dynamic(() => import('@/components/3d/cosmic-background'), {
  ssr: false,
  loading: () => null,
})

/** The three worlds — each with its own accent, imagery and dual CTAs. */
const WORLDS = [
  {
    key: 'lut' as const,
    tri: 'tri-lut',
    index: '01',
    nameKey: 'brandSelector.lut.name',
    taglineKey: 'maison.worlds.lut.tagline',
    descKey: 'maison.worlds.lut.desc',
    image: '/products/lut_heritage.webp',
    href: '/last-unique-touch',
    productsHref: '/products',
    /** Button text color on the brand accent (yellow needs dark text). */
    onAccent: '#ffffff',
  },
  {
    key: 'lalounge' as const,
    tri: 'tri-ll',
    index: '02',
    nameKey: 'brandSelector.lalounge.name',
    taglineKey: 'maison.worlds.lalounge.tagline',
    descKey: 'maison.worlds.lalounge.desc',
    image: '/products/lalounge_modern.webp',
    href: '/la-lounge',
    productsHref: '/la-lounge/products',
    onAccent: '#ffffff',
  },
  {
    key: 'birthday' as const,
    tri: 'tri-bday',
    index: '03',
    nameKey: 'brandSelector.birthday.name',
    taglineKey: 'maison.worlds.birthday.tagline',
    descKey: 'maison.worlds.birthday.desc',
    image: '/products/birthday_atelier.webp',
    href: '/your-birthday',
    productsHref: '/your-birthday/products',
    onAccent: '#1a1a2e',
  },
]

export default function HomePage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const ref = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const whyUsItems = [
    { key: 'luxury' as const, icon: Gem },
    { key: 'flexible' as const, icon: CalendarCheck },
    { key: 'delivery' as const, icon: Truck },
    { key: '3d' as const, icon: Box },
  ]

  const processSteps = [
    { title: t('home.process.step1.title'), desc: t('home.process.step1.desc'), icon: MousePointerClick },
    { title: t('home.process.step2.title'), desc: t('home.process.step2.desc'), icon: CalendarRange },
    { title: t('home.process.step3.title'), desc: t('home.process.step3.desc'), icon: PartyPopper },
  ]

  const testimonials: TestimonialItem[] = [
    { name: t('home.testimonials.item1.name'), role: t('home.testimonials.item1.role'), text: t('home.testimonials.item1.text') },
    { name: t('home.testimonials.item2.name'), role: t('home.testimonials.item2.role'), text: t('home.testimonials.item2.text') },
    { name: t('home.testimonials.item3.name'), role: t('home.testimonials.item3.role'), text: t('home.testimonials.item3.text') },
  ]

  return (
    <div className="relative">
      {/* ============ HERO — the house brand selector (original
          structure kept: cosmic 3D + holo-chamber trio) ============ */}
      <section
        ref={ref}
        className="relative min-h-[100dvh] w-full overflow-hidden bg-transparent flex flex-col"
      >
        {/* CSS fallback background (always rendered — visible before WebGL
            initializes or when 3D is disabled). Kept behind the 3D canvas. */}
        <div className="absolute inset-0 z-0 pointer-events-none hero-bg-gradient" />
        <div className="absolute inset-0 z-0 pointer-events-none hero-bg-grid" />
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        {/* 3D cosmic background — renders null when WebGL is unavailable,
            in which case the CSS fallback above remains visible. */}
        <ErrorBoundary>
          <CosmicBackground />
        </ErrorBoundary>

        {/* Top: house mark + neutral umbrella headline */}
        <motion.div
          style={{ opacity }}
          className="relative z-40 pt-4 sm:pt-20 pb-1 sm:pb-4 text-center px-4 shrink-0"
        >
          <div
            className="animate-hero-down flex items-center justify-center gap-2 sm:gap-3 mb-2"
            style={{ animationDelay: '0.2s' }}
          >
            <span className="w-6 sm:w-8 h-px bg-gold/50" />
            {/* Tri-brand dots — the maison mark */}
            <span className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-1.5 rounded-full bg-lut" />
              <span className="size-1.5 rounded-full bg-lalounge" />
              <span className="size-1.5 rounded-full bg-birthday" />
            </span>
            <span className="eyebrow text-gold/80 text-[10px] sm:text-xs">
              {t('maison.eyebrow')}
            </span>
            <span className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-1.5 rounded-full bg-lut" />
              <span className="size-1.5 rounded-full bg-lalounge" />
              <span className="size-1.5 rounded-full bg-birthday" />
            </span>
            <span className="w-6 sm:w-8 h-px bg-gold/50" />
          </div>

          <h1
            className="animate-hero-down font-display text-xl sm:text-3xl md:text-4xl text-paper"
            style={{ animationDelay: '0.3s' }}
          >
            {t('maison.title')}
          </h1>

          <p
            className="animate-hero-in mx-auto mt-1 max-w-2xl text-xs sm:text-sm text-paper/70"
            style={{ animationDelay: '0.5s' }}
          >
            {t('maison.subtitle')}
          </p>
        </motion.div>

        {/* === Holo-Chamber Cards (3 brand entries — not branded as any single brand) === */}
        <div className="relative z-20 flex-1 flex items-center px-3 sm:px-6 lg:px-8 py-0 sm:py-2">
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-2 md:gap-6 lg:gap-8">
            <ExperienceCard
              category={t('hero.categories.heritage')}
              title={t('brandSelector.lut.name')}
              actionText={t('hero.explore')}
              productImageUrl="/products/lut_heritage.webp"
              logoUrl="/products/lut_heritage.jpeg"
              isComingSoon={false}
              delay={0.01}
              index="01"
              accentColor="heritage"
              locale={locale}
              onClick={() => navigate('/last-unique-touch')}
            />
            <ExperienceCard
              category={t('hero.categories.modern')}
              title={t('brandSelector.lalounge.name')}
              actionText={t('hero.explore')}
              productImageUrl="/products/lalounge_modern.webp"
              logoUrl="/products/lalounge_modern.jpeg"
              isComingSoon={false}
              delay={0.02}
              index="02"
              accentColor="modern"
              locale={locale}
              onClick={() => navigate('/la-lounge')}
            />
            <ExperienceCard
              category={t('hero.categories.atelier')}
              title={t('brandSelector.birthday.name')}
              actionText={t('hero.explore')}
              productImageUrl="/products/birthday_atelier.webp"
              logoUrl="/products/birthday_atelier.jpeg"
              isComingSoon={false}
              delay={0.03}
              index="03"
              accentColor="atelier"
              locale={locale}
              onClick={() => navigate('/your-birthday')}
            />
          </div>
        </div>

        {/* Bottom: Stats bar — animated counters (hidden on mobile so the 3
            cards fit without scroll) */}
        <motion.div
          style={{ opacity }}
          className="relative z-40 pb-2 sm:pb-6 px-4 shrink-0 hidden sm:block"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-4 sm:gap-12">
              {[
                { value: 500, suffix: '+', label: t('hero.statLabels.luxuryItems') },
                { value: 2000, suffix: '+', label: t('hero.statLabels.events') },
                { value: 5, suffix: '', label: t('hero.statLabels.years') },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="animate-hero-up text-center"
                  style={{ animationDelay: `${1.0 + i * 0.1}s` }}
                >
                  <div className="font-display text-base sm:text-2xl text-gold tabular-nums">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2000} />
                  </div>
                  <div className="eyebrow text-paper/60 mt-0.5 text-[8px] sm:text-[10px]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============ MARQUEE — three brands strip (pulsing brand dots) ============ */}
      <section
        className="marquee-v2 bg-ink border-y border-white/[0.06] py-4 overflow-hidden"
        aria-hidden="true"
      >
        <div className="marquee-track flex w-max items-center gap-10">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex items-center gap-10">
              {[
                { name: 'LAST UNIQUE TOUCH', hex: '#8B6B3D' },
                { name: 'LA LOUNGE', hex: '#E6007E' },
                { name: 'YOUR BIRTHDAY', hex: '#F5B914' },
              ].flatMap((b) => [
                <span
                  key={`${dup}-${b.name}`}
                  className="marquee-word font-display text-sm sm:text-base tracking-[0.3em] text-paper/40 whitespace-nowrap"
                >
                  {b.name}
                </span>,
                <span
                  key={`${dup}-${b.name}-dot`}
                  className="animate-dot-pulse w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: b.hex, boxShadow: `0 0 8px ${b.hex}` }}
                />,
              ])}
            </div>
          ))}
        </div>
      </section>

      {/* ============ THREE WORLDS — per-brand door cards, each carrying
          its own accent (LUT bronze / La Lounge magenta / Birthday gold)
          with dual CTAs: enter the world + browse its products ============ */}
      <section className="py-16 sm:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow={t('maison.worlds.eyebrow')}
            title={t('maison.worlds.title')}
            subtitle={t('maison.worlds.subtitle')}
          />

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:mt-12">
            {WORLDS.map((world, i) => (
              <Reveal key={world.key} delay={i * 0.12} className="h-full">
                <TiltCard className={`h-full rounded-2xl ${world.tri}`} max={7}>
                  <article className="glow-border card-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
                    {/* Brand imagery — clip-path bottom reveal */}
                    <div className="relative h-52 overflow-hidden">
                      <Image
                        src={world.image}
                        alt={t(world.nameKey)}
                        fill
                        sizes="(max-width: 767px) 100vw, 33vw"
                        className="clip-reveal-img object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                      <div
                        className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-80"
                        style={{
                          background: `linear-gradient(to top, color-mix(in srgb, var(--tri) 38%, transparent), transparent 68%)`,
                        }}
                        aria-hidden="true"
                      />
                      {/* Oversized index — editorial numbering */}
                      <span
                        aria-hidden="true"
                        className="absolute top-3 end-4 select-none font-display text-4xl sm:text-5xl leading-none tabular-nums opacity-45"
                        style={{ color: 'var(--tri)', textShadow: '0 2px 18px rgba(0,0,0,0.35)' }}
                      >
                        {world.index}
                      </span>
                      {/* Accent corner frames */}
                      <span
                        aria-hidden="true"
                        className="absolute top-3 start-3 h-8 w-8 border-t-2 border-s-2 rounded-tl-md"
                        style={{ borderColor: 'var(--tri)' }}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute bottom-3 end-3 h-8 w-8 border-b-2 border-e-2 rounded-br-md"
                        style={{ borderColor: 'var(--tri)' }}
                      />
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      {/* Tagline chip */}
                      <span
                        className="mb-2.5 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--tri) 45%, transparent)',
                          color: 'var(--tri)',
                          backgroundColor: 'color-mix(in srgb, var(--tri) 10%, transparent)',
                        }}
                      >
                        <span
                          className="inline-block size-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--tri)' }}
                          aria-hidden="true"
                        />
                        {t(world.taglineKey)}
                      </span>

                      <h3 className="mb-1.5 font-display text-xl text-foreground">
                        {t(world.nameKey)}
                      </h3>
                      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                        {t(world.descKey)}
                      </p>

                      {/* Dual CTAs — enter the world + browse its products */}
                      <div className="mt-auto flex flex-col gap-2.5">
                        <button
                          type="button"
                          onClick={() => navigate(world.href)}
                          className="group/enter relative flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-transform duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                          style={{
                            backgroundColor: 'var(--tri)',
                            color: world.onAccent,
                            boxShadow: '0 14px 34px -14px color-mix(in srgb, var(--tri) 70%, transparent)',
                          }}
                        >
                          {t('maison.worlds.enter')}
                          <ArrowLeft
                            className={`size-4 transition-transform duration-300 ${
                              locale === 'ar'
                                ? 'group-hover/enter:-translate-x-1'
                                : 'rotate-180 group-hover/enter:translate-x-1'
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(world.productsHref)}
                          className="flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors duration-300"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--tri) 40%, transparent)',
                            color: 'var(--tri)',
                          }}
                        >
                          {t('maison.worlds.products')}
                        </button>
                      </div>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHY US (asymmetric grid — the 3D preview feature
          spans a double column) ============ */}
      <section className="py-16 sm:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <SectionHeading title={t('maison.whyUsTitle')} />

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:mt-12">
            {whyUsItems.map((item, i) => {
              const Icon = item.icon
              const featured = item.key === '3d'
              return (
                <Reveal key={item.key} delay={i * 0.1} className={featured ? 'sm:col-span-2' : ''}>
                  <TiltCard className="h-full rounded-xl" max={6}>
                    <div
                      className={`glow-border card-lift lux-card h-full p-6 rounded-xl ${
                        featured
                          ? 'flex items-center gap-6 text-start sm:text-start'
                          : 'text-center'
                      }`}
                    >
                      <div
                        className={`icon-ring w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform duration-500 hover:rotate-12 hover:scale-110 shrink-0 ${
                          featured ? 'bg-primary/15 mx-0 mb-0' : 'bg-primary/10 mx-auto'
                        }`}
                      >
                        <Icon className="w-6 h-6 text-primary" strokeWidth={1.6} aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg text-foreground mb-2">
                          {t(`whyUs.items.${item.key}.title`)}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-[60ch]">
                          {t(`whyUs.items.${item.key}.desc`)}
                        </p>
                      </div>
                    </div>
                  </TiltCard>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ PROCESS — 3 steps with drawn connector ============ */}
      <ProcessSteps
        eyebrow={t('home.process.eyebrow')}
        title={t('home.process.title')}
        steps={processSteps}
      />

      {/* ============ TESTIMONIALS — auto-rotating ============ */}
      <TestimonialsSection
        title={t('home.testimonials.title')}
        subtitle={t('home.testimonials.subtitle')}
        items={testimonials}
      />

      {/* ============ HOUSE CTA — magnetic button to the unified store +
          tri-brand dots back into each world ============ */}
      <section className="py-16 sm:py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-8 sm:p-12 text-center card-lift">
              {/* Tri-brand ambience — one radial glow per world */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.4]"
                style={{
                  background:
                    'radial-gradient(ellipse 40% 60% at 18% 0%, rgba(139,107,61,0.22), transparent 70%), radial-gradient(ellipse 40% 60% at 50% 100%, rgba(230,0,126,0.14), transparent 70%), radial-gradient(ellipse 40% 60% at 82% 0%, rgba(245,185,20,0.18), transparent 70%)',
                }}
              />
              <h2 className="relative font-display text-2xl sm:text-3xl text-foreground mb-3">
                {t('maison.cta.title')}
              </h2>
              <p className="relative mb-7 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                {t('maison.cta.subtitle')}
              </p>
              <MagneticButton
                onClick={() => navigate('/products')}
                className="bg-primary text-primary-foreground"
                ariaLabel={t('maison.cta.shopAll')}
              >
                {t('maison.cta.shopAll')}
                <ArrowLeft
                  className={`w-4 h-4 ${locale === 'ar' ? '' : 'rotate-180'}`}
                  aria-hidden="true"
                />
              </MagneticButton>

              {/* Tri-brand quick links */}
              <div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                {WORLDS.map((world) => (
                  <button
                    key={world.key}
                    type="button"
                    onClick={() => navigate(world.href)}
                    className={`group/dot inline-flex items-center gap-2 text-xs font-semibold tracking-wide transition-transform duration-300 hover:-translate-y-0.5 ${world.tri}`}
                    style={{ color: 'var(--tri)' }}
                  >
                    <span
                      className="inline-block size-2 rounded-full transition-transform duration-300 group-hover/dot:scale-125"
                      style={{ backgroundColor: 'var(--tri)', boxShadow: '0 0 10px var(--tri)' }}
                      aria-hidden="true"
                    />
                    {t(world.nameKey)}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
