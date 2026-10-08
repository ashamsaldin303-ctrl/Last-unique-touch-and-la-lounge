'use client'

/**
 * StatsBand — a row of animated count-up stats with gold (or custom accent)
 * numerals and eyebrow labels. Counts start when the band scrolls into view.
 * Light variant renders over the dark 3D backgrounds.
 */

import { AnimatedCounter } from './animated-counter'
import { Reveal } from '@/components/shared/reveal'
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
            <AnimatedCounter value={stat.value} suffix={stat.suffix ?? ''} />
          </div>
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
