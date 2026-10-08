'use client'

/**
 * Your Birthday — products page (route /your-birthday/products).
 *
 * TASK 28-b — festive storefront redesign. The route auto-applies the
 * birthday theme (data-brand='birthday': white canvas, gold #F5B914
 * primary, purple #4B1858 ink, Lalezar / Baloo 2 display fonts), so this
 * page dresses it with the pre-provisioned party kit (globals.css — not
 * editable from here):
 *   · bday-store-confetti  — faint confetti field behind the header
 *   · bday-store-card      — playful cards, thick gold border, hover tilt
 *   · bday-store-ticket    — perforated price ticket (dashed + punch holes)
 *   · bday-store-float(-2) — bobbing CSS balloons in the header corners
 *   · bday-store-squiggle  — wavy gold underline inside the title
 *
 * Cart logic preserved verbatim from the previous version: each card's
 * "استأجر الآن" (rentNow) expands an inline rental mini-form that now
 * uses the Task-26 DurationSelector (preset chips + framed date fields +
 * the jeweler's days-strand) instead of raw date inputs, plus the same
 * quantity stepper and price summary; addItem keeps the exact payload,
 * the toast keeps its view-cart action, and dates are still validated in
 * handleAdd before submit.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { withTimeout } from '@/lib/with-timeout'
import {
  fetchProducts,
  formatKwd,
  localizedName,
  localizedDescription,
  type ProductDTO,
} from '@/lib/products'
import { useCart } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'
import { DurationSelector } from '@/components/shop/duration-selector'
import { Reveal } from '@/components/shared/reveal'
import { TiltCard, MagneticButton } from '@/components/shared/upgrade'
import { Button } from '@/components/ui/button'
import { ToastAction } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Loader2,
  Minus,
  PartyPopper,
  Plus,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'

/** yyyy-mm-dd for `n` days from today (local, not UTC — date inputs are local). */
function dateFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const MS_PER_DAY = 86_400_000

/** Warm gold shadow shared by the festive pill CTAs. */
const GOLD_SHADOW = '0 14px 32px -12px rgba(201, 149, 14, 0.6)'
/** Thick birthday-gold-dark border color (theme token with literal fallback). */
const GOLD_EDGE = 'var(--c-birthday-gold-dark, #c9950e)'

/* ------------------------------------------------------------------ */
/* Balloon — tiny CSS party balloon (body + highlight + string)         */
/* (no icon library, no extra deps — pure shapes + the float keyframes) */
/* ------------------------------------------------------------------ */

