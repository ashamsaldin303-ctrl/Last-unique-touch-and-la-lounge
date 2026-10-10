'use client'

/**
 * QuantityStepper — 44px-touch accessible +/- control shared by the
 * rental picker (product page) and the cart rows.
 *
 * Limits: min 1 … MAX (default 100, matching the cart store's
 * MAX_QUANTITY_PER_ITEM so the UI can never request what the store
 * would silently reject). A caller-supplied `max` (e.g. available
 * stock) is honoured but never allowed past the 100 hard cap.
 */

import { type KeyboardEvent, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { popSpring } from '@/lib/motion'

/** Mirrors MAX_QUANTITY_PER_ITEM in lib/cart-store (kept local to stay a
 *  pure presentational component with no store import). */
const HARD_MAX = 100

export function QuantityStepper({
  value,
  min = 1,
  max,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  valueLabel,
  disabled = false,
  compact = false,
  className,
}: {
  value: number
  min?: number
  max?: number
  onDecrease: () => void
  onIncrease: () => void
  decreaseLabel: string
  increaseLabel: string
  /** Accessible name for the value control (announced with its range). */
  valueLabel?: string
  disabled?: boolean
  compact?: boolean
  className?: string
}) {
  const btn =
    'flex items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-primary/10 hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40'
  // Touch targets stay ≥44px in both modes (the compact mode only shrinks
  // the icon/value optics, never the hit area).
  const size = 'min-w-[44px] min-h-[44px]'
  const icon = compact ? 'size-3' : 'size-4'
  const effectiveMax = Math.min(max ?? HARD_MAX, HARD_MAX)
  const atMax = value >= effectiveMax
  const reduceMotion = useReducedMotion()

  /* Odometer (Task 42, prompt-motion T2/T5): the digit pops on a spring
     in the direction of the change — increases roll up from below,
     decreases drop down from above — like a mechanical counter, never a
     hard swap. Direction derived during render via the official
     "adjusting state when a prop changes" pattern (no effect). Reduced
     motion: plain text swap. */
  const [lastValue, setLastValue] = useState(value)
  const [dir, setDir] = useState<1 | -1>(1)
  if (value !== lastValue) {
    setLastValue(value)
    setDir(value > lastValue ? 1 : -1)
  }

  /* WAI-ARIA spinbutton on the value itself: keyboard users can focus the
     figure and adjust with ArrowUp/ArrowDown (mirroring the +/- buttons)
     instead of Tab-ing to a button and pressing repeatedly. */
  const handleValueKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return
    if (event.key === 'ArrowUp' && !atMax) {
      event.preventDefault()
      onIncrease()
    } else if (event.key === 'ArrowDown' && value > min) {
      event.preventDefault()
      onDecrease()
    }
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5 sm:gap-2', className)}>
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled || value <= min}
        aria-label={decreaseLabel}
        className={cn(btn, size)}
      >
        <Minus className={icon} aria-hidden="true" />
      </button>
      <span
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={effectiveMax}
        aria-label={valueLabel}
        onKeyDown={handleValueKeyDown}
        aria-live="polite"
        className={cn(
          'text-center font-semibold tabular-nums text-foreground',
          compact ? 'w-7 text-sm' : 'w-10'
        )}
      >
        {reduceMotion ? (
          value
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              className="inline-block"
              initial={{ y: dir * 12, opacity: 0, scale: 0.85 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: dir * -12, opacity: 0, scale: 0.85 }}
              transition={popSpring}
            >
              {value}
            </motion.span>
          </AnimatePresence>
        )}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled || atMax}
        aria-label={increaseLabel}
        className={cn(btn, size)}
      >
        <Plus className={icon} aria-hidden="true" />
      </button>
    </div>
  )
}
