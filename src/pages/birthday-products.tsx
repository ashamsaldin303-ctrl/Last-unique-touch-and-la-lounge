'use client'

/**
 * Your Birthday — products page (route /your-birthday/products).
 *
 * YOUR_BIRTHDAY storefront: live products from /api/products (2 seeded
 * items — organic balloon arch 50 KWD/day, LED dance floor 80 KWD/day).
 * Each card's "استأجر الآن" (rentNow) expands an inline rental mini-form
 * (start/end date inputs + quantity stepper + price summary) that adds
 * the item to the zustand cart and toasts a view-cart action.
 *
 * UPGRADE LAYER (visible polish — cart/API logic untouched): TiltCards +
 * glow-border/card-lift on product cards (inline rental forms preserved
 * as-is) and a magnetic retry CTA in the error state.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import {
  fetchProducts,
  formatKwd,
  localizedName,
  localizedDescription,
  type ProductDTO,
} from '@/lib/products'
import { useCart } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/shared/page-header'
import { Reveal } from '@/components/shared/reveal'
import { TiltCard, MagneticButton } from '@/components/shared/upgrade'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToastAction } from '@/components/ui/toast'
import { AlertCircle, CalendarDays, Loader2, Minus, Plus, ShoppingCart } from 'lucide-react'

/** yyyy-mm-dd for `n` days from today (local, not UTC — date inputs are local). */
function dateFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const MS_PER_DAY = 86_400_000

/* ------------------------------------------------------------------ */
/* Rental mini-form — inline under a product card                      */
/* ------------------------------------------------------------------ */