function Balloon({
  className,
  sizeClass = 'size-8',
  stringClass = 'h-3',
  color,
}: {
  className?: string
  sizeClass?: string
  stringClass?: string
  color: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute z-0 flex flex-col items-center', className)}
    >
      <span
        className={cn('relative block', sizeClass)}
        style={{
          background: color,
          borderRadius: '50% 50% 50% 50% / 62% 62% 42% 42%',
          boxShadow: 'inset -3px -5px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <span className="absolute start-[26%] top-[18%] size-[26%] rounded-full bg-white/65 blur-[1px]" />
      </span>
      <span className={cn('w-px bg-foreground/25', stringClass)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Rental mini-form — inline under a product card                       */
/* (Task 26 DurationSelector replaces the raw date inputs)              */
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
        image: product.images?.[0] ?? '',
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
    <div className="rounded-2xl border-2 border-dashed border-primary/45 bg-secondary/70 p-3.5 sm:p-4">
      <p
        className={`mb-3 flex items-center gap-2 text-xs font-semibold text-foreground/70 ${
          locale === 'ar' ? 'word-spacing-[0.25em]' : 'uppercase tracking-wider'
        }`}
      >
        <CalendarDays aria-hidden="true" className="size-3.5 text-primary" />
        {t('product.rental.title')}
      </p>

      {/* Duration picker — preset chips + framed date fields + days-strand */}
      <DurationSelector
        idPrefix={`bday-rental-${product.id}`}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        minIso={today}
        compact
      />

      {/* quantity stepper */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{t('product.quantity.label')}</span>
        <div className="flex items-center gap-2" role="group" aria-label={t('product.quantity.label')}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full border-2 border-primary/50 bg-background hover:bg-primary/10 hover:text-foreground"
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
            className="size-11 rounded-full border-2 border-primary/50 bg-background hover:bg-primary/10 hover:text-foreground"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            aria-label={t('product.quantity.increase')}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* summary — festive dashed gold plate */}
      <dl className="mt-4 space-y-1.5 rounded-2xl border-[1.5px] border-dashed border-primary/50 bg-primary/[0.06] p-3.5 text-xs">
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
        <div className="flex justify-between border-t border-primary/30 pt-1.5 font-bold text-foreground">
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
        className="btn-lux mt-4 min-h-11 w-full rounded-full border-2 text-sm font-bold"
        style={{ borderColor: GOLD_EDGE, boxShadow: GOLD_SHADOW }}
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
/* Product card — bday-store-card party tile                            */
/* ------------------------------------------------------------------ */

function ProductCard({ product, delay }: { product: ProductDTO; delay: number }) {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const [expanded, setExpanded] = useState(false)

  const name = localizedName(product, locale)
  const description = localizedDescription(product, locale)
  const isOutOfStock = product.stock === 0
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <Reveal delay={delay} className="h-full">
      <article className="bday-store-card relative flex h-full flex-col overflow-hidden">
        {/* image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          {product.images?.[0] ? (
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
          {/* in-stock party ribbon / out-of-stock frosted veil */}
          {!isOutOfStock ? (
            <span
              aria-hidden="true"
              className="absolute end-3 top-3 z-[6] inline-flex size-8 rotate-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgba(201,149,14,0.85)]"
            >
              <PartyPopper className="size-4" />
            </span>
          ) : (
            <div className="stock-veil">
              <span>{t('products.outOfStock')}</span>
            </div>
          )}
        </div>

        {/* party hairline under the image (gold → pink → gold) */}
        <div
          aria-hidden="true"
          className="h-1 w-full"
          style={{
            background: 'linear-gradient(90deg, var(--color-primary), #ffb6c1 50%, var(--color-primary))',
          }}
        />

        {/* body */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <h3 className="font-display text-xl text-foreground sm:text-2xl">{name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          {/* price ticket — perforated plate with punch holes */}
          <div className="mx-1 mt-4">
            <div className="bday-store-ticket rounded-xl px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-2xl leading-none text-primary sm:text-3xl">
                  {formatKwd(product.rentalPricePerDay)}
                </span>
                <span className="text-xs font-medium text-muted-foreground">{t('products.perDay')}</span>
              </div>
              {product.securityDeposit > 0 && (
                <p className="mt-1 text-[0.7rem] text-foreground/60">
                  {t('product.securityDeposit', { amount: formatKwd(product.securityDeposit) })}
                </p>
              )}
            </div>
          </div>

          {/* actions */}
          <div className="mt-auto pt-4">
            {isOutOfStock ? (
              <Button
                variant="outline"
                disabled
                className="min-h-11 w-full cursor-not-allowed rounded-full border-2 border-primary/30 text-sm"
              >
                {t('products.outOfStock')}
              </Button>
            ) : expanded ? (
              <RentalForm product={product} onDone={() => setExpanded(false)} />
            ) : (
              <div className="space-y-1.5">
                <Button
                  onClick={() => setExpanded(true)}
                  aria-expanded={expanded}
                  className="btn-lux min-h-11 w-full rounded-full border-2 text-sm font-bold"
                  style={{ borderColor: GOLD_EDGE, boxShadow: GOLD_SHADOW }}
                >
                  <CalendarDays aria-hidden="true" className="me-2 size-4" />
                  {t('products.rentNow')}
                </Button>
                <button
                  type="button"
                  onClick={() => navigate(`/products/${product.slug}`)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  {t('yourBirthdayProducts.viewProduct')}
                  <ArrowIcon aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    </Reveal>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function BirthdayProductsPage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  const [products, setProducts] = useState<ProductDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const loadSeqRef = useRef(0)

  const load = useCallback(() => {
    // Async-only state updates — safe to call from effects (no sync setState).
    const seq = ++loadSeqRef.current
    withTimeout(fetchProducts({ brand: 'YOUR_BIRTHDAY' }))
      .then((res) => {
        if (loadSeqRef.current !== seq) return
        // Array guard: a malformed payload (products missing) degrades to
        // the empty state instead of crashing products.map.
        setProducts(Array.isArray(res.products) ? res.products : [])
        setFailed(false)
      })
      .catch(() => {
        if (loadSeqRef.current !== seq) return
        setFailed(true)
      })
      .finally(() => {
        if (loadSeqRef.current !== seq) return
        setLoading(false)
      })
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

  /* Title split — the tail words carry the gold squiggle underline. */
  const titleParts = t('yourBirthdayProducts.title').split(' ')
  const titleLead = titleParts[0] ?? ''
  const titleTail = titleParts.slice(1).join(' ')

  return (
    <div className="page-enter relative flex-1 overflow-x-clip bg-background text-foreground">
      {/* confetti field — faint, fading out downward behind the header */}
      <div
        aria-hidden="true"
        className="bday-store-confetti pointer-events-none absolute inset-x-0 top-0 h-[26rem] opacity-40"
        style={{
          maskImage:
            'linear-gradient(to bottom, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.45) 50%, transparent 92%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.45) 50%, transparent 92%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
        {/* ---- festive header ---- */}
        <header className="relative mb-10 text-center sm:mb-14">
          {/* corner balloons — gold / pink / purple, gently bobbing */}
          <Balloon
            className="bday-store-float start-[3%] top-1 hidden md:flex"
            sizeClass="size-10"
            stringClass="h-4"
            color="var(--color-primary)"
          />
          <Balloon
            className="bday-store-float-2 start-[11%] top-9 hidden sm:flex"
            sizeClass="size-6"
            stringClass="h-2.5"
            color="#ffb6c1"
          />
          <Balloon
            className="bday-store-float-2 end-[3%] top-2 hidden opacity-75 md:flex"
            sizeClass="size-9"
            stringClass="h-3.5"
            color="var(--color-foreground)"
          />
          <Balloon
            className="bday-store-float end-[11%] top-10 hidden sm:flex"
            sizeClass="size-6"
            stringClass="h-2.5"
            color="var(--color-primary)"
          />

          <Reveal direction="none">
            <div className="relative z-10 mb-4 flex items-center justify-center gap-3">
              <span aria-hidden="true" className="line-draw-start h-px w-8 bg-primary/50" />
              <span className="eyebrow inline-flex items-center gap-1.5 text-primary/80">
                <PartyPopper aria-hidden="true" className="size-3.5" />
                {t('yourBirthday.nav.brand')}
              </span>
              <span aria-hidden="true" className="line-draw-end h-px w-8 bg-primary/50" />
            </div>
          </Reveal>
          <Reveal direction="none" delay={0.12}>
            <h1 className="relative z-10 font-display text-4xl leading-[1.15] text-foreground sm:text-5xl md:text-6xl">
              {titleLead}{' '}
              <span className="bday-store-squiggle">{titleTail}</span>
            </h1>
          </Reveal>
          <Reveal direction="up" delay={0.24}>
            <p className="relative z-10 mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('yourBirthdayProducts.subtitle')}
            </p>
          </Reveal>
          <Reveal direction="up" delay={0.34}>
            <span className="relative z-10 mt-5 inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-foreground/80">
              <Sparkles aria-hidden="true" className="size-3.5 text-primary" />
              {t('yourBirthdayProducts.collectionNote')}
            </span>
          </Reveal>
        </header>

        {/* ---- product grid ---- */}
        <section
          aria-label={t('products.title')}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
        >
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="overflow-hidden rounded-[1.25rem] border-2 border-primary/25 bg-card shadow-[0_18px_44px_-24px_rgba(201,149,14,0.42)]"
                >
                  <div className="shimmer aspect-[4/3] w-full" />
                  <div className="space-y-3 p-5">
                    <div className="shimmer h-6 w-2/3 rounded-full" />
                    <div className="shimmer h-4 w-full rounded-full" />
                    <div className="shimmer h-14 w-full rounded-xl" />
                    <div className="shimmer h-11 w-full rounded-full" />
                  </div>
                </div>
              ))
            : products.map((product, i) => (
                <ProductCard key={product.id} product={product} delay={(i % 3) * 0.1} />
              ))}
        </section>

        {/* ---- error state ---- */}
        {!loading && failed && (
          <Reveal direction="up" className="mx-auto mt-10 max-w-md">
            <div role="alert" className="bday-store-card p-8 text-center sm:p-10">
              <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-primary">
                <AlertCircle aria-hidden="true" className="size-6" />
              </span>
              <p className="mb-5 text-sm text-muted-foreground">{t('common.error')}</p>
              <MagneticButton
                onClick={handleRetry}
                ariaLabel={t('common.retry')}
                className="min-h-11 border-2 border-[#c9950e] bg-transparent px-6 font-semibold text-primary hover:bg-primary/10"
              >
                {t('common.retry')}
              </MagneticButton>
            </div>
          </Reveal>
        )}

        {/* ---- empty state ---- */}
        {!loading && !failed && products.length === 0 && (
          <Reveal direction="up" className="mx-auto mt-10 max-w-md">
            <div className="bday-store-card relative p-8 text-center sm:p-10">
              <Balloon
                className="bday-store-float-2 end-6 top-3"
                sizeClass="size-7"
                stringClass="h-2.5"
                color="#ffb6c1"
              />
              <p className="font-display relative z-10 mb-2 text-xl text-foreground">
                {t('products.empty.title')}
              </p>
              <p className="relative z-10 text-sm text-muted-foreground">
                {t('products.empty.subtitle')}
              </p>
            </div>
          </Reveal>
        )}

        {/* ---- final CTA — dashed party card ---- */}
        {!loading && !failed && (
          <section aria-label={t('yourBirthdayProducts.letUsDecorate')} className="mt-14 sm:mt-16">
            <Reveal direction="scale">
              <TiltCard max={4} className="rounded-[1.5rem]">
                <div
                  className="relative overflow-hidden rounded-[1.5rem] border-2 border-dashed p-8 text-center sm:p-12"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-primary) 55%, transparent)',
                    background:
                      'linear-gradient(165deg, color-mix(in srgb, var(--color-primary) 12%, transparent), color-mix(in srgb, #ffb6c1 14%, transparent) 55%, color-mix(in srgb, var(--color-primary) 5%, transparent))',
                    boxShadow: '0 28px 64px -30px rgba(201, 149, 14, 0.6)',
                  }}
                >
                  {/* confetti sprinkle inside the card */}
                  <div
                    aria-hidden="true"
                    className="bday-store-confetti pointer-events-none absolute inset-0 opacity-30"
                    style={{
                      maskImage:
                        'radial-gradient(ellipse 70% 90% at 50% 50%, rgba(0, 0, 0, 0.9), transparent 78%)',
                      WebkitMaskImage:
                        'radial-gradient(ellipse 70% 90% at 50% 50%, rgba(0, 0, 0, 0.9), transparent 78%)',
                    }}
                  />
                  {/* small floating balloons peeking over the card edge */}
                  <Balloon
                    className="bday-store-float -top-1 start-6"
                    sizeClass="size-8"
                    stringClass="h-3"
                    color="#ffb6c1"
                  />
                  <Balloon
                    className="bday-store-float-2 -top-2 end-8"
                    sizeClass="size-10"
                    stringClass="h-4"
                    color="var(--color-primary)"
                  />
                  <div className="relative z-10">
                    <span className="mx-auto mb-4 flex size-12 rotate-6 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/15 text-primary">
                      <PartyPopper aria-hidden="true" className="size-6" />
                    </span>
                    <h2 className="font-display text-2xl text-foreground sm:text-4xl">
                      {t('yourBirthdayProducts.letUsDecorate')}
                    </h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {t('yourBirthday.cta.subtitle')}
                    </p>
                    <MagneticButton
                      onClick={() => navigate('/your-birthday/contact')}
                      ariaLabel={t('yourBirthdayProducts.letUsDecorate')}
                      className="mt-6 min-h-11 border-2 border-[#c9950e] bg-primary font-bold text-primary-foreground shadow-[0_14px_36px_-12px_rgba(201,149,14,0.75)]"
                    >
                      <Sparkles aria-hidden="true" className="size-4" />
                      {t('yourBirthday.cta.button')}
                      <ArrowIcon aria-hidden="true" className="size-4" />
                    </MagneticButton>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          </section>
        )}
      </div>
    </div>
  )
}
