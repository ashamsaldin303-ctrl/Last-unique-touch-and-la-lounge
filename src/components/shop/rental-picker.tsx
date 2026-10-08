'use client'

/**
 * RentalPicker — the product page's rental section (Task 26 redesign).
 *
 * The rental-period selection itself now lives in DurationSelector
 * («عقد الأيام» — preset chips + framed date fields + the jeweler's
 * days-strand, brand-adaptive). This component keeps everything that
 * made the original flow solid: debounced availability check with
 * colored status badges, quantity stepper capped at the actually
 * bookable stock, concierge price summary with receipt leader dots,
 * tweened total, and the add-to-cart action (toast + view-cart link).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CalendarRange, Check, CheckCircle2, Loader2, ShoppingCart } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { checkAvailability, formatKwd, localizedName, type ProductDTO } from '@/lib/products'
import { useCart } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/shop/quantity-stepper'
import { DurationSelector, useTweenedNumber } from '@/components/shop/duration-selector'
import { rentalDays, rentalPriceCalc, todayIso } from '@/components/shop/format'
import { cn } from '@/lib/utils'

type AvailabilityState = 'idle' | 'checking' | 'available' | 'unavailable' | 'error' | 'past'

export function RentalPicker({ product }: { product: ProductDTO }) {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()

  const isOutOfStock = product.stock === 0
  const today = useMemo(() => todayIso(), [])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [availability, setAvailability] = useState<AvailabilityState>('idle')
  const [availableStock, setAvailableStock] = useState<number | null>(null)
  const [checkedKey, setCheckedKey] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const addedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /* Sequence guard (Task 3-e follow-up): a stale availability response
     resolving after a newer check started must never write its result —
     it would show the OLD dates' verdict under the CURRENT key. */
  const checkSeqRef = useRef(0)

  useEffect(() => {
    return () => {
      if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current)
    }
  }, [])

  const days = startDate && endDate ? rentalDays(startDate, endDate) : 0
  /* Past-date guard: the native input `min` only greys the picker UI — a
     typed past date still fires onChange. Block it locally (zero-padded
     ISO strings compare chronologically). The server independently
     rejects past windows (400 invalid_dates); this is UX, not the guard. */
  const isPastStart = Boolean(startDate) && startDate < today
  const priceCalc = useMemo(
    () => rentalPriceCalc(product.rentalPricePerDay, product.securityDeposit, days, quantity),
    [product.rentalPricePerDay, product.securityDeposit, days, quantity]
  )

  /* ---- Debounced availability check (400ms) ----
     checkedKey records which (dates, quantity) the last result belongs to;
     when inputs change the stale result is masked with a "checking" state
     derived at render time (no sync setState inside the effect body). */
  const currentKey = `${startDate}|${endDate}|${quantity}`

  const runCheck = useCallback(async () => {
    const key = `${startDate}|${endDate}|${quantity}`
    const seq = ++checkSeqRef.current
    setAvailability('checking')
    setCheckedKey(key)
    try {
      const result = await checkAvailability(product.id, startDate, endDate, quantity)
      if (checkSeqRef.current !== seq) return // superseded — a newer check is in flight
      const stock =
        typeof result.availableStock === 'number' && result.availableStock >= 0
          ? result.availableStock
          : null
      setAvailableStock(stock)
      setAvailability(result.available ? 'available' : 'unavailable')
      // Async callback — clamping here keeps the stepper honest when fresh
      // availability data lowers the ceiling below the chosen quantity.
      if (stock !== null) {
        const ceiling = Math.max(1, stock)
        setQuantity((q) => Math.min(q, ceiling))
      }
    } catch {
      if (checkSeqRef.current !== seq) return
      setAvailableStock(null)
      setAvailability('error')
    }
  }, [product.id, startDate, endDate, quantity])

  /* Debounced check — only scheduled when both dates are valid and the
     window starts today or later. The "select dates" state is DERIVED (no
     sync setState in the effect body): while dates are incomplete the badge
     below falls back to idle. */
  useEffect(() => {
    if (!startDate || !endDate || days < 1 || isPastStart) return
    const timer = setTimeout(runCheck, 400)
    return () => clearTimeout(timer)
  }, [startDate, endDate, days, isPastStart, runCheck])

  const datesValid = Boolean(startDate && endDate) && days >= 1
  const isStale = checkedKey !== currentKey
  const shownAvailability: AvailabilityState = isPastStart
    ? 'past'
    : !datesValid
      ? 'idle'
      : isStale
        ? 'checking'
        : availability
  const maxQty = Math.max(1, (datesValid ? availableStock : null) ?? product.stock)
  const canAdd = !isOutOfStock && datesValid && !isPastStart && shownAvailability === 'available'

  /* Tweened total — counts between values as dates/quantity change. */
  const tweenedTotal = useTweenedNumber(priceCalc.total)

  const handleAddToCart = () => {
    if (!canAdd || !datesValid) return

    addItem({
      productId: product.id,
      slug: product.slug,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      image: product.images?.[0] ?? '',
      rentalPricePerDay: product.rentalPricePerDay,
      securityDeposit: product.securityDeposit,
      startDate,
      endDate,
      quantity,
      days: priceCalc.days,
      total: priceCalc.total,
    })

    toast({
      title: t('product.addedToCart'),
      description: localizedName(product, locale),
      action: (
        <ToastAction altText={t('product.viewCart')} onClick={() => navigate('/cart')}>
          {t('product.viewCart')}
        </ToastAction>
      ),
    })

    setAdded(true)
    if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current)
    addedTimeoutRef.current = setTimeout(() => setAdded(false), 2400)
  }

  return (
    <section className="space-y-5" aria-labelledby="rental-heading">
      <div className="flex items-center gap-3">
        <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
        <h2 id="rental-heading" className="text-base font-semibold text-foreground">
          {t('product.rental.title')}
        </h2>
      </div>

      <div className="space-y-4">
        {/* Rental period — the days-strand selector (brand-adaptive) */}
        <DurationSelector
          idPrefix="rental"
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          minIso={today}
          disabled={isOutOfStock}
        />

        {/* Availability status — live region for screen readers */}
        <div aria-live="polite" role="status" aria-busy={shownAvailability === 'checking'}>
          <AvailabilityBadge state={shownAvailability} />
        </div>

        {/* Quantity */}
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            value={quantity}
            min={1}
            max={maxQty}
            disabled={isOutOfStock}
            onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrease={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            decreaseLabel={t('product.quantity.decrease')}
            increaseLabel={t('product.quantity.increase')}
            valueLabel={t('product.quantity.label')}
          />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block size-1 rotate-45 bg-primary/60" aria-hidden="true" />
            {/* Once a fresh availability check exists, show the window's
                bookable stock — product.stock can exceed it for the chosen
                dates (stepper already caps at the fresh value). */}
            {t('product.quantity.label')}:{' '}
            {!isStale && availableStock !== null ? availableStock : product.stock}
          </span>
        </div>

        {/* Price summary — concierge card */}
        <div className="concierge-card space-y-3.5 rounded-lg p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="h-px w-6 bg-primary/60" aria-hidden="true" />
            <span className="eyebrow text-[0.6875rem] tracking-[0.18em] text-primary">
              {t('product.priceSummary.title')}
            </span>
          </div>

          <div className="space-y-2.5 text-sm">
            {/* Days row */}
            <div className="flex items-baseline">
              <span className="shrink-0 text-muted-foreground">{t('product.priceSummary.rentalDays')}</span>
              <span className="leader-dots" aria-hidden="true" />
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{priceCalc.days}</span>
            </div>

            {/* Rental row — before dates are picked the ×0 formula reads as
                a broken quantity; show a friendly hint instead */}
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground">
                {priceCalc.days < 1
                  ? t('product.priceSummary.rentalPending')
                  : t('product.priceSummary.rental', {
                      rate: formatKwd(product.rentalPricePerDay),
                      days: priceCalc.days,
                      qty: quantity,
                      amount: formatKwd(priceCalc.rental),
                    })}
              </span>
            </div>

            {/* Deposit row */}
            <div className="flex items-baseline">
              <span className="shrink-0 text-muted-foreground">
                {t('product.priceSummary.depositLabel')}
              </span>
              <span className="leader-dots" aria-hidden="true" />
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {formatKwd(priceCalc.deposit)} {t('common.currency')}
              </span>
            </div>
          </div>

          {/* Total divider */}
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-primary/60" />
            <span className="size-1.5 rotate-45 bg-primary/70" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/40 to-primary/60" />
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-foreground">
              {t('product.priceSummary.total')}
            </span>
            <span className="price-display flex items-baseline gap-1.5 text-3xl">
              <span key={priceCalc.total} className="value-flip tabular-nums">
                {formatKwd(tweenedTotal)}
              </span>
              <span className="text-xs font-normal text-muted-foreground">{t('common.currency')}</span>
            </span>
          </div>

          <Button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAdd}
            aria-disabled={!canAdd}
            className="btn-gold-cta w-full rounded-md py-3 text-base font-semibold disabled:cursor-not-allowed"
          >
            {added ? (
              <>
                <Check className="size-5 me-2" aria-hidden="true" />
                {t('product.addedToCart')}
              </>
            ) : (
              <>
                <ShoppingCart className="size-5 me-2" aria-hidden="true" />
                {isOutOfStock ? t('product.outOfStock') : t('product.addToCart')}
              </>
            )}
          </Button>

          {added && (
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="block w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('product.viewCart')}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---- Availability badge with colored states ---- */

function AvailabilityBadge({ state }: { state: AvailabilityState }) {
  const { t } = useI18n()

  const base =
    'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors'

  switch (state) {
    case 'past':
      return (
        <span className={cn(base, 'border-amber-600/30 bg-amber-500/10 text-amber-700')}>
          <AlertCircle className="size-4" aria-hidden="true" />
          {t('checkout.errors.invalid_dates')}
        </span>
      )
    case 'checking':
      return (
        <span className={cn(base, 'border-primary/30 bg-primary/10 text-primary')}>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t('product.rental.checking')}
        </span>
      )
    case 'available':
      return (
        <span className={cn(base, 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700')}>
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {t('product.rental.available')}
        </span>
      )
    case 'unavailable':
      return (
        <span className={cn(base, 'border-red-600/30 bg-red-500/10 text-red-700')}>
          <AlertCircle className="size-4" aria-hidden="true" />
          {t('product.rental.unavailable')}
        </span>
      )
    case 'error':
      return (
        <span role="alert" className={cn(base, 'border-red-600/30 bg-red-500/10 text-red-700')}>
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {t('product.rental.checkError')}
        </span>
      )
    default:
      return (
        <span className={cn(base, 'border-border bg-muted/60 text-muted-foreground')}>
          <CalendarRange className="size-4" aria-hidden="true" />
          {t('product.rental.selectDates')}
        </span>
      )
  }
}
