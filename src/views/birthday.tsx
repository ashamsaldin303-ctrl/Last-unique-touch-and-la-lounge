'use client'

/**
 * YOUR BIRTHDAY — brand landing page (route /your-birthday).
 *
 * Faithful restoration of the original repo's your-birthday-view.tsx:
 * a fixed full-screen 3D "Enchanted Celebration" background (vanilla
 * Three.js — tiered cake with piped beadwork + candle flames, balloons
 * with string tails, wrapped gifts with bows, sinusoidal curtain backdrop,
 * falling confetti, Reflective floor, Bloom + FXAA post-processing, all in
 * the 4 brand colors gold/purple/pink/red) rendered behind:
 *   hero (tagline badge + TextScramble gradient headline + pink subtitle +
 * gold Discover button), the dark-glass service cards, featured products
 * (live from the API), the 6-item gallery, and the CTA card that opens the
 * shared booking modal.
 *
 * UPGRADE LAYER (visible polish — 3D background & structure untouched):
 * magnetic gold CTAs · TiltCards + glow-border/card-lift on service and
 * product cards · icon-ring pulses on icon badges · kit SectionHeading for
 * the gallery · auto-rotating testimonials carousel (accent #F5B914).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { fetchProducts, formatKwd, localizedName, type ProductDTO } from '@/lib/products'
import { BookingModal } from '@/components/birthday/booking-modal'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Reveal } from '@/components/shared/reveal'
import {
  TiltCard,
  MagneticButton,
  SectionHeading,
  TestimonialsSection,
  type TestimonialItem,
} from '@/components/shared/upgrade'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import arMessages from '@/messages/ar.json'
import enMessages from '@/messages/en.json'

// v30-build-B5: Lazy-load Birthday3DBackground so Three.js stays out of the
// initial JS bundle. ssr:false because WebGL only exists in browsers. The
// background is `fixed inset-0 z-0` so it sits behind all content; the
// page's sections use `relative z-10` to render above it.
const Birthday3DBackground = dynamic(() => import('@/components/3d/birthday-3d-background'), {
  ssr: false,
  loading: () => null,
})

/* ------------------------------------------------------------------ */
/* Text scramble — simplified port of the original TextScramble class. */
/* Letters shuffle through random glyphs then settle; cycles the words  */
/* array every ~2.5s. Uses textContent (no innerHTML → XSS-safe).      */
/* ------------------------------------------------------------------ */

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#'

/* fix-2: scrambling through ASCII glyphs mid-Arabic reads as garbage
   (and tears the joined letters visually + for screen readers) — Arabic
   locale shuffles through Arabic letters instead. */
const SCRAMBLE_CHARS_AR = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'

function useTextScramble(words: string[], holdMs = 2500, arabic = false) {
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || words.length === 0) return

    // Reduced motion: no perpetual scramble loop — render the first word
    // statically (WCAG 2.3.3 Animation from Interactions; this is the only
    // always-on animation on the page — everything else is hover-gated).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = words[0]
      return
    }

    let cancelled = false
    let raf = 0
    let frame = 0
    let holdTimer: ReturnType<typeof setTimeout> | undefined
    let resolve: (() => void) | null = null
    let queue: Array<{ from: string; to: string; start: number; end: number }> = []

    const render = () => {
      if (cancelled) return
      const chars = arabic ? SCRAMBLE_CHARS_AR : SCRAMBLE_CHARS
      let out = ''
      let complete = 0
      for (const q of queue) {
        if (frame >= q.end) {
          complete++
          out += q.to
        } else if (frame >= q.start) {
          out +=
            Math.random() < 0.28
              ? chars[(Math.random() * chars.length) | 0]
              : q.from
        } else {
          out += q.from
        }
      }
      el.textContent = out
      if (complete === queue.length) {
        resolve?.()
        resolve = null
      } else {
        frame++
        raf = requestAnimationFrame(render)
      }
    }

    const setText = (text: string) => {
      const old = el.textContent ?? ''
      const len = Math.max(old.length, text.length)
      queue = []
      for (let i = 0; i < len; i++) {
        const start = (Math.random() * 24) | 0
        queue.push({
          from: old[i] ?? '',
          to: text[i] ?? '',
          start,
          end: start + 16 + ((Math.random() * 28) | 0),
        })
      }
      cancelAnimationFrame(raf)
      frame = 0
      render()
      return new Promise<void>((res) => {
        resolve = res
      })
    }

    // Start from title1, then cycle the words.
    el.textContent = words[0]
    let counter = 1
    const next = () => {
      if (cancelled) return
      setText(words[counter % words.length]).then(() => {
        if (!cancelled) holdTimer = setTimeout(next, holdMs)
      })
      counter++
    }
    holdTimer = setTimeout(next, holdMs)

    return () => {
      cancelled = true
      if (holdTimer) clearTimeout(holdTimer)
      cancelAnimationFrame(raf)
      resolve?.()
      resolve = null
    }
  }, [words, holdMs, arabic])

  return ref
}

