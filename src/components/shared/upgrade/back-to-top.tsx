'use client'

/**
 * BackToTop v2 — floating button with a circular SVG progress ring that
 * fills as the user scrolls, appearing after one viewport height. Spring
 * entrance, smooth scroll to top on click. Positioned above the WhatsApp
 * button (stacked on mobile). Glass surface + gold ring.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export function BackToTop() {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  const { scrollYProgress } = useScroll()
  const ringProgress = useSpring(scrollYProgress, { stiffness: 160, damping: 30, mass: 0.4 })
  // v45: local reduced-motion gate — CSS `prefers-reduced-motion` blocks in
  // globals.css only cover CSS transitions/animations, NOT framer-motion
  // springs (a global <MotionConfig reducedMotion="user"> wrapper at the
  // app root is the follow-up; this file only owns the local variant).
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setVisible(window.scrollY > window.innerHeight * 0.9)
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 16 }}
          whileTap={prefersReduced ? undefined : { scale: 0.92 }}
          transition={
            prefersReduced
              ? { duration: 0 } // instant for vestibular-sensitive users
              : { type: 'spring', stiffness: 320, damping: 22 }
          }
          onClick={() =>
            window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })
          }
          aria-label={t('common.backToTop')}
          className="press fixed bottom-24 sm:bottom-6 start-4 sm:start-6 z-40 w-12 h-12 rounded-full bg-card/85 backdrop-blur-md text-primary border border-primary/30 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-pointer hover:border-primary/60 hover:shadow-[0_10px_34px_-6px_color-mix(in_srgb,var(--color-primary)_45%,rgba(0,0,0,0.4))] transition-[border-color,box-shadow] duration-300"
        >
          {/* Circular progress ring */}
          <svg
            viewBox="0 0 48 48"
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            aria-hidden="true"
          >
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary/15"
            />
            <motion.circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-primary"
              style={{ pathLength: ringProgress }}
            />
          </svg>
          <ArrowUp className="w-5 h-5 relative z-[1]" strokeWidth={2} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
