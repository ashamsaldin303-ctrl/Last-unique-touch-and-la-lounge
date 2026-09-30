'use client'

/**
 * TrustBadges — product page assurance row (product.trustBadges.*):
 * delivery, insurance, deposit refund, curated quality.
 * CATALOG LAYER: gold-edge glass cards that rise + draw their top
 * gold hairline on hover, with icon-ring pulses.
 */

import { Truck, ShieldCheck, RotateCcw, Award } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { Reveal } from '@/components/shared/reveal'

export function TrustBadges() {
  const { t } = useI18n()

  const badges = [
    { icon: Truck, label: t('product.trustBadges.delivery') },
    { icon: ShieldCheck, label: t('product.trustBadges.insurance') },
    { icon: RotateCcw, label: t('product.trustBadges.refund') },
    { icon: Award, label: t('product.trustBadges.quality') },
  ]

  return (
    <section className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {badges.map((badge, idx) => {
        const Icon = badge.icon
        return (
          <Reveal key={badge.label} delay={idx * 0.07}>
            <div className="trust-edge group/trust glass-card flex h-full items-center gap-3 rounded-md p-4 transition-transform duration-300">
              <div
                className="icon-ring flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/5 transition-colors duration-300 group-hover/trust:border-gold/50"
                aria-hidden="true"
              >
                <Icon className="size-5 text-gold" />
              </div>
              <span className="text-xs font-medium leading-tight text-foreground">
                {badge.label}
              </span>
            </div>
          </Reveal>
        )
      })}
    </section>
  )
}
