'use client'

/**
 * MagneticButton — a button that leans toward the cursor (magnetic hover),
 * with a gold shine sweep. Polymorphic: renders as button (default) or takes
 * an onClick for navigation. Reusable across all brand themes (colors come
 * from the active brand theme variables).
 *
 * Motion per emil-design-eng: the magnetic offset is spring-interpolated
 * (useSpring) so it carries momentum instead of snapping to the pointer;
 * press feedback is scale(0.97) over 160ms.
 */

import { useRef, type ReactNode, type MouseEvent } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MagneticButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  /** Strength of the magnetic pull in px */
  strength?: number
  ariaLabel?: string
  /** Submit variant (for forms) */
  type?: 'button' | 'submit'
  disabled?: boolean
}

export function MagneticButton({
  children,
  onClick,
  className,
  strength = 10,
  ariaLabel,
  type = 'button',
  disabled = false,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 180, damping: 16, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 180, damping: 16, mass: 0.4 })

  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    x.set((dx / rect.width) * strength * 2)
    y.set((dy / rect.height) * strength)
  }

  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      aria-label={ariaLabel}
      className={cn(
        'shine-sweep relative inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium cursor-pointer border-0',
        'transition-[box-shadow,background-color] duration-300 ease-out',
        'hover:shadow-[0_14px_38px_-10px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  )
}