function RentalForm({ product, onDone }: { product: ProductDTO; onDone: () => void }) {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const { toast } = useToast()
  const addItem = useCart((s) => s.addItem)

  const name = localizedName(product, locale)
  const today = dateFromToday(0)

  const [startDate, setStartDate] = useState(dateFromToday(1))
  const [endDate, setEndDate] = useState(dateFromToday(2))
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const maxQty = Math.max(1, product.stock)

  const days = useMemo(() => {
    const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / MS_PER_DAY
    return Math.max(1, Math.round(diff) || 1)
  }, [startDate, endDate])

  const total = useMemo(
    () => (product.rentalPricePerDay * days + product.securityDeposit) * quantity,
    [product.rentalPricePerDay, product.securityDeposit, days, quantity]
  )

  const handleAdd = () => {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      toast({
        title: t('checkout.errors.invalid_dates'),
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      addItem({
        productId: product.id,
        slug: product.slug,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        image: product.images[0] ?? '',
        rentalPricePerDay: product.rentalPricePerDay,
        securityDeposit: product.securityDeposit,
        startDate,
        endDate,
        quantity,
        days,
        total,
      })
      toast({
        title: t('product.addedToCart'),
        description: name,
        action: (
          <ToastAction altText={t('product.viewCart')} onClick={() => navigate('/cart')}>
            {t('product.viewCart')}
          </ToastAction>
        ),
      })
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t border-border bg-secondary/60 p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/70">
        <CalendarDays aria-hidden="true" className="size-3.5 text-primary" />
        {t('product.rental.title')}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-[0.7rem] font-medium text-muted-foreground">
            {t('product.rental.startDate')}
          </span>
          <Input
            type="date"
            required
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="min-h-11 bg-background"
            aria-label={t('product.rental.startDate')}
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-[0.7rem] font-medium text-muted-foreground">
            {t('product.rental.endDate')}
          </span>
          <Input
            type="date"
            required
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="min-h-11 bg-background"
            aria-label={t('product.rental.endDate')}
          />
        </label>
      </div>

      {/* quantity stepper */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {t('product.quantity.label')}
        </span>
        <div className="flex items-center gap-2" role="group" aria-label={t('product.quantity.label')}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label={t('product.quantity.decrease')}
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-8 text-center font-display text-lg text-foreground" aria-live="polite">
            {quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            aria-label={t('product.quantity.increase')}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* summary */}
      <dl className="mt-4 space-y-1.5 rounded-xl border border-border bg-card p-3 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <dt>{t('product.priceSummary.days', { count: days })}</dt>
          <dd className="tabular-nums">
            {formatKwd(product.rentalPricePerDay * days * quantity)} {t('common.currency')}
          </dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>{t('product.priceSummary.securityDeposit')}</dt>
          <dd className="tabular-nums">
            {formatKwd(product.securityDeposit * quantity)} {t('common.currency')}
          </dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 font-bold text-foreground">
          <dt>{t('product.priceSummary.total')}</dt>
          <dd className="tabular-nums text-primary">
            {formatKwd(total)} {t('common.currency')}
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        onClick={handleAdd}
        disabled={submitting}
        className="btn-lux mt-4 min-h-11 w-full rounded-full text-sm font-bold"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <ShoppingCart aria-hidden="true" className="me-2 size-4" />
            {t('product.addToCart')}
          </>
        )}
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Product card                                                        */
/* ------------------------------------------------------------------ */

function ProductCard({ product, delay }: { product: ProductDTO; delay: number }) {
  const { t, locale } = useI18n()
  const [expanded, setExpanded] = useState(false)

  const name = localizedName(product, locale)
  const description = localizedDescription(product, locale)
  const isOutOfStock = product.stock === 0

  return (
    <Reveal delay={delay} className="h-full">
      <TiltCard className="h-full rounded-2xl" max={6}>
        <article className="lux-card glow-border card-lift flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
        {/* image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {t('common.noImage')}
            </div>
          )}
          {isOutOfStock && (
            <div className="stock-veil">
              <span>{t('products.outOfStock')}</span>
            </div>
          )}
        </div>

        {/* body */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <h3 className="font-display text-lg text-foreground sm:text-xl">{name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-2xl text-primary">
              {formatKwd(product.rentalPricePerDay)}
            </span>
            <span className="text-xs text-muted-foreground">{t('products.perDay')}</span>
          </div>
          {product.securityDeposit > 0 && (
            <p className="mt-1 text-[0.7rem] text-muted-foreground">
              {t('product.securityDeposit', { amount: formatKwd(product.securityDeposit) })}
            </p>
          )}

          <div className="mt-auto pt-4">
            {isOutOfStock ? (
              <Button
                variant="outline"
                disabled
                className="min-h-11 w-full cursor-not-allowed rounded-full text-sm"
              >
                {t('products.outOfStock')}
              </Button>
            ) : expanded ? (
              <RentalForm product={product} onDone={() => setExpanded(false)} />
            ) : (
              <Button
                onClick={() => setExpanded(true)}
                className="btn-lux min-h-11 w-full rounded-full text-sm font-bold"
                aria-expanded={expanded}
              >
                <CalendarDays aria-hidden="true" className="me-2 size-4" />
                {t('products.rentNow')}
              </Button>
            )}
          </div>
        </div>
      </article>
      </TiltCard>
    </Reveal>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BirthdayProductsPage() {
  const { t } = useI18n()
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    // Async-only state updates — safe to call from effects (no sync setState).
    fetchProducts({ brand: 'YOUR_BIRTHDAY' })
      .then((res) => {
        setProducts(res.products)
        setFailed(false)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /** Retry — event handler, so synchronous setState is fine here. */
  const handleRetry = () => {
    setLoading(true)
    setFailed(false)
    setProducts([])
    load()
  }

  return (
    <div className="page-enter relative flex-1 bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(245, 185, 20, 0.12), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        <PageHeader
          eyebrow={t('yourBirthday.nav.brand')}
          title={t('yourBirthdayProducts.title')}
          subtitle={t('yourBirthdayProducts.subtitle')}
        />

        {/* grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                  aria-hidden="true"
                >
                  <div className="shimmer aspect-[4/3] w-full" />
                  <div className="space-y-3 p-5">
                    <div className="shimmer h-5 w-2/3 rounded-full" />
                    <div className="shimmer h-4 w-full rounded-full" />
                    <div className="shimmer h-8 w-1/3 rounded-full" />
                    <div className="shimmer h-11 w-full rounded-full" />
                  </div>
                </div>
              ))
            : products.map((product, i) => (
                <ProductCard key={product.id} product={product} delay={(i % 3) * 0.1} />
              ))}
        </div>

        {/* states */}
        {!loading && failed && (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
            <AlertCircle aria-hidden="true" className="mx-auto mb-4 size-10 text-primary" />
            <p className="mb-5 text-sm text-muted-foreground">{t('common.error')}</p>
            <MagneticButton
              onClick={handleRetry}
              ariaLabel={t('common.retry')}
              className="min-h-11 px-6 border border-primary/40 bg-transparent text-primary font-semibold"
            >
              {t('common.retry')}
            </MagneticButton>
          </div>
        )}
        {!loading && !failed && products.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-display mb-2 text-xl text-foreground">{t('products.empty.title')}</p>
            <p className="text-sm text-muted-foreground">{t('products.empty.subtitle')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
