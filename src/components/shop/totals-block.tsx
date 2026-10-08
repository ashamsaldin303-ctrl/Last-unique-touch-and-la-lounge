'use client'

/**
 * TotalsBlock — shared rental / deposit / grand-total rows used by the
 * cart, checkout and payment summary cards. Currency KWD (3 decimals).
 */

import { useI18n } from '@/lib/i18n'
import { formatKwd } from '@/lib/money'
import { cn } from '@/lib/utils'

export function TotalsBlock({
  rentalTotal,
  depositTotal,
  labels,
  className,
}: {
  rentalTotal: number
  depositTotal: number
  /** @deprecated Never rendered — the grand total belongs to
   *  GrandTotalRow. Optional so existing callers (cart/checkout) keep
   *  compiling until their owners drop it; do not pass in new code. */
  total?: number
  labels: { rental: string; deposit: string; total: string; currency: string }
  className?: string
}) {
  // Locale from context (not props) so the shared block formats money
  // consistently for every caller without changing its public API.
  const { locale } = useI18n()
  const row = 'flex items-center justify-between text-sm'
  return (
    <div className={cn('space-y-2.5', className)}>
      <div className={row}>
        <span className="text-muted-foreground">{labels.rental}</span>
        <span className="font-medium tabular-nums text-foreground">
          {/* LTR isolate for the KWD figure; the currency label keeps its
              natural bidi order (after the number in both directions). */}
          <span dir="ltr">{formatKwd(rentalTotal, locale)}</span> {labels.currency}
        </span>
      </div>
      <div className={row}>
        <span className="text-muted-foreground">{labels.deposit}</span>
        <span className="font-medium tabular-nums text-foreground">
          <span dir="ltr">{formatKwd(depositTotal, locale)}</span> {labels.currency}
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
  const { locale } = useI18n()
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-t border-border pt-4',
        className
      )}
    >
      <span className="text-sm font-bold text-foreground">{labels.total}</span>
      <span className="font-display text-xl font-bold tabular-nums text-primary">
        <span dir="ltr">{formatKwd(total, locale)}</span> {labels.currency}
      </span>
    </div>
  )
}
