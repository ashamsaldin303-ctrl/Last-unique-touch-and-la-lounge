'use client'

/**
 * LA LOUNGE — Custom Furniture Manufacturing (route /la-lounge/custom-furniture).
 *
 * Reproduces the original repo page (header / 5-step process / 6 example
 * pieces / CTA → contact) and develops it: numbered magenta timeline nodes
 * connected by animated lines that scale in on reveal, staggered glass cards,
 * hover-lift product gallery with product photography from /products.
 */

import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  PencilRuler,
  Layers,
  Hammer,
  ShieldCheck,
  Truck,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { Reveal } from '@/components/shared/reveal'
import { PageHeader } from '@/components/shared/page-header'
import { SectionHeading, TiltCard, MagneticButton } from '@/components/shared/upgrade'

export default function LaLoungeCustomFurniturePage() {
  const { t, locale, dir } = useI18n()
  const { navigate } = useRouter()
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  const steps: Array<{ icon: LucideIcon; title: string; desc: string }> = [
    { icon: PencilRuler, title: t('laLoungeCustomFurniture.steps.s1.title'), desc: t('laLoungeCustomFurniture.steps.s1.desc') },
    { icon: Layers, title: t('laLoungeCustomFurniture.steps.s2.title'), desc: t('laLoungeCustomFurniture.steps.s2.desc') },
    { icon: Hammer, title: t('laLoungeCustomFurniture.steps.s3.title'), desc: t('laLoungeCustomFurniture.steps.s3.desc') },
    { icon: ShieldCheck, title: t('laLoungeCustomFurniture.steps.s4.title'), desc: t('laLoungeCustomFurniture.steps.s4.desc') },
    { icon: Truck, title: t('laLoungeCustomFurniture.steps.s5.title'), desc: t('laLoungeCustomFurniture.steps.s5.desc') },
  ]

  const examples = [
    { src: '/products/bombon-chair-velvet.png', name: t('laLoungeCustomFurniture.examples.items.i1.name'), desc: t('laLoungeCustomFurniture.examples.items.i1.desc') },
    { src: '/products/marble-coffee-table.png', name: t('laLoungeCustomFurniture.examples.items.i2.name'), desc: t('laLoungeCustomFurniture.examples.items.i2.desc') },
    { src: '/products/louis-ghost-chair.png', name: t('laLoungeCustomFurniture.examples.items.i3.name'), desc: t('laLoungeCustomFurniture.examples.items.i3.desc') },
    { src: '/products/gold-side-table.png', name: t('laLoungeCustomFurniture.examples.items.i4.name'), desc: t('laLoungeCustomFurniture.examples.items.i4.desc') },
    { src: '/products/dining-table-12-seater.png', name: t('laLoungeCustomFurniture.examples.items.i5.name'), desc: t('laLoungeCustomFurniture.examples.items.i5.desc') },
    { src: '/products/crystal-chandelier.png', name: t('laLoungeCustomFurniture.examples.items.i6.name'), desc: t('laLoungeCustomFurniture.examples.items.i6.desc') },
  ]

  const originStart = dir === 'rtl' ? 'right center' : 'left center'

  return (
    <div className="flex-1 bg-background text-foreground">
      {/* ============ Header ============ */}
      <section className="relative overflow-hidden pt-28 sm:pt-32 pb-4 px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 0%, rgba(230,0,126,0.18) 0%, transparent 70%)',
          }}
        />
        <PageHeader
          eyebrow={t('laLoungeCustomFurniture.eyebrow')}
          title={t('laLoungeCustomFurniture.title')}
          subtitle={t('laLoungeCustomFurniture.subtitle')}
        />
      </section>

      {/* ============ Process — 5-step magenta timeline ============ */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="✦"
            title={t('laLoungeCustomFurniture.process.title')}
            subtitle={t('laLoungeCustomFurniture.process.subtitle')}
            className="mb-12 sm:mb-16"
          />

          <div className="relative">
            {/* Connecting line — horizontal on desktop */}
            <motion.div
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              style={{ transformOrigin: originStart }}
              className="hidden lg:block absolute top-7 inset-x-[9%] h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            />
            {/* Connecting line — vertical on mobile/tablet */}
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
                    {/* Numbered magenta node */}
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 220, damping: 15 }}
                      whileHover={{ scale: 1.1 }}
                      className="relative z-10 shrink-0 flex size-14 items-center justify-center rounded-full border border-primary/50 bg-[#1c0c16] shadow-[0_0_24px_-4px_rgba(230,0,126,0.55)]"
                    >
                      <span className="font-display text-lg font-semibold text-primary">{i + 1}</span>
                      <span aria-hidden="true" className="absolute inset-0 rounded-full border border-primary/20 animate-pulse-ring" />
                    </motion.div>

                    {/* Step card */}
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

      {/* ============ Examples gallery ============ */}
      <section className="py-16 sm:py-20 px-4 border-t border-primary/10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="✦"
            title={t('laLoungeCustomFurniture.examples.title')}
            subtitle={t('laLoungeCustomFurniture.examples.subtitle')}
            className="mb-12 sm:mb-16"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {examples.map((item, i) => (
              <Reveal key={i} delay={(i % 3) * 0.12} className="h-full">
                <TiltCard className="h-full rounded-2xl" max={6}>
                  <article className="glow-border glass-card lux-card group h-full rounded-2xl overflow-hidden flex flex-col">
                    {/* Piece photograph on a drafting-board backdrop */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#120911]">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 opacity-40"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(230,0,126,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(230,0,126,0.06) 1px, transparent 1px)',
                          backgroundSize: '28px 28px',
                        }}
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{
                          background: 'radial-gradient(ellipse 70% 70% at 50% 60%, rgba(230,0,126,0.10) 0%, transparent 65%)',
                        }}
                      />
                      {/* Photograph mounted on an ivory plate — the product
                          assets ship with white backgrounds, so a light
                          plate makes them read as framed catalog photos on
                          the dark drafting board instead of raw rectangles. */}
                      <div className="absolute inset-2.5 sm:inset-3 rounded-xl bg-[#F7F3EC] overflow-hidden shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]">
                        <Image
                          src={item.src}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-contain p-4 sm:p-5 transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      {/* Magenta hairline along the top of the image */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(230,0,126,0.7), transparent)' }}
                      />
                      {/* Corner tick — blueprint monogram (dark chip so it
                          stays legible over the ivory photo plate) */}
                      <span
                        aria-hidden="true"
                        className="absolute bottom-4 start-4 rounded bg-[#120911]/85 px-1.5 py-0.5 font-display text-xs tracking-widest text-primary/80"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col gap-2">
                      <h3 className="font-display text-lg text-primary">{item.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </article>
                </TiltCard>
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
            className="bg-primary text-primary-foreground hover:bg-primary/90 tracking-wide min-h-12 shadow-[0_12px_40px_-8px_rgba(230,0,126,0.35)]"
            ariaLabel={t('laLoungeCustomFurniture.ctaButton')}
          >
            {t('laLoungeCustomFurniture.ctaButton')}
            <ArrowIcon className="size-4" aria-hidden="true" />
          </MagneticButton>
        </Reveal>
      </section>
    </div>
  )
}