/* ------------------------------------------------------------------ */
/* Gallery images — exact pairs from the original view.                */
/* ------------------------------------------------------------------ */

const GALLERY = [
  { n: 1, img: '/products/birthday_atelier.webp', grad: 'from-[var(--c-birthday-gold)] to-[var(--c-birthday-gold-light)]' },
  { n: 2, img: '/products/lalounge_modern.webp', grad: 'from-[var(--c-birthday-gold-light)] to-[var(--c-birthday-orange)]' },
  { n: 3, img: '/products/birthday_atelier.webp', grad: 'from-[var(--c-birthday-orange)] to-[var(--c-birthday-gold-dark)]' },
  { n: 4, img: '/products/lut_heritage.webp', grad: 'from-[var(--c-birthday-gold-dark)] to-[var(--c-birthday-gold)]' },
  { n: 5, img: '/products/birthday_atelier.webp', grad: 'from-[var(--c-birthday-gold)] to-[var(--c-birthday-gold-dark)]' },
  { n: 6, img: '/products/lalounge_modern.webp', grad: 'from-[var(--c-birthday-gold-dark)] to-[var(--c-birthday-gold-light)]' },
] as const

export default function BirthdayPage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const isRTL = locale === 'ar'

  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingPackage, setBookingPackage] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Raw arrays live in messages JSON (i18n t() only handles strings).
  const scrambleWords = useMemo<string[]>(
    () =>
      (locale === 'ar'
        ? arMessages.yourBirthday.hero.scrambleWords
        : enMessages.yourBirthday.hero.scrambleWords) as string[],
    [locale]
  )
  const galleryItems = useMemo<string[]>(
    () =>
      (locale === 'ar'
        ? arMessages.yourBirthday.gallery.items
        : enMessages.yourBirthday.gallery.items) as string[],
    [locale]
  )

  const titleRef = useTextScramble(scrambleWords, 2500, locale === 'ar')

  // Featured products — live from the API (seeded YOUR_BIRTHDAY items).
  useEffect(() => {
    let active = true
    fetchProducts({ brand: 'YOUR_BIRTHDAY' })
      .then((res) => {
        if (active) setProducts(res.products)
      })
      .catch(() => {
        /* section collapses on failure */
      })
      .finally(() => {
        if (active) setLoadingProducts(false)
      })
    return () => {
      active = false
    }
  }, [])

  const openBooking = (pkg: string | null) => {
    setBookingPackage(pkg)
    setBookingOpen(true)
  }

  const services = [
    {
      icon: '🎈',
      title: t('yourBirthday.services.item2.title'),
      desc: t('yourBirthday.services.item2.desc'),
      color: 'var(--c-birthday-gold-light)',
      examples: [
        t('yourBirthday.services.item2.ex1'),
        t('yourBirthday.services.item2.ex2'),
        t('yourBirthday.services.item2.ex3'),
        t('yourBirthday.services.item2.ex4'),
      ],
    },
    {
      icon: '🎵',
      title: t('yourBirthday.services.item3.title'),
      desc: t('yourBirthday.services.item3.desc'),
      color: 'var(--c-birthday-gold-dark)',
      examples: [
        t('yourBirthday.services.item3.ex1'),
        t('yourBirthday.services.item3.ex2'),
        t('yourBirthday.services.item3.ex3'),
        t('yourBirthday.services.item3.ex4'),
      ],
    },
  ]

  // Testimonials data for the upgrade carousel (existing i18n keys).
  const testimonials: TestimonialItem[] = [
    {
      name: t('yourBirthday.testimonials.item1.name'),
      role: t('yourBirthday.testimonials.item1.role'),
      text: t('yourBirthday.testimonials.item1.text'),
    },
    {
      name: t('yourBirthday.testimonials.item2.name'),
      role: t('yourBirthday.testimonials.item2.role'),
      text: t('yourBirthday.testimonials.item2.text'),
    },
    {
      name: t('yourBirthday.testimonials.item3.name'),
      role: t('yourBirthday.testimonials.item3.role'),
      text: t('yourBirthday.testimonials.item3.text'),
    },
  ]

  // Skeleton while loading keeps the section's space reserved (no CLS pop
  // after /api/products resolves); the section still collapses on
  // failure/empty (existing behavior).
  const showFeatured = loadingProducts || products.length > 0

  return (
    <>
      <div className="min-h-[100dvh] bg-transparent text-primary-foreground overflow-x-hidden">
        {/* v30-build-B5: Full-screen fixed 3D background — enchanted
            celebration scene. Rendered as a fixed layer behind all content;
            sections below use `relative z-10`. */}
        <ErrorBoundary>
          <Birthday3DBackground />
        </ErrorBoundary>

        {/* === HERO SECTION === */}
        <section className="relative z-10 min-h-[100dvh] flex items-center justify-center overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 z-1 bg-gradient-to-t from-transparent via-transparent to-transparent pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center pointer-events-none">
            <div className="pointer-events-auto mt-16 md:mt-0">
              {/* Tagline Badge */}
              <div className="mb-8 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-[var(--c-birthday-gold-dark)]/30 backdrop-blur-md shadow-[0_0_15px_rgba(201,149,14,0.15)]">
                <span className="w-2.5 h-2.5 bg-[var(--c-birthday-gold-dark)] rounded-full animate-ping motion-reduce:animate-none" />
                <span
                  className={`text-xs font-bold text-[var(--c-birthday-gold-dark)] font-mono${
                    isRTL ? '' : ' tracking-[0.25em] uppercase'
                  }`}
                  style={isRTL ? { wordSpacing: '0.3em' } : undefined}
                >
                  {t('yourBirthday.hero.tagline')}
                </span>
              </div>

              {/* Title with TextScramble (Arabic & English) */}
              <div className="mb-6">
                <h1
                  className={`text-5xl sm:text-7xl lg:text-8xl font-black py-2 ${
                    /* fix-2: negative tracking tears Arabic letter joins —
                       Latin keeps its tight display setting. */
                    isRTL
                      ? 'leading-[1.15]'
                      : 'leading-none tracking-tighter'
                  }`}
                  /* fix-2: the scrambling span mutates every frame — expose
                     the full static title to assistive tech and keep the
                     transient glyphs muted. */
                  aria-label={scrambleWords.join(locale === 'ar' ? '، ' : ' · ')}
                  aria-live="off"
                  style={{
                    fontFamily: isRTL
                      ? 'var(--font-birthday-arabic), Cairo, sans-serif'
                      : 'var(--font-birthday-headline), Orbitron, sans-serif',
                    background:
                      'linear-gradient(135deg, #FFCC00 0%, #FFD700 30%, #FFB6C1 60%, #E32636 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter:
                      'drop-shadow(0 0 24px rgba(255, 204, 0, 0.4)) drop-shadow(0 0 8px rgba(227, 38, 54, 0.3))',
                  }}
                >
                  <span ref={titleRef} aria-live="off">
                    {t('yourBirthday.hero.title1')}
                  </span>
                </h1>
              </div>

              {/* Subtitle */}
              <p
                className="text-base sm:text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
                style={{
                  fontFamily: isRTL ? 'var(--font-birthday-arabic)' : 'var(--font-birthday-sub)',
                  color: '#FFB6C1',
                  textShadow: '0 0 12px rgba(255, 182, 193, 0.5), 0 1px 3px rgba(0, 0, 0, 0.8)',
                }}
              >
                {t('yourBirthday.hero.subtitle')}
              </p>

              {/* CTA — single Discover button (upgrade: magnetic gold button) */}
              <div className="flex flex-col gap-4 justify-center items-center">
                <MagneticButton
                  onClick={() => navigate('/your-birthday/features')}
                  ariaLabel={t('yourBirthday.hero.discover')}
                  className={`w-full sm:w-auto px-10 py-4 font-bold text-primary-foreground shadow-[0_0_25px_rgba(245,185,20,0.4)] bg-[linear-gradient(135deg,var(--c-birthday-gold),var(--c-birthday-gold-light))] ${
                    isRTL
                      ? '[font-family:var(--font-birthday-arabic)]'
                      : '[font-family:var(--font-birthday-sub)]'
                  }`}
                >
                  {t('yourBirthday.hero.discover')}
                </MagneticButton>
              </div>
            </div>
          </div>
        </section>

        {/* === SERVICES SECTION === */}
        <section className="relative z-10 py-24 bg-transparent">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16 space-y-4">
              <h2
                className={`text-3xl md:text-5xl font-black${
                  isRTL ? '' : ' uppercase tracking-wider'
                }`}
                style={{
                  fontFamily: isRTL
                    ? 'var(--font-birthday-arabic)'
                    : 'var(--font-birthday-headline)',
                  background:
                    'linear-gradient(135deg, var(--c-birthday-gold), var(--c-birthday-gold-light), var(--c-birthday-gold-dark))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('yourBirthday.services.title')}
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-[var(--c-birthday-gold)] via-[var(--c-birthday-gold-light)] to-[var(--c-birthday-gold-dark)] mx-auto rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {services.map((service, i) => (
                <Reveal key={i} delay={i * 0.12} className="h-full">
                  <TiltCard className="h-full rounded-lg" max={6}>
                    <div
                      className="group glow-border card-lift relative p-8 rounded-lg border transition-colors duration-500 backdrop-blur-md overflow-hidden"
                      style={{
                        background: 'rgba(15, 12, 25, 0.85)',
                        borderColor: 'rgba(255, 204, 0, 0.15)',
                        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.7)',
                      }}
                    >
                  {/* Hover ambient spotlight glow */}
                  <div
                    className="absolute -end-20 -top-20 w-40 h-40 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: service.color }}
                  />

                  <div
                    className="icon-ring w-16 h-16 rounded-lg flex items-center justify-center text-3xl mb-6 transform group-hover:rotate-6 transition-transform duration-300"
                    style={{
                      background: `color-mix(in srgb, ${service.color} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${service.color} 40%, transparent)`,
                      boxShadow: `0 0 15px color-mix(in srgb, ${service.color} 20%, transparent)`,
                    }}
                  >
                    {service.icon}
                  </div>
                  <h3
                    className={`text-xl font-bold mb-3${
                      isRTL ? '' : ' tracking-wide'
                    } text-white`}
                    style={{
                      fontFamily: isRTL
                        ? 'var(--font-birthday-arabic)'
                        : 'var(--font-birthday-sub)',
                    }}
                  >
                    {service.title}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed mb-4">{service.desc}</p>
                  {/* V10 user request: examples list inside each service card */}
                  <ul className="space-y-2 mt-4 pt-4 border-t border-white/10">
                    {service.examples.map((example, j) => (
                      <li key={j} className="text-xs text-white/90 flex items-center gap-2">
                        <span
                          className="w-1 h-1 rounded-full shrink-0"
                          style={{ background: service.color }}
                        />
                        {example}
                      </li>
                    ))}
                  </ul>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* === FEATURED PRODUCTS SECTION === */}
        {showFeatured && (
          <section
            className="relative z-10 py-24"
            style={{
              background:
                'linear-gradient(to bottom, rgba(2,2,4,0) 0%, rgba(255,204,0,0.05) 50%, rgba(2,2,4,0) 100%)',
            }}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              {/* Header */}
              <div className="text-center mb-16 space-y-4">
                <h2
                  className={`text-3xl md:text-5xl font-black${
                    isRTL ? '' : ' uppercase tracking-wider'
                  }`}
                  style={{
                    fontFamily: isRTL
                      ? 'var(--font-birthday-arabic)'
                      : 'var(--font-birthday-headline)',
                    background:
                      'linear-gradient(135deg, var(--c-birthday-gold), var(--c-birthday-gold-light), var(--c-birthday-gold-dark))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {t('yourBirthday.featuredProducts.title')}
                </h2>
                <p className="text-white/75 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                  {t('yourBirthday.featuredProducts.subtitle')}
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-[var(--c-birthday-gold)] via-[var(--c-birthday-gold-light)] to-[var(--c-birthday-gold-dark)] mx-auto rounded-full" />
              </div>

              {/* Product grid — 2 cols on mobile, 4 on desktop (upgrade: TiltCards) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {loadingProducts
                  ? // Lightweight shimmer skeletons (products-page pattern)
                    // reserving the grid's space until the fetch lands.
                    Array.from({ length: 4 }, (_, i) => (
                      <div
                        key={`featured-skeleton-${i}`}
                        aria-hidden="true"
                        className="overflow-hidden rounded-lg border border-white/10 bg-black/60"
                      >
                        <div className="shimmer aspect-square w-full" />
                        <div className="space-y-2 p-3 sm:p-4">
                          <div className="shimmer h-4 w-2/3 rounded-full" />
                          <div className="shimmer h-3 w-1/3 rounded-full" />
                        </div>
                      </div>
                    ))
                  : products.map((product, i) => {
                  const name = localizedName(product, locale)
                  const firstImage = product.images[0]
                  const isOutOfStock = product.stock === 0
                  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

                  return (
                    <Reveal key={product.id} delay={(i % 4) * 0.08} className="h-full">
                      <TiltCard className="h-full rounded-lg" max={6}>
                        <button
                          onClick={() => navigate('/your-birthday/products')}
                          className="group glow-border card-lift block h-full w-full rounded-lg overflow-hidden border border-white/10 hover:border-[var(--c-birthday-gold)]/40 transition-colors duration-300 backdrop-blur-md text-start cursor-pointer"
                          style={{
                            background: 'rgba(10, 8, 16, 0.75)',
                            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.7)',
                          }}
                        >
                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-black/60">
                        {firstImage ? (
                          <Image
                            src={firstImage}
                            alt={name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">
                            {t('common.noImage')}
                          </div>
                        )}

                        {/* Out of stock overlay — high contrast for a11y */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-full bg-white/95 text-black text-xs font-semibold">
                              {t('products.outOfStock')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info — light text on dark card */}
                      <div className="p-3 sm:p-4 space-y-2">
                        <h3
                          className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug"
                          style={{
                            fontFamily: isRTL
                              ? 'var(--font-birthday-arabic)'
                              : 'var(--font-birthday-sub)',
                          }}
                        >
                          {name}
                        </h3>

                        {/* Price — birthday gold for emphasis */}
                        <div className="flex items-end justify-between gap-2 pt-1">
                          <div>
                            <p
                              className={`text-[0.625rem] text-white/55${
                                isRTL ? '' : ' uppercase tracking-wider'
                              }`}
                            >
                              {t('yourBirthday.featuredProducts.perDay')}
                            </p>
                            <p className="text-sm sm:text-lg font-bold" style={{ color: '#FFCC00' }}>
                              {formatKwd(product.rentalPricePerDay)}
                            </p>
                          </div>
                          <span
                            aria-hidden="true"
                            className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                            style={{
                              background:
                                'linear-gradient(135deg, var(--c-birthday-gold), var(--c-birthday-gold-light))',
                              color: '#020204',
                            }}
                          >
                            <ArrowIcon className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                        </button>
                      </TiltCard>
                    </Reveal>
                  )
                })}
              </div>

              {/* View All button — birthday gold gradient (upgrade: magnetic) */}
              <div className="mt-12 flex justify-center">
                <Reveal>
                  <MagneticButton
                    onClick={() => navigate('/your-birthday/products')}
                    ariaLabel={t('yourBirthday.featuredProducts.viewAll')}
                    className={`px-8 py-3.5 font-bold text-primary-foreground shadow-[0_0_25px_rgba(245,185,20,0.4)] bg-[linear-gradient(135deg,var(--c-birthday-gold),var(--c-birthday-gold-light))] ${
                      isRTL
                        ? '[font-family:var(--font-birthday-arabic)]'
                        : '[font-family:var(--font-birthday-sub)]'
                    }`}
                  >
                    {t('yourBirthday.featuredProducts.viewAll')}
                    {isRTL ? (
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    )}
                  </MagneticButton>
                </Reveal>
              </div>
            </div>
          </section>
        )}

        {/* === GALLERY SECTION === */}
        <section className="relative z-10 py-24 bg-transparent">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionHeading
              eyebrow={t('yourBirthday.nav.brand')}
              title={t('yourBirthday.gallery.title')}
              subtitle={t('yourBirthday.gallery.subtitle')}
              light
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {GALLERY.map((item) => {
                const label = galleryItems[item.n - 1] ?? ''
                return (
                  <div
                    key={item.n}
                    className="aspect-square rounded-lg overflow-hidden group relative border border-white/5 shadow-lg"
                  >
                    {/* Product image */}
                    <Image
                      src={item.img}
                      alt={label}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    {/* Decorative gradient overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${item.grad} opacity-20 group-hover:opacity-40 transition-opacity duration-500 mix-blend-overlay`}
                    />

                    {/* Geometric outline decoration */}
                    <div className="absolute inset-4 border border-white/20 group-hover:border-white/40 rounded-md transition-colors duration-500 flex flex-col justify-end p-4">
                      <span className="text-xs font-mono text-white/60 tracking-widest uppercase">
                        {t('yourBirthday.gallery.expPrefix')}
                        {item.n}
                      </span>
                      <h4
                        className={`text-base font-bold text-white${
                          isRTL ? '' : ' tracking-wide'
                        } mt-1 translate-y-2 group-hover:translate-y-0 transition-transform duration-300`}
                      >
                        {label}
                      </h4>
                    </div>

                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* === TESTIMONIALS (upgrade layer) — auto-rotating carousel over a
            soft dark veil that blends with the 3D scene and keeps the light
            glass panel readable even when WebGL is unavailable === */}
        <div
          className="relative z-10"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,4,20,0) 0%, rgba(10,4,20,0.55) 15%, rgba(10,4,20,0.55) 85%, rgba(10,4,20,0) 100%)',
          }}
        >
          <TestimonialsSection
            title={t('yourBirthday.testimonials.title')}
            subtitle={t('yourBirthday.testimonials.subtitle')}
            items={testimonials}
            accent="#F5B914"
            light
          />
        </div>

        {/* === CTA SECTION === */}
        <section className="relative z-10 py-24 bg-gradient-to-b from-transparent to-transparent">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <Reveal>
            <div
              className="p-8 sm:p-14 rounded-lg border border-white/10 backdrop-blur-md relative overflow-hidden shadow-2xl"
              style={{
                background:
                  'linear-gradient(135deg, rgba(245, 185, 20, 0.08), rgba(255, 209, 71, 0.08), rgba(201, 149, 14, 0.08))',
              }}
            >
              {/* Pulsing neon circles in background */}
              <div className="absolute -start-20 -bottom-20 w-60 h-60 rounded-full bg-[var(--c-birthday-gold)] opacity-10 blur-[80px]" />
              <div className="absolute -end-20 -top-20 w-60 h-60 rounded-full bg-[var(--c-birthday-gold-light)] opacity-10 blur-[80px]" />

              <h2
                className={`text-3xl md:text-5xl font-black mb-4${
                  isRTL ? '' : ' uppercase tracking-wider'
                }`}
                style={{
                  fontFamily: isRTL
                    ? 'var(--font-birthday-arabic)'
                    : 'var(--font-birthday-headline)',
                  background:
                    'linear-gradient(135deg, var(--c-birthday-gold), var(--c-birthday-gold-light), var(--c-birthday-gold-dark))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('yourBirthday.cta.title')}
              </h2>
              <p className="text-white/75 mb-8 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                {t('yourBirthday.cta.subtitle')}
              </p>
              <MagneticButton
                onClick={() => openBooking(t('yourBirthday.booking.bookEvent'))}
                ariaLabel={t('yourBirthday.cta.button')}
                className={`px-10 py-4 text-lg font-bold text-primary-foreground shadow-[0_0_30px_rgba(255,209,71,0.3)] bg-[linear-gradient(135deg,var(--c-birthday-gold),var(--c-birthday-gold-light))] ${
                  isRTL
                    ? '[font-family:var(--font-birthday-arabic)]'
                    : '[font-family:var(--font-birthday-sub)]'
                }`}
              >
                {t('yourBirthday.cta.button')}
              </MagneticButton>
            </div>
            </Reveal>
          </div>
        </section>
      </div>

      {/* === BOOKING DIALOG (shared Radix modal with focus trap) === */}
      <BookingModal open={bookingOpen} onOpenChange={setBookingOpen} selectedPackage={bookingPackage} />
    </>
  )
}
