'use client'

/**
 * TestimonialsSection — auto-rotating testimonial cards with gold stars,
 * initials avatar circles and quote marks. Brand-aware tint via the accent
 * hex prop (gold / magenta / birthday gold). Pauses on hover/focus, dots
 * navigation, fully i18n driven through the `items` prop.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { SectionHeading } from './section-heading'
import { Reveal } from '@/components/shared/reveal'
import { cn } from '@/lib/utils'

export interface TestimonialItem {
  name: string
  role: string
  text: string
}

interface TestimonialsSectionProps {
  title: string
  subtitle?: string
  items: TestimonialItem[]
  /** Accent hex for stars/dots (default gold) */
  accent?: string
  /** Light variant over dark 3D backgrounds */
  light?: boolean
  /** Editorial variant (Task 39): serif italic quote, larger type,
   *  tracked-out small author — the luxury-press look. */
  editorial?: boolean
}

export function TestimonialsSection({
  title,
  subtitle,
  items,
  accent,
  light = false,
  editorial = false,
}: TestimonialsSectionProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const accentHex = accent ?? 'var(--color-primary)'

  useEffect(() => {
    if (paused || items.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 5200)
    return () => clearInterval(id)
  }, [paused, items.length])

  const item = items[index]
  if (!item) return null

  return (
    <section
      className={cn('py-16 sm:py-24 px-4', light ? 'bg-transparent' : 'bg-background')}
      aria-label={title}
    >
      <div className="max-w-3xl mx-auto">
        <SectionHeading title={title} subtitle={subtitle} light={light} />

        <Reveal>
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className={cn(
              'relative rounded-2xl p-8 sm:p-12 card-lift glow-border',
              light ? 'glass-panel' : 'bg-card border border-border',
              editorial &&
                (light ? 'glass-strong' : 'border-primary/15 shadow-[0_30px_70px_-35px_rgba(0,0,0,0.45)]')
            )}
          >
            <Quote
              aria-hidden="true"
              className={cn(
                'absolute top-6 start-6 opacity-15',
                editorial ? 'w-14 h-14' : 'w-10 h-10'
              )}
              style={{ color: accentHex }}
            />

            <AnimatePresence mode="wait">
              <motion.blockquote
                key={index}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div className="flex gap-1 mb-5" aria-label="5/5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-current"
                      style={{ color: accentHex }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p
                  className={cn(
                    'max-w-[65ch] mx-auto sm:mx-0',
                    editorial
                      ? 'font-display italic font-light text-2xl sm:text-[1.75rem] leading-[1.5]'
                      : 'text-base sm:text-lg leading-relaxed',
                    light ? 'text-paper/85' : 'text-foreground/90'
                  )}
                >
                  “{item.text}”
                </p>
                <footer
                  className={cn(
                    'mt-7 flex items-center gap-4',
                    editorial && 'sm:mt-9 border-t pt-6',
                    editorial && (light ? 'border-paper/10' : 'border-border')
                  )}
                >
                  {editorial ? (
                    /* Editorial avatar — hairline ring, no fill (press style) */
                    <span
                      aria-hidden="true"
                      className="w-12 h-12 rounded-full flex items-center justify-center font-display text-lg shrink-0"
                      style={{
                        border: `1px solid color-mix(in srgb, ${accentHex} 45%, transparent)`,
                        color: accentHex,
                      }}
                    >
                      {item.name.trim().charAt(0)}
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="w-12 h-12 rounded-full flex items-center justify-center font-display text-lg shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${accentHex} 16%, transparent)`,
                        color: accentHex,
                        boxShadow: `0 0 0 1px color-mix(in srgb, ${accentHex} 35%, transparent)`,
                      }}
                    >
                      {item.name.trim().charAt(0)}
                    </span>
                  )}
                  <div>
                    <cite
                      className={cn(
                        'font-display text-base not-italic block',
                        editorial && 'text-sm tracking-[0.14em] uppercase font-body font-semibold',
                        light ? 'text-paper' : 'text-foreground'
                      )}
                    >
                      {item.name}
                    </cite>
                    <span
                      className={cn(
                        'text-xs tracking-wide',
                        editorial && 'text-[0.7rem] tracking-[0.18em] uppercase',
                        light ? 'text-paper/50' : 'text-muted-foreground'
                      )}
                    >
                      {item.role}
                    </span>
                  </div>
                </footer>
              </motion.blockquote>
            </AnimatePresence>

            {/* Dots */}
            {items.length > 1 && (
              <div className="flex items-center justify-center gap-2.5 mt-8">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`${i + 1} / ${items.length}`}
                    aria-current={i === index ? 'true' : undefined}
                    className="w-2.5 h-2.5 rounded-full cursor-pointer border-0 transition-all duration-300 p-0"
                    style={{
                      backgroundColor: i === index ? accentHex : 'transparent',
                      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accentHex} 55%, transparent)`,
                      transform: i === index ? 'scale(1.25)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
