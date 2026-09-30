'use client'

/**
 * LAST UNIQUE TOUCH — brand landing page (route /last-unique-touch).
 *
 * Faithful restoration of the original repo's last-unique-touch-view.tsx:
 * a fixed full-screen cinematic 3D background (infinite golden helix tunnel
 * filled with procedural luxury furniture, glowing dust, ACES tone mapping +
 * UnrealBloom, two-phase camera: hyperspace dive → drone sway) rendered
 * behind a centered hero, the LUT arabesque signature ornaments, the three
 * service cards, and the stats row — all on transparent backgrounds so the
 * 3D tunnel remains visible through the whole page.
 *
 * UPGRADE LAYER (visible polish — structure & the 3D tunnel untouched):
 * magnetic hero CTA · tilt + glow service cards with icon rings · animated
 * count-up stats · live "Collection" strip (real products from the API in a
 * snap scroller with shimmer skeletons / error retry) · 3-step process with
 * drawn connector · auto-rotating testimonials.
 */

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarRange,
  Eye,
  MousePointerClick,
  PackageCheck,
  Sofa,
  Truck,
} from 'lucide-react'
import { LutArabesque } from '@/components/brand/lut-arabesque'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Reveal } from '@/components/shared/reveal'
import {
  SectionHeading,
  StatsBand,
  ProcessSteps,
  TestimonialsSection,
  TiltCard,
  MagneticButton,
  StaggerGroup,
  type StatItem,
  type ProcessStep,
  type TestimonialItem,
} from '@/components/shared/upgrade'
import { useRouter } from '@/lib/router'
import { useI18n } from '@/lib/i18n'
import { formatKwd, localizedName, type ProductDTO } from '@/lib/products'

// Lazy-load the 3D background so the page's initial JS bundle stays small.
const Lut3DBackground = dynamic(() => import('@/components/3d/lut-3d-background'), {
  ssr: false,
  loading: () => null,
})

/** Collection strip fetch states. */
type CollectionStatus = 'loading' | 'ready' | 'error'

/**
 * `images` is documented as a JSON array string in the API contract; the
 * endpoint normally pre-parses it, but both shapes are accepted defensively.
 */
function firstImage(images: unknown): string | null {
  let list = images
  if (typeof images === 'string') {
    try {
      list = JSON.parse(images)
    } catch {
      return null
    }
  }
  if (!Array.isArray(list)) return null
  const first = list[0]
  return typeof first === 'string' && first.length > 0 ? first : null
}

