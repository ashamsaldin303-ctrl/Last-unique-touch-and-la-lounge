'use client'

/**
 * QuantityStepper — 44px-touch accessible +/- control shared by the
 * rental picker (product page) and the cart rows.
 */

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function QuantityStepper({
  value,
  min = 1,
  max,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
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
  disabled?: boolean
  compact?: boolean
  className?: string
}) {
  const btn =
    'flex items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-primary/10 hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40'
  const size = compact ? 'min-w-[36px] min-h-[36px]' : 'min-w-[44px] min-h-[44px]'
  const icon = compact ? 'size-3' : 'size-4'

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
        className={cn(
          'text-center font-semibold tabular-nums text-foreground',
          compact ? 'w-7 text-sm' : 'w-10'
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled || (max !== undefined && value >= max)}
        aria-label={increaseLabel}
        className={cn(btn, size)}
      >
        <Plus className={icon} aria-hidden="true" />
      </button>
    </div>
  )
}
