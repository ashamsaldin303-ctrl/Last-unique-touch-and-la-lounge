'use client'

/**
 * TotalsBlock — shared rental / deposit / grand-total rows used by the
 * cart, checkout and payment summary cards. Currency KWD (3 decimals).
 */

import { formatKwd } from '@/lib/products'
import { cn } from '@/lib/utils'

export function TotalsBlock({
  rentalTotal,
  depositTotal,
  total,
  labels,
  className,
}: {
  rentalTotal: number
  depositTotal: number
  total: number
  labels: { rental: string; deposit: string; total: string; currency: string }
  className?: string
}) {
  const row = 'flex items-center justify-between text-sm'
  return (
    <div className={cn('space-y-2.5', className)}>
      <div className={row}>
        <span className="text-muted-foreground">{labels.rental}</span>
        <span className="font-medium tabular-nums text-foreground">
          {formatKwd(rentalTotal)} {labels.currency}
        </span>
      </div>
      <div className={row}>
        <span className="text-muted-foreground">{labels.deposit}</span>
        <span className="font-medium tabular-nums text-foreground">
          {formatKwd(depositTotal)} {labels.currency}
        </span>
      </div>
    </div>
  )
}

/** Grand total row (rental + deposit) with a gold display figure. */
export function GrandTotalRow({
  total,
  labels,
  className,
}: {
  total: number
  labels: { total: string; currency: string }
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-t border-border pt-4',
        className
      )}
    >
      <span className="text-sm font-bold text-foreground">{labels.total}</span>
      <span className="font-display text-xl font-bold tabular-nums text-primary">
        {formatKwd(total)} {labels.currency}
      </span>
    </div>
  )
}
