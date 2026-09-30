'use client'

/**
 * Reveal v2 — scroll-reveal wrapper with direction variants.
 * IntersectionObserver-based, framer-free for cheap reveals.
 * Children fade/slide in when they enter the viewport.
 *
 * Directions: 'up' (default) · 'down' · 'start' · 'end' (reading-direction
 * aware, RTL flips automatically) · 'scale' (soft zoom) · 'none' (pure fade
 * — pairs well with inner word-mask / stagger effects).
 */

import { useEffect, useRef, type ReactNode, type ElementType } from 'react'
import { cn } from '@/lib/utils'

export type RevealDirection = 'up' | 'down' | 'start' | 'end' | 'scale' | 'none'

const directionClass: Record<RevealDirection, string> = {
  up: '',
  down: 'reveal-down',
  start: 'reveal-start',
  end: 'reveal-end',
  scale: 'reveal-scale',
  none: 'reveal-none',
}

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger delay in seconds */
  delay?: number
  as?: ElementType
  /** Entrance direction (default: up) */
  direction?: RevealDirection
}

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
  direction = 'up',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Per impeccable: reveal enhances an already-visible default. If
    // IntersectionObserver is unavailable, show content instantly.
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('revealed')
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={cn('reveal', directionClass[direction], className)}
      style={{ ['--reveal-delay' as string]: `${delay}s` }}
    >
      {children}
    </Tag>
  )
}
