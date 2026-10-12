'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

/**
 * TextScramble — the terminal-style "decode" reveal: characters resolve
 * out of noise as the label scrolls into view (prompt-motion's terminal
 * entries boot "with a single dot on a black screen" — this is that
 * language, tamed for a maison).
 *
 * ARABIC SAFETY: the Arabic script is joined — scrambling individual
 * characters would shatter glyph shaping. Text containing any joined
 * RTL script settles as a WHOLE (blur → sharp) instead of per-char.
 */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*<>+'

const isJoinedScript = (s: string) =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s)

export function TextScramble({
  text,
  className,
  speed = 26,
  delay = 0,
}: {
  text: string
  className?: string
  /** ms per resolve step (each step resolves ~half a char) */
  speed?: number
  /** seconds to wait after entering the viewport before decoding */
  delay?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const [display, setDisplay] = useState(text)
  const joined = isJoinedScript(text)

  useEffect(() => {
    if (joined || !inView) return
    let step = 0
    let interval = 0
    const chars = text.split('')
    const kickoff = window.setTimeout(() => {
      interval = window.setInterval(() => {
        step += 1
        const resolved = Math.floor(step / 2)
        setDisplay(
          chars
            .map((c, i) => {
              if (c === ' ' || i < resolved) return c
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
            })
            .join(''),
        )
        if (resolved >= chars.length) {
          window.clearInterval(interval)
          setDisplay(text)
        }
      }, speed)
    }, delay * 1000)
    return () => {
      window.clearTimeout(kickoff)
      window.clearInterval(interval)
    }
  }, [inView, text, speed, delay, joined])

  if (joined) {
    // Whole-text settle for joined scripts — no character surgery.
    return (
      <motion.span
        ref={ref}
        className={className}
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        whileInView={{ opacity: 1, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      >
        {text}
      </motion.span>
    )
  }

  return (
    <span ref={ref} className={className} aria-label={text}>
      {/* the scrambling copy is decorative — the accessible name stays clean */}
      <span aria-hidden="true">{display}</span>
    </span>
  )
}
