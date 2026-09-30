'use client'

/**
 * SectionHeading — eyebrow + title + animated gold accent lines that draw in
 * on scroll reveal. Light/dark aware via `light` prop (over dark 3D
 * backgrounds the text switches to paper tones).
 */

import { Reveal } from '@/components/shared/reveal'
import { MaskedWords } from '@/components/shared/masked-words'
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
    <Reveal
      direction="none"
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
          <span className="line-draw-start w-10 h-px bg-primary/60" aria-hidden="true" />
          <span className={cn('eyebrow', light ? 'text-gold/80' : 'text-primary/80')}>
            {eyebrow}
          </span>
          <span className="line-draw-end w-10 h-px bg-primary/60" aria-hidden="true" />
        </div>
      )}
      <h2
        className={cn(
          'font-display text-2xl sm:text-4xl',
          light ? 'text-paper' : 'text-foreground'
        )}
      >
        <MaskedWords text={title} />
      </h2>
      {subtitle && (
        <p
          className={cn(
            'mt-3 text-sm sm:text-base max-w-2xl leading-relaxed',
            align === 'center' && 'mx-auto',
            light ? 'text-paper/70' : 'text-muted-foreground'
          )}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  )
}
