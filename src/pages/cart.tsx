'use client'

/**
 * CART — route /cart.
 *
 * Reproduces the original repo's cart-view: items list with image,
 * localized name, rental period, per-day price, quantity stepper and
 * line totals, plus a sticky summary card (rental / deposit / grand
 * total). The hydration guard (useCartHydrated) prevents the SSR
 * localStorage flash; item removal animates out before the store updates.
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ShoppingCart, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { localizedName, formatKwd } from '@/lib/products'
import { useCart, cartTotals, type CartItem } from '@/lib/cart-store'
import { Reveal } from '@/components/shared/reveal'
import { QuantityStepper } from '@/components/shop/quantity-stepper'
import { GrandTotalRow, TotalsBlock } from '@/components/shop/totals-block'
import { formatDate } from '@/components/shop/format'
import { useCartHydrated } from '@/components/shop/use-cart-hydrated'
import { Button } from '@/components/ui/button'

const EXIT_DURATION_MS = 260

export default function CartPage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const { items, removeItem, updateQuantity } = useCart()
  const hydrated = useCartHydrated()

  /* Item removal: flag the row, animate it out, then update the store. */
  const [exitingIndex, setExitingIndex] = useState<number | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [])

  const handleRemove = (index: number) => {
    if (exitingIndex !== null) {
      // Flush any in-flight removal so it can't be silently dropped.
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
      removeItem(exitingIndex)
      setExitingIndex(null)
    }
    setExitingIndex(index)
    exitTimerRef.current = setTimeout(() => {
      removeItem(index)
      setExitingIndex(null)
      exitTimerRef.current = null
    }, EXIT_DURATION_MS)
  }

  /* Hydration guard — avoids the empty-cart flash before localStorage
     rehydrates the persisted items. */
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6" aria-busy="true">
        <div className="space-y-4" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-md border border-border bg-card p-4">
              <div className="shimmer size-24 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2.5 py-2">
                <div className="shimmer h-5 w-2/3 rounded" />
                <div className="shimmer h-3.5 w-1/2 rounded" />
                <div className="shimmer h-3.5 w-1/3 rounded" />
              </div>
            </div>
          ))}
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  /* Empty cart */
  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center"
        >
          <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
            <ShoppingCart className="size-10 text-primary" aria-hidden="true" />
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
            {t('cart.empty.title')}
          </h1>
          <p className="mb-8 text-muted-foreground">{t('cart.empty.subtitle')}</p>
          <Button
            onClick={() => navigate('/products')}
            className="btn-lux min-h-[44px] rounded-md px-8 py-3 text-base font-semibold"
          >
            {t('cart.empty.cta')}
            <ArrowIcon className="ms-2 size-4" aria-hidden="true" />
          </Button>
        </motion.div>
      </div>
    )
  }

  const totals = cartTotals(items)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      {/* Header */}
      <Reveal className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
          <span className="eyebrow text-[0.625rem] text-primary/90">{t('cart.summary.title')}</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          {t('cart.title')}
        </h1>
      </Reveal>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ---- Items list ---- */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item, index) => (
            <CartRow
              key={`${item.productId}-${item.startDate}-${item.endDate}-${index}`}
              item={item}
              exiting={exitingIndex === index}
              onRemove={() => handleRemove(index)}
              onQuantity={(quantity) => updateQuantity(index, quantity)}
            />
          ))}

          <Reveal className="pt-4">
            <Button
              variant="outline"
              onClick={() => navigate('/products')}
              className="min-h-[44px] rounded-md"
            >
              <ArrowIcon className="me-2 size-4 rotate-180" aria-hidden="true" />
              {t('cart.continueShopping')}
            </Button>
          </Reveal>
        </div>

        {/* ---- Summary ---- */}
        <div className="lg:col-span-1">
          <Reveal delay={0.1}>
            <div className="sticky top-24 rounded-md border border-border bg-card p-6 shadow-lg shadow-primary/10">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
                <span className="eyebrow text-[0.625rem] text-primary/90">
                  {t('cart.summary.title')}
                </span>
              </div>
              <h2 className="mb-4 font-display text-lg font-bold text-foreground">
                {t('cart.summary.title')}
              </h2>

              <TotalsBlock
                rentalTotal={totals.rentalTotal}
                depositTotal={totals.depositTotal}
                total={totals.total}
                labels={{
                  rental: t('cart.summary.rental'),
                  deposit: t('cart.summary.deposit'),
                  total: t('cart.summary.total'),
                  currency: t('common.currency'),
                }}
                className="border-b border-border pb-4"
              />

              <GrandTotalRow
                total={totals.total}
                labels={{ total: t('cart.summary.total'), currency: t('common.currency') }}
                className="py-4"
              />

              <Button
                onClick={() => navigate('/checkout')}
                className="btn-lux w-full min-h-[44px] rounded-md py-3 text-base font-semibold"
              >
                {t('cart.checkout')}
                <ArrowIcon className="ms-2 size-4" aria-hidden="true" />
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

/* ================= Cart row ================= */

function CartRow({
  item,
  exiting,
  onRemove,
  onQuantity,
}: {
  item: CartItem
  exiting: boolean
  onRemove: () => void
  onQuantity: (quantity: number) => void
}) {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()

  const productName = localizedName(item, locale)
  const period = t('cart.item.period', {
    start: formatDate(item.startDate, locale),
    end: formatDate(item.endDate, locale),
    days: item.days,
  })

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={
        exiting
          ? { opacity: 0, x: locale === 'ar' ? 40 : -40, scale: 0.97 }
          : { opacity: 1, x: 0, y: 0, scale: 1 }
      }
      transition={{ duration: EXIT_DURATION_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-4 rounded-md border border-border bg-card p-4 shadow-sm"
    >
      {/* Image */}
      <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.image ? (
          <Image
            src={item.image}
            alt={productName}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            {t('common.noImage')}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(`/products/${item.slug}`)}
            className="rounded text-start font-semibold text-foreground transition-colors hover:text-primary hover:underline line-clamp-1"
          >
            {productName}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={exiting}
            aria-label={t('cart.item.remove')}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">{period}</p>
        <p className="mt-1 text-sm font-medium tabular-nums text-primary">
          {formatKwd(item.rentalPricePerDay)} {t('cart.item.perDay')}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <QuantityStepper
            value={item.quantity}
            min={1}
            onDecrease={() => onQuantity(item.quantity - 1)}
            onIncrease={() => onQuantity(item.quantity + 1)}
            decreaseLabel={t('product.quantity.decrease')}
            increaseLabel={t('product.quantity.increase')}
            compact
          />
          <p className="font-bold tabular-nums text-foreground">
            {formatKwd(item.total)} {t('common.currency')}
          </p>
        </div>
      </div>

      <span className="sr-only">{`${productName} — ${period}`}</span>
    </motion.article>
  )
}
