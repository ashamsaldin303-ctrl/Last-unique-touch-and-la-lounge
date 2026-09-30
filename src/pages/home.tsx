'use client'

/**
 * HOME — brand selector.
 *
 * Faithful restoration of the original repo's landing/hero.tsx:
 * the fixed 3D "CosmicBackground" (nebula shaders + twinkling star layers +
 * gold dust + orbiting rings with pearls) rendered behind three holo-chamber
 * ExperienceCards and the stats bar. The CSS fallback layers (dark gradient)
 * stay visible until WebGL initializes (or on incapable devices).
 *
 * UPGRADE LAYER (visible polish, structure & backgrounds untouched):
 * animated stat counters · brand showcase (tilt + glow) · enhanced marquee ·
 * why-us TiltCards · 3-step process with drawn connector · auto-rotating
 * testimonials · magnetic CTA button.
 */

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Gem, CalendarCheck, Truck, Box, MousePointerClick, CalendarRange, PartyPopper, ArrowLeft } from 'lucide-react'
import { useRouter } from '@/lib/router'
import { useI18n } from '@/lib/i18n'
import { ExperienceCard } from '@/components/landing/experience-card'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Reveal } from '@/components/shared/reveal'
import {
  SectionHeading,
  StatsBand,
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

export default function HomePage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const ref = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const brands = [
    {
      key: 'lut' as const,
      name: t('brandSelector.lut.name'),
      desc: t('brandSelector.lut.desc'),
      image: '/products/lut_heritage.webp',
      accent: '#8B6B3D',
      href: '/last-unique-touch',
    },
    {
      key: 'lalounge' as const,
      name: t('brandSelector.lalounge.name'),
      desc: t('brandSelector.lalounge.desc'),
      image: '/products/lalounge_modern.webp',
      accent: '#E6007E',
      href: '/la-lounge',
    },
    {
      key: 'birthday' as const,
      name: t('brandSelector.birthday.name'),
      desc: t('brandSelector.birthday.desc'),
      image: '/products/birthday_atelier.webp',
      accent: '#F5B914',
      href: '/your-birthday',
    },
  ]

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
      {/* ============ HERO — brand selector (original structure) ============ */}
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

        {/* Top: Brand logo + tagline */}
        <motion.div
          style={{ opacity }}
          className="relative z-40 pt-4 sm:pt-20 pb-1 sm:pb-4 text-center px-4 shrink-0"
        >
          <div
            className="animate-hero-down flex items-center justify-center gap-2 sm:gap-3 mb-2"
            style={{ animationDelay: '0.2s' }}
          >
            <span className="w-6 sm:w-8 h-px bg-gold/50" />
            <span className="eyebrow text-gold/80 text-[10px] sm:text-xs">
              {t('hero.eyebrow')}
            </span>
            <span className="w-6 sm:w-8 h-px bg-gold/50" />
          </div>

          <h1
            className="animate-hero-down font-display text-xl sm:text-3xl md:text-4xl text-paper"
            style={{ animationDelay: '0.3s' }}
          >
            {t('hero.chooseExperience')}
          </h1>

          <p
            className="animate-hero-in text-xs sm:text-sm text-paper/70 mt-1"
            style={{ animationDelay: '0.5s' }}
          >
            {t('hero.subtitle')}
          </p>
        </motion.div>

        {/* === Holo-Chamber Cards (3 brand entries — not branded as any single brand) === */}
        <div className="relative z-20 flex-1 flex items-center px-3 sm:px-6 lg:px-8 py-0 sm:py-2">
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-2 md:gap-6 lg:gap-8">
            <ExperienceCard
              category={t('hero.categories.heritage')}
              title={t('brandSelector.lut.name')}
              actionText={t('hero.explore')}
              productImageUrl="/products/lalounge_modern.webp"
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
              productImageUrl="/products/lut_heritage.webp"
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

      {/* ============ MARQUEE v2 — three brands strip (upgrade: pulsing
          brand dots + interactive letter-spacing) ============ */}
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

      {/* ============ BRAND SHOWCASE (upgrade addition) — 3 tilt cards with
          brand imagery, glow borders and accent frames ============ */}
      <section className="py-16 sm:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            title={t('home.showcase.title')}
            subtitle={t('home.showcase.subtitle')}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {brands.map((brand, i) => (
              <Reveal key={brand.key} delay={i * 0.14}>
                <TiltCard className="h-full rounded-2xl">
                  <button
                    onClick={() => navigate(brand.href)}
                    className="glow-border card-lift group relative w-full h-full rounded-2xl overflow-hidden bg-card border border-border cursor-pointer border-0 p-0 text-start"
                    aria-label={`${t('home.showcase.viewAll')}: ${brand.name}`}
                  >
                    {/* Brand image — clip-path bottom reveal (emil technique) */}
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={brand.image}
                        alt={brand.name}
                        className="clip-reveal-img w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        loading="lazy"
                      />
                      <div
                        className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-70"
                        style={{
                          background: `linear-gradient(to top, color-mix(in srgb, ${brand.accent} 32%, transparent), transparent 65%)`,
                        }}
                      />
                      {/* Accent frame corner */}
                      <span
                        aria-hidden="true"
                        className="absolute top-3 start-3 w-8 h-8 border-t-2 border-s-2 rounded-tl-md"
                        style={{ borderColor: brand.accent }}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute bottom-3 end-3 w-8 h-8 border-b-2 border-e-2 rounded-br-md"
                        style={{ borderColor: brand.accent }}
                      />
                    </div>

                    <div className="p-6">
                      <h3 className="font-display text-xl text-foreground mb-1.5">
                        {brand.name}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {brand.desc}
                      </p>
                      <span
                        className="inline-flex items-center gap-2 text-sm font-medium transition-transform duration-300 group-hover:-translate-y-0.5"
                        style={{ color: brand.accent }}
                      >
                        {t('home.showcase.viewAll')}
                        <ArrowLeft
                          className={`w-4 h-4 transition-transform duration-300 ${
                            locale === 'ar' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1 rotate-180'
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </button>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHY US (asymmetric grid per taste: no identical card
          rows — the 3D preview feature spans a double column) ============ */}
      <section className="py-16 sm:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <SectionHeading title={t('whyUs.title')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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

      {/* ============ PROCESS — 3 steps with drawn connector (upgrade) ============ */}
      <ProcessSteps
        eyebrow={t('home.process.eyebrow')}
        title={t('home.process.title')}
        steps={processSteps}
      />

      {/* ============ TESTIMONIALS — auto-rotating (upgrade) ============ */}
      <TestimonialsSection
        title={t('home.testimonials.title')}
        subtitle={t('home.testimonials.subtitle')}
        items={testimonials}
      />

      {/* ============ CTA — magnetic button + animated glow (upgrade) ============ */}
      <section className="py-16 sm:py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-8 sm:p-12 text-center card-lift">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.35]"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 80% at 20% 0%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 70%), radial-gradient(ellipse 50% 70% at 90% 100%, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 70%)',
                }}
              />
              <h2 className="relative font-display text-2xl sm:text-3xl text-foreground mb-3">
                {t('cta.home.title')}
              </h2>
              <p className="relative text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6">
                {t('cta.home.subtitle')}
              </p>
              <MagneticButton
                onClick={() => navigate('/products')}
                className="bg-primary text-primary-foreground"
                ariaLabel={t('cta.home.button')}
              >
                {t('cta.home.button')}
                <ArrowLeft
                  className={`w-4 h-4 ${locale === 'ar' ? '' : 'rotate-180'}`}
                  aria-hidden="true"
                />
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
