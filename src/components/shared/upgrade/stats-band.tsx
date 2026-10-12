'use client'

/**
 * StatsBand — a row of animated count-up stats with gold (or custom accent)
 * numerals and eyebrow labels. Counts start when the band scrolls into view.
 * Light variant renders over the dark 3D backgrounds.
 *
 * Task 44 motion upgrades (site-wide, 4 brands at once):
 *  - each numeral wears ShimmerText: a champagne gloss sweeps across the
 *    digits once as they settle (light over ink — Arabic-digit-safe)
 *  - a hairline draws under each stat (HairlineDraw)
 */

import { AnimatedCounter } from './animated-counter'
import { Reveal } from '@/components/shared/reveal'
import { ShimmerText } from '@/components/fx/shimmer-text'
import { HairlineDraw } from '@/components/fx/kinetic-heading'
import { cn } from '@/lib/utils'

export interface StatItem {
  /** Numeric part */
  value: number
  suffix?: string
  label: string
}

interface StatsBandProps {
  stats: StatItem[]
  light?: boolean
  accent?: string
  className?: string
}

export function StatsBand({ stats, light = false, accent, className }: StatsBandProps) {
  const accentHex = accent ?? 'var(--color-primary)'
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-center gap-8 sm:gap-16',
        className
      )}
    >
      {stats.map((stat, i) => (
        <Reveal key={`${stat.label}-${i}`} delay={i * 0.12} className="text-center">
          <div
            className="font-display text-3xl sm:text-5xl"
            style={{ color: accentHex }}
          >
            <ShimmerText auto>
              <AnimatedCounter value={stat.value} suffix={stat.suffix ?? ''} />
            </ShimmerText>
          </div>
          {/* the settling hairline — draws itself under the numeral */}
          <HairlineDraw
            className={cn('mx-auto mt-2 h-px w-12', light ? 'bg-paper/40' : 'bg-primary/40')}
            delay={0.2 + i * 0.12}
          />
          <div
            className={cn(
              'eyebrow mt-1.5 text-[9px] sm:text-[11px]',
              light ? 'text-paper/70' : 'text-muted-foreground'
            )}
          >
            {stat.label}
          </div>
        </Reveal>
      ))}
    </div>
  )
}
