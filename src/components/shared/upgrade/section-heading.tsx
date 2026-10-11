'use client'

/**
 * SectionHeading (shared/upgrade) — eyebrow + title + gold accents.
 *
 * Task 43 (prompt-motion round 2): upgraded to the KINETIC language —
 * eyebrow hairlines DRAW themselves, the title rises word-by-word out
 * of clip masks ("every shot enters already moving" — showreel
 * doctrine), the subtitle follows on a single mask line. Replaces the
 * CSS-observer MaskedWords with framer variant propagation from the
 * mask level (IO-clip fix). Light/dark aware via `light` prop (over
 * dark 3D backgrounds the text switches to paper tones).
 */

import { KineticWords, KineticLine, HairlineDraw } from '@/components/fx/kinetic-heading'
import { motion } from 'framer-motion'
import { easeExpoOut } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Use light text (for sections over dark 3D backgrounds) */
  light?: boolean
  className?: string
  align?: 'center' | 'start'
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = false,
  className,
  align = 'center',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'mb-12',
        align === 'center' ? 'text-center' : 'text-start',
        className
      )}
    >
      {eyebrow && (
        <div
          className={cn(
            'flex items-center gap-3 mb-3',
            align === 'center' ? 'justify-center' : 'justify-start'
          )}
        >
          <HairlineDraw className="w-10" />
          <motion.span
            className={cn('eyebrow inline-block', light ? 'text-gold/80' : 'text-primary/80')}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.65, ease: easeExpoOut, delay: 0.05 }}
          >
            {eyebrow}
          </motion.span>
          <HairlineDraw className="w-10" delay={0.05} />
        </div>
      )}
      <h2
        className={cn(
          'font-display text-2xl sm:text-4xl',
          light ? 'text-paper' : 'text-foreground'
        )}
      >
        <KineticWords text={title} delay={0.12} stagger={0.07} />
      </h2>
      {subtitle && (
        <p
          className={cn(
            'mt-3 text-sm sm:text-base max-w-2xl leading-relaxed',
            align === 'center' && 'mx-auto',
            light ? 'text-paper/70' : 'text-muted-foreground'
          )}
        >
          <KineticLine delay={0.3}>{subtitle}</KineticLine>
        </p>
      )}
    </div>
  )
}