export default function LutPage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()

  const services = [
    { icon: Sofa, title: t('lut.services.rental.title'), desc: t('lut.services.rental.desc') },
    { icon: Truck, title: t('lut.services.delivery.title'), desc: t('lut.services.delivery.desc') },
    {
      icon: CalendarRange,
      title: t('lut.services.flexible.title'),
      desc: t('lut.services.flexible.desc'),
    },
  ]

  const stats: StatItem[] = [
    { value: 500, suffix: '+', label: t('lut.stats.items') },
    { value: 2000, suffix: '+', label: t('lut.stats.events') },
    { value: 5, label: t('lut.stats.years') },
  ]

  const processSteps: ProcessStep[] = [
    { title: t('lut.process.step1.title'), desc: t('lut.process.step1.desc'), icon: MousePointerClick },
    { title: t('lut.process.step2.title'), desc: t('lut.process.step2.desc'), icon: CalendarRange },
    { title: t('lut.process.step3.title'), desc: t('lut.process.step3.desc'), icon: PackageCheck },
  ]

  const testimonials: TestimonialItem[] = [
    {
      name: t('lut.testimonials.item1.name'),
      role: t('lut.testimonials.item1.role'),
      text: t('lut.testimonials.item1.text'),
    },
    {
      name: t('lut.testimonials.item2.name'),
      role: t('lut.testimonials.item2.role'),
      text: t('lut.testimonials.item2.text'),
    },
    {
      name: t('lut.testimonials.item3.name'),
      role: t('lut.testimonials.item3.role'),
      text: t('lut.testimonials.item3.text'),
    },
  ]

  /* Live "Collection" strip — real LUT products from the products API. */
  const [collection, setCollection] = useState<ProductDTO[]>([])
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>('loading')
  const [collectionReload, setCollectionReload] = useState(0)

  useEffect(() => {
    let active = true
    fetch('/api/products?brand=LUT&limit=8')
      .then(async (res) => {
        if (!res.ok) throw new Error(`products request failed: ${res.status}`)
        const data = (await res.json()) as { products?: ProductDTO[] }
        if (!active) return
        setCollection(Array.isArray(data.products) ? data.products.slice(0, 8) : [])
        setCollectionStatus('ready')
      })
      .catch(() => {
        if (active) setCollectionStatus('error')
      })
    return () => {
      active = false
    }
  }, [collectionReload])

  const retryCollection = () => {
    setCollectionStatus('loading')
    setCollectionReload((key) => key + 1)
  }

  // CTA arrow follows the reading direction (AR → RTL → points left).
  const ArrowCta = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <section className="relative w-full bg-transparent">
      {/* C4: Full-screen fixed cinematic 3D background — golden helix tunnel
          + procedural luxury furniture, ACES tone mapping, UnrealBloom, and a
          two-phase camera (hyperspace dive → drone sway). Wrapped in
          ErrorBoundary so a WebGL failure degrades gracefully to nothing
          instead of unmounting the page. */}
      <ErrorBoundary>
        <Lut3DBackground />
      </ErrorBoundary>

      {/* === Hero section — title centered, 3D furniture background === */}
      <div className="relative min-h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-center">
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 30% 20%, rgba(230, 33, 41, 0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 70% 80%, rgba(230, 33, 41, 0.08) 0%, transparent 50%)',
          }}
        />

        {/* LUT arabesque — faint background pattern (signature ornament) */}
        <LutArabesque
          variant="bg"
          className="pointer-events-none absolute inset-0 z-[2] h-full w-full opacity-60"
        />

        {/* Centered title */}
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          <div
            className="animate-hero-down flex items-center justify-center gap-2 sm:gap-3 mb-3"
            style={{ animationDelay: '0.2s', textShadow: '0 1px 10px rgba(10,9,8,0.5)' }}
          >
            <span className="w-6 sm:w-8 h-px bg-gold/50" />
            <span className="eyebrow text-gold/80 text-[10px] sm:text-xs">
              {t('lut.eyebrow')}
            </span>
            <span className="w-6 sm:w-8 h-px bg-gold/50" />
          </div>

          <h1
            className="animate-hero-down font-display text-4xl sm:text-6xl md:text-7xl text-paper mb-4 relative z-30"
            style={{ animationDelay: '0.3s', textShadow: '0 2px 30px rgba(0,0,0,0.8)' }}
          >
            {t('brandSelector.lut.name')}
          </h1>

          <p
            className="animate-hero-in text-sm sm:text-base text-paper/70 max-w-md mb-8"
            style={{
              animationDelay: '0.5s',
              textShadow: '0 1px 12px rgba(10,9,8,0.55), 0 0 2px rgba(10,9,8,0.4)',
            }}
          >
            {t('lut.subtitle')}
          </p>

          {/* Products button — magnetic hover + gold shine sweep (upgrade) */}
          <div className="animate-hero-up" style={{ animationDelay: '0.7s' }}>
            <MagneticButton
              onClick={() => navigate('/products')}
              ariaLabel={t('lut.productsButton')}
              className="bg-lut hover:bg-lut/90 text-primary-foreground px-10 shadow-[0_4px_20px_rgba(230,33,41,0.3)]"
            >
              {t('lut.productsButton')}
            </MagneticButton>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="animate-hero-in absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-paper/60"
          style={{ animationDelay: '1.5s' }}
        >
          <ArrowDown className="w-5 h-5 animate-bounce" aria-hidden="true" />
        </div>
      </div>

      {/* === Services section — revealed on scroll === */}
      <div className="relative z-10 py-20 px-4 bg-transparent">
        <div className="max-w-5xl mx-auto">
          {/* LUT arabesque divider — signature ornament between sections */}
          <LutArabesque variant="divider" className="w-full max-w-md mx-auto mb-12" />

          <SectionHeading title={t('lut.servicesTitle')} light />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((service, i) => {
              const Icon = service.icon
              return (
                <Reveal key={service.title} delay={i * 0.12}>
                  <TiltCard className="h-full rounded-lg">
                    <div className="glow-border card-lift glass-panel h-full rounded-lg p-8 text-center">
                      <div className="icon-ring w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-5 transition-transform duration-500 hover:rotate-6 hover:scale-110">
                        <Icon className="w-7 h-7 text-gold" strokeWidth={1.6} aria-hidden="true" />
                      </div>
                      <h3 className="font-display text-xl text-paper mb-3">{service.title}</h3>
                      <p className="text-sm text-paper/70 leading-relaxed">{service.desc}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              )
            })}
          </div>

          {/* Stats — animated count-up band (upgrade) */}
          <StatsBand light stats={stats} className="mt-16" />
        </div>
      </div>

      {/* === Collection strip (upgrade) — real products from the API in a
          horizontal snap scroller, still transparent above the 3D tunnel === */}
      <section className="relative z-10 py-16 sm:py-20 px-4 bg-transparent">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            title={t('lut.collection.title')}
            subtitle={t('lut.collection.subtitle')}
            light
          />

          {collectionStatus === 'loading' && (
            <div className="snap-strip" role="status">
              <span className="sr-only">{t('common.loading')}</span>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[240px] sm:w-[264px] shrink-0 rounded-xl overflow-hidden border border-white/10"
                  aria-hidden="true"
                >
                  <div
                    className="shimmer aspect-[4/3]"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0.05) 75%)',
                      backgroundSize: '200% 100%',
                    }}
                  />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 rounded-full bg-white/10" />
                    <div className="h-5 w-20 rounded-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {collectionStatus === 'error' && (
            <div className="glass-panel rounded-xl p-8 text-center max-w-md mx-auto">
              <AlertCircle
                className="w-8 h-8 text-gold mx-auto mb-4 opacity-80"
                aria-hidden="true"
              />
              <p className="text-sm text-paper/80 mb-6">{t('common.error')}</p>
              <button
                type="button"
                onClick={retryCollection}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-8 text-sm font-medium text-gold transition-colors hover:bg-gold/20 cursor-pointer"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {collectionStatus === 'ready' && collection.length === 0 && (
            <p className="text-center text-sm text-paper/70">{t('lut.collection.empty')}</p>
          )}

          {collectionStatus === 'ready' && collection.length > 0 && (
            <>
              <StaggerGroup className="snap-strip" fullCells={false}>
                {collection.map((product) => {
                  const name = localizedName(product, locale)
                  const img = firstImage(product.images)
                  const outOfStock = product.stock === 0
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => navigate(`/products/${product.slug}`)}
                      aria-label={name}
                      className="glow-border card-lift glass-panel group relative w-[240px] sm:w-[264px] shrink-0 rounded-xl overflow-hidden text-start cursor-pointer"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
                        {img ? (
                          <Image
                            src={img}
                            alt={name}
                            fill
                            sizes="264px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-paper/40">
                            {t('common.noImage')}
                          </div>
                        )}

                        {/* Quick-view affordance (rises on hover) */}
                        <div className="veil-quick" aria-hidden="true">
                          <Eye className="size-4" />
                          <span>{t('products.viewDetails')}</span>
                        </div>

                        {/* 3D viewer badge — gold seal */}
                        {product.model3dUrl && (
                          <span className="seal-gold absolute top-2 end-2 z-[4] rounded-full px-2.5 py-1 text-[0.625rem] font-semibold">
                            <Box className="size-3" aria-hidden="true" />
                            {t('products.badge3d')}
                          </span>
                        )}

                        {/* Out of stock — frosted veil with gold-ringed pill */}
                        {outOfStock && (
                          <div className="stock-veil">
                            <span>{t('products.outOfStock')}</span>
                          </div>
                        )}
                      </div>

                      <div className="relative p-4">
                        <h3 className="font-display text-base text-paper line-clamp-1">{name}</h3>
                        <p className="mt-2 flex items-baseline gap-1.5">
                          <span className="price-pop font-display text-lg text-gold tabular-nums">
                            {formatKwd(product.rentalPricePerDay)}
                          </span>
                          <span className="text-[0.625rem] tracking-wide text-paper/50">
                            {t('lut.collection.perDay')}
                          </span>
                        </p>
                      </div>

                      {/* Gold hairline — draws across the bottom edge on hover */}
                      <span className="card-hairline" aria-hidden="true" />
                    </button>
                  )
                })}
              </StaggerGroup>

              {/* View all — magnetic button below the strip */}
              <div className="mt-8 flex justify-center">
                <MagneticButton
                  onClick={() => navigate('/products')}
                  ariaLabel={t('lut.collection.viewAll')}
                  className="bg-lut hover:bg-lut/90 text-primary-foreground"
                >
                  {t('lut.collection.viewAll')}
                  <ArrowCta className="w-4 h-4" aria-hidden="true" />
                </MagneticButton>
              </div>
            </>
          )}
        </div>
      </section>

      {/* === Process — 3 steps with drawn connector (upgrade) === */}
      <div className="relative z-10 bg-transparent">
        <LutArabesque variant="divider" className="w-full max-w-md mx-auto" />
      </div>
      <ProcessSteps
        eyebrow={t('lut.process.eyebrow')}
        title={t('lut.process.title')}
        steps={processSteps}
        light
        className="relative z-10"
      />

      {/* === Testimonials — auto-rotating, gold accent (upgrade) === */}
      <div className="relative z-10 bg-transparent">
        <LutArabesque variant="divider" className="w-full max-w-md mx-auto" />
      </div>
      <div className="relative z-10">
        <TestimonialsSection
          title={t('lut.testimonials.title')}
          subtitle={t('lut.testimonials.subtitle')}
          items={testimonials}
          light
          accent="var(--color-gold)"
        />
      </div>
    </section>
  )
}
