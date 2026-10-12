'use client'

/**
 * PageHeader v2 — eyebrow + display title + subtitle, now with the
 * word-by-word masked reveal: each title word rises out of its own clip
 * mask with a staggered delay (pure CSS, driven by the shared Reveal
 * observer). Eyebrow hairlines draw outward; subtitle rises after the
 * words settle. RTL-safe (masks are direction-agnostic).
 */

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { easeExpoOut } from '@/lib/motion'
import { Reveal } from '@/components/shared/reveal'
import { MaskedTitle } from '@/components/shared/masked-words'
import { TextScramble } from '@/components/fx/text-scramble'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  eyebrow?: string
  title: ReactNode
  subtitle?: string
  className?: string
}

export function PageHeader({ eyebrow, title, subtitle, className }: PageHeaderProps) {
  /* fix-2: tracking-wide on the display title is Latin-only — it tears
     the joined Arabic letters apart, so it is applied for `en` only. */
  const { locale } = useI18n()

  return (
    <Reveal direction="none" className={cn('text-center mb-10 sm:mb-14 px-4', className)}>
      {eyebrow && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="line-draw-start w-8 h-px bg-primary/50" />
          <span className="eyebrow text-primary/80">
            {/* Task 44: the eyebrow DECODES (Latin) / settles (Arabic) */}
            <TextScramble text={eyebrow} delay={0.15} />
          </span>
          <span className="line-draw-end w-8 h-px bg-primary/50" />
        </div>
      )}
      <h1
        className={cn(
          'font-display text-3xl sm:text-5xl md:text-6xl text-foreground mb-4',
          locale === 'en' && 'tracking-wide'
        )}
      >
        <MaskedTitle title={title} />
      </h1>
      {subtitle && (
        <Reveal direction="up" delay={0.55}>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
            {subtitle}
          </p>
        </Reveal>
      )}
      {/* Task 44: the gold rule (with its diamond) draws itself outward
          from the center once in view. */}
      <motion.div
        aria-hidden
        className="gold-divider w-40 mx-auto mt-8"
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, margin: '-8% 0px' }}
        transition={{ duration: 1, ease: easeExpoOut, delay: 0.5 }}
        style={{ transformOrigin: 'center' }}
      />
    </Reveal>
  )
}
