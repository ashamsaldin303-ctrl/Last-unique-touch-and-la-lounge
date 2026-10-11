'use client'

/**
 * KineticHeading (Task 43, prompt-motion round 2).
 *
 * Source patterns:
 *  - official showreel template: "every shot enters already moving",
 *    "blur follows speed and direction on fast moves", banned "holds".
 *  - antonio-kodheli promo: the accent highlighter sweep moment.
 *  - twoclipping morph doctrine: content "swaps with a short blur".
 *
 * Each word rises out of a clip mask (a curtain per word) with a short
 * de-blur during flight. Word-granular ONLY — Arabic is a joined script
 * and must never be split per letter (breaks ligatures).
 *
 * Mask geometry: `padding-bottom + negative margin` gives Arabic
 * descenders (ج، ي، ن، ق…) room to escape the overflow clip while the
 * visual baseline stays put. `translateY(120%)` start hides the word
 * fully (descender compensation included).
 */

import { type ReactNode } from 'react'
import { motion, type Transition, type Variants } from 'framer-motion'
import { easeExpoOut } from '@/lib/motion'

const RISE_MS = 0.85

/* ------------------------------------------------------------------ *
 * IO-CLIP FIX (Task 43-c): the rise trigger lives on the MASK, not the
 * word. IntersectionObserver computes the intersection rect AFTER
 * ancestor clipping — a word parked at translateY(120%) is fully
 * outside its mask's `overflow-hidden` box, so a whileInView attached
 * to the word itself reports isIntersecting:false forever and the
 * reveal never plays (the heading would stay invisible). The mask is
 * the element that is actually on screen, so IT carries
 * whileInView="show" and framer's variant propagation drives the inner
 * word (labels pass through plain spans, children animate with their
 * own delay/stagger). Verified live: word-IO=false, mask-IO=true.
 * ------------------------------------------------------------------ */

export function KineticWords({
  text,
  className,
  delay = 0,
  stagger = 0.085,
  once = true,
}: {
  text: string
  className?: string
  delay?: number
  stagger?: number
  once?: boolean
}) {
  const words = text.split(' ').filter(Boolean)
  return (
    <span className={className} aria-label={text} role="text">
      {words.map((word, i) => {
        const rise: Variants = {
          hidden: { y: '120%', opacity: 0 },
          show: {
            y: '0%',
            opacity: 1,
            transition: {
              duration: RISE_MS,
              ease: easeExpoOut,
              delay: delay + i * stagger,
            } satisfies Transition,
          },
        }
        return (
          <motion.span
            key={`${word}-${i}`}
            aria-hidden="true"
            className="inline-block overflow-hidden align-baseline pb-[0.14em] -mb-[0.14em]"
            initial="hidden"
            whileInView="show"
            viewport={{ once, margin: '-10% 0px -10% 0px' }}
          >
            <motion.span
              className="inline-block will-change-transform"
              variants={rise}
            >
              {word}
            </motion.span>
            {i < words.length - 1 ? '\u00A0' : null}
          </motion.span>
        )
      })}
    </span>
  )
}

/**
 * KineticLine — one full line rising from a single mask (for subtitles
 * and small copy; cheaper than word granularity for long sentences).
 */
export function KineticLine({
  children,
  className,
  delay = 0,
  once = true,
}: {
  children: ReactNode
  className?: string
  delay?: number
  once?: boolean
}) {
  const rise: Variants = {
    hidden: { y: '120%' },
    show: {
      y: '0%',
      transition: { duration: RISE_MS, ease: easeExpoOut, delay } satisfies Transition,
    },
  }
  return (
    <motion.span
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-8% 0px -8% 0px' }}
      className={`inline-block overflow-hidden align-baseline pb-[0.16em] -mb-[0.16em] ${className ?? ''}`}
    >
      <motion.span className="inline-block will-change-transform" variants={rise}>
        {children}
      </motion.span>
    </motion.span>
  )
}

/**
 * HairlineDraw — a gold rule that draws itself (scaleX from the inline
 * start, direction-aware) — the "highlighter sweep" of the promo, used
 * as the seam under headings.
 */
export function HairlineDraw({
  className,
  delay = 0,
  origin = 'start',
}: {
  className?: string
  delay?: number
  origin?: 'start' | 'center'
}) {
  return (
    <motion.span
      aria-hidden="true"
      className={`inline-block h-px bg-gold/50 ${className ?? ''}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 1.05, ease: easeExpoOut, delay }}
      style={{
        transformOrigin: origin === 'start' ? 'inline-start' : 'center',
      }}
    />
  )
}
