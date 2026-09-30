'use client'

/**
 * YOUR BIRTHDAY — features/services page (route /your-birthday/features).
 *
 * Faithful restoration of the original repo's features-view.tsx:
 * the fixed BirthdayVisualizer 3D scene (spinning vinyls, speakers,
 * equalizer bars, stage lights, dance-floor tiles, particles — vanilla
 * Three.js with Bloom) behind a dark gradient overlay, a glass back button,
 * the gold-gradient title, 6 service cards in dark glass with circular
 * icon frames (signature Birthday ornament), and the bookNow CTA that
 * opens the shared booking modal.
 *
 * UPGRADE LAYER (visible polish — 3D scene & structure untouched): TiltCards
 * + glow-border/card-lift on service cards, icon-ring pulse on the circular
 * gold-ringed frames, and a magnetic gold bookNow button (same modal).
 */

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { BookingModal } from '@/components/birthday/booking-modal'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Reveal } from '@/components/shared/reveal'
import { TiltCard, MagneticButton } from '@/components/shared/upgrade'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import arMessages from '@/messages/ar.json'
import enMessages from '@/messages/en.json'

// Lazy-load the 3D visualizer so Three.js stays out of the initial bundle.
// (Named export — resolve it from the module before handing it to dynamic().)
const BirthdayVisualizer = dynamic(
  () => import('@/components/3d/birthday-visualizer').then((m) => m.BirthdayVisualizer),
  {
    ssr: false,
    loading: () => null,
  }
)

interface ServiceEntry {
  title: string
  desc: string
}

/** Decorative icon + accent per tile — mirrors the original SERVICE_DECOR. */
const SERVICE_DECOR: Array<{ icon: string; color: string }> = [
  { icon: '🎂', color: 'var(--c-birthday-gold)' },
  { icon: '🎭', color: 'var(--c-birthday-gold-light)' },
  { icon: '🎈', color: 'var(--c-birthday-gold-dark)' },
  { icon: '🎵', color: 'var(--c-birthday-orange)' },
  { icon: '💡', color: 'var(--c-birthday)' },
  { icon: '📸', color: '#FFD147' },
]

export default function BirthdayFeaturesPage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft

  const [bookingOpen, setBookingOpen] = useState(false)

  const services = useMemo<Array<ServiceEntry>>(
    () =>
      (locale === 'ar'
        ? arMessages.yourBirthday.features.services
        : enMessages.yourBirthday.features.services) as ServiceEntry[],
    [locale]
  )

  return (
    <>
      <div className="relative w-full min-h-[100dvh] bg-transparent overflow-hidden">
        {/* 3D Background — club-style celebration visualizer */}
        <ErrorBoundary>
          <BirthdayVisualizer />
        </ErrorBoundary>

        {/* Gradient overlay — original dark wash over the 3D scene */}
        <div className="absolute inset-0 z-1 bg-gradient-to-t from-[var(--c-birthday-bg)] via-[var(--c-birthday-bg)]/80 to-[var(--c-birthday-bg)]/50 pointer-events-none" />

        {/* Back button */}
        <div className="absolute top-6 sm:top-10 start-6 sm:start-10 z-20">
          <button
            onClick={() => navigate('/your-birthday')}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-colors font-medium text-xs cursor-pointer"
          >
            <ArrowIcon className="w-4 h-4" />
            <span>{t('yourBirthday.features.back')}</span>
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 py-20 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Title */}
            <div className="text-center mb-16">
              <h2
                className="text-3xl md:text-5xl font-black uppercase tracking-wider mb-4"
                style={{
                  fontFamily: isRTL
                    ? 'var(--font-birthday-arabic), Cairo, sans-serif'
                    : 'var(--font-birthday-headline), Orbitron, sans-serif',
                  background:
                    'linear-gradient(135deg, var(--c-birthday-gold), var(--c-birthday-gold-light), var(--c-birthday-gold-dark))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('yourBirthday.features.title')}
              </h2>
              <p className="text-sm text-white/50 max-w-xl mx-auto">
                {t('yourBirthday.features.subtitle')}
              </p>
              <div className="w-24 h-1 bg-gradient-to-r from-[var(--c-birthday-gold)] via-[var(--c-birthday-gold-light)] to-[var(--c-birthday-gold-dark)] mx-auto rounded-full mt-6" />
            </div>

            {/* Services grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, i) => (
                <Reveal key={i} delay={(i % 3) * 0.1} className="h-full">
                  <TiltCard className="h-full rounded-lg" max={6}>
                    <div
                      className="group glow-border card-lift relative p-8 rounded-lg bg-[var(--c-birthday-card)]/80 border border-white/5 hover:border-white/15 transition-colors duration-500 backdrop-blur-md overflow-hidden"
                    >
                  <div
                    className="absolute -top-12 -end-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{
                      background: SERVICE_DECOR[i]?.color ?? 'var(--c-birthday-gold)',
                    }}
                  />
                  <div className="relative z-10">
                    {/* Birthday circular frame — signature ornament around each service icon */}
                    <div
                      className="icon-ring relative size-20 rounded-full border-4 border-deep-purple bg-gold/10 flex items-center justify-center mx-auto mb-5 transition-transform duration-500 group-hover:rotate-3"
                      style={{
                        boxShadow: `0 0 0 1px color-mix(in srgb, ${SERVICE_DECOR[i]?.color ?? 'var(--c-birthday-gold)'} 22%, transparent), 0 4px 16px rgba(75, 24, 88, 0.25)`,
                      }}
                    >
                      {/* Inner gold ring — matches BirthdayCircularFrame aesthetic */}
                      <span
                        className="pointer-events-none absolute inset-1 rounded-full border"
                        style={{ borderColor: 'rgba(245, 185, 20, 0.4)' }}
                      />
                      <span className="text-4xl leading-none" aria-hidden="true">
                        {SERVICE_DECOR[i]?.icon ?? '🎈'}
                      </span>
                    </div>
                    <h3
                      className="text-xl font-bold mb-3"
                      style={{
                        color: SERVICE_DECOR[i]?.color ?? 'var(--c-birthday-gold)',
                        fontFamily: isRTL
                          ? 'var(--font-birthday-arabic), Cairo'
                          : 'var(--font-birthday-sub), Rajdhani',
                      }}
                    >
                      {service.title}
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">{service.desc}</p>
                  </div>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>

            {/* CTA (upgrade: magnetic gold button — still opens the booking modal) */}
            <div className="text-center mt-16">
              <Reveal>
                <MagneticButton
                  onClick={() => setBookingOpen(true)}
                  ariaLabel={t('yourBirthday.features.bookNow')}
                  className={`px-10 py-4 font-bold text-primary-foreground shadow-[0_0_25px_rgba(245,185,20,0.4)] bg-[linear-gradient(135deg,var(--c-birthday-gold),var(--c-birthday-gold-light))] ${
                    isRTL
                      ? '[font-family:var(--font-birthday-arabic)]'
                      : '[font-family:var(--font-birthday-sub)]'
                  }`}
                >
                  {t('yourBirthday.features.bookNow')}
                </MagneticButton>
              </Reveal>
            </div>
          </div>
        </div>
      </div>

      {/* === BOOKING DIALOG (shared Radix modal) === */}
      <BookingModal open={bookingOpen} onOpenChange={setBookingOpen} />
    </>
  )
}
