'use client'

/**
 * PAYMENT — route /checkout/payment (display-only).
 *
 * Per the original repo this step is a *display* flow: no card data is
 * ever posted to a gateway (payment.displayNote). The last order is read
 * from sessionStorage('lut_last_order') — written by the checkout step —
 * and the submit button simulates processing locally (a short spinner
 * followed by an animated success check) before routing to the success
 * page. If no order is found the visitor is redirected to the cart.
 *
 * The amount shown is ALWAYS the stored order's server-confirmed total —
 * never the live cart (the cart is already cleared when this screen
 * mounts, and a re-filled cart must not re-price a placed order).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CreditCard,
  Info,
  Loader2,
  Lock,
  Package,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { formatKwd, localizedName } from '@/lib/products'
import { formatDate } from '@/components/shop/format'
import Image from 'next/image'
import { Reveal } from '@/components/shared/reveal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const LAST_ORDER_KEY = 'lut_last_order'

/** Displayed processing duration before routing to the success page. */
const PAY_DONE_DELAY = 3_400

type Phase = 'form' | 'processing' | 'done'

/** Items snapshot written by the checkout step alongside the order. */
interface OrderItemSnapshot {
  productId: string
  slug: string
  nameAr: string
  nameEn: string
  image: string
  startDate: string
  endDate: string
  quantity: number
  days: number
  total: number
}

interface LastOrder {
  orderId: string
  total: number
  items?: OrderItemSnapshot[]
}

/** Trust gate for the sessionStorage snapshot — a missing/corrupt entry is
 *  already handled (redirect to the cart); this additionally drops malformed
 *  item rows so formatKwd/localizedName can never crash the render. */
function isSafeSnapshotItem(item: unknown): item is OrderItemSnapshot {
  if (!item || typeof item !== 'object') return false
  const it = item as Partial<OrderItemSnapshot>
  return (
    typeof it.productId === 'string' &&
    typeof it.slug === 'string' &&
    typeof it.nameAr === 'string' &&
    typeof it.nameEn === 'string' &&
    typeof it.image === 'string' &&
    typeof it.startDate === 'string' &&
    typeof it.endDate === 'string' &&
    typeof it.quantity === 'number' &&
    Number.isFinite(it.quantity) &&
    typeof it.days === 'number' &&
    Number.isFinite(it.days) &&
    typeof it.total === 'number' &&
    Number.isFinite(it.total)
  )
}

export default function PaymentPage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()

  const [order, setOrder] = useState<LastOrder | null>(null)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<Phase>('form')

  /* Card form UI state (display-only — never submitted anywhere). */
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
    }
  }, [])

  /* Read the last order; redirect to the cart when absent. */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LastOrder>
        if (parsed.orderId) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sync from the sessionStorage external store on mount
          setOrder({
            orderId: String(parsed.orderId),
            total: Number(parsed.total) || 0,
            items: Array.isArray(parsed.items)
              ? (parsed.items as unknown[]).filter(isSafeSnapshotItem)
              : [],
          })
        }
      }
    } catch {
      /* corrupted entry → treat as missing */
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready && !order) navigate('/cart')
  }, [ready, order, navigate])

  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  const formatCardNumber = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }, [])

  const formatExpiry = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
  }, [])

  const handlePay = useCallback(() => {
    if (phase !== 'form') return
    setPhase('processing')
    // Simulated gateway round-trip — this is a display-only flow.
    timersRef.current.push(
      setTimeout(() => setPhase('done'), 2200),
      setTimeout(() => navigate('/checkout/success'), PAY_DONE_DELAY)
    )
  }, [phase, navigate])

  /* Redirect / loading guard */
  if (!ready || !order) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-24 sm:px-6" aria-busy="true">
        <div className="shimmer mx-auto h-10 w-56 rounded" aria-hidden="true" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    )
  }

  /* Items snapshot from the checkout step — the cart itself is cleared by
     the time this screen mounts, so the summary reads from the order. */
  const orderItems = order?.items ?? []

  /* Single source of truth: the stored order's server-confirmed total.
     Never the live cart — a re-filled cart must not re-price an order
     that was already created (H1). */
  const displayTotal = order.total

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      {/* Header */}
      <Reveal className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
          <span className="eyebrow text-[0.625rem] text-primary/90">{t('payment.title')}</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          {t('payment.title')}
        </h1>
      </Reveal>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ---- Left column ---- */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order info card */}
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-card p-4 sm:p-5">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('payment.orderId', { id: order.orderId.slice(-8) })}
                </p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-primary">
                  {t('payment.total', { amount: formatKwd(displayTotal) })}
                </p>
              </div>
              <CreditCard className="size-8 text-primary" aria-hidden="true" />
            </div>
          </Reveal>

          {/* Order items summary (audit: keep the paid-for items visible on
              the payment screen — anchors the purchase decision visually). */}
          {orderItems.length > 0 && (
            <Reveal delay={0.04}>
              <ul className="divide-y divide-border/70 rounded-md border border-border bg-card">
                {orderItems.map((item, idx) => (
                  <li
                    key={`${item.productId}-${item.startDate}-${idx}`}
                    className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4"
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:size-16">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={localizedName(item, locale)}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <Package className="absolute inset-0 m-auto size-5 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {localizedName(item, locale)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t('cart.item.period', {
                          start: formatDate(item.startDate, locale),
                          end: formatDate(item.endDate, locale),
                          days: item.days,
                        })}
                        {item.quantity > 1 ? ` · × ${item.quantity}` : ''}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatKwd(item.total)}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {/* Card form — display only */}
          <Reveal delay={0.08}>
            <div className="space-y-5 rounded-md border border-border bg-card p-5 shadow-lg shadow-primary/5 sm:p-6">
              <div className="flex items-start gap-2 rounded-md border border-primary/25 bg-primary/10 p-3 text-xs leading-relaxed text-foreground">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{t('payment.displayNote')}</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cardNumber">{t('payment.form.cardNumber')}</Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    dir="ltr"
                    placeholder="•••• •••• •••• ••••"
                    value={cardNumber}
                    disabled={phase !== 'form'}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="h-11 bg-background pe-10 text-start tracking-wider"
                  />
                  <CreditCard
                    className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cardName">{t('payment.form.cardName')}</Label>
                <Input
                  id="cardName"
                  autoComplete="cc-name"
                  value={cardName}
                  disabled={phase !== 'form'}
                  onChange={(e) => setCardName(e.target.value)}
                  className="h-11 bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="expiry">{t('payment.form.expiry')}</Label>
                  <Input
                    id="expiry"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    dir="ltr"
                    placeholder="MM/YY"
                    value={expiry}
                    disabled={phase !== 'form'}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className="h-11 bg-background text-start"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cvv">{t('payment.form.cvv')}</Label>
                  <Input
                    id="cvv"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    dir="ltr"
                    placeholder="•••"
                    value={cvv}
                    disabled={phase !== 'form'}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="h-11 bg-background text-start"
                  />
                </div>
              </div>

              {/* Pay-on-confirmation info card */}
              <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-4">
                <Phone className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    {t('payment.payOnConfirmation.title')}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t('payment.payOnConfirmation.body')}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {t('payment.payOnConfirmation.note')}
                  </p>
                </div>
              </div>

              {/* Submit — processing → animated success */}
              <Button
                type="button"
                onClick={handlePay}
                disabled={phase !== 'form'}
                aria-live="polite"
                className={cn(
                  'btn-lux w-full min-h-[44px] rounded-md py-3.5 text-base font-semibold disabled:cursor-default',
                  phase === 'done' && 'bg-emerald-600'
                )}
              >
                {phase === 'form' && t('payment.form.submit', { amount: formatKwd(displayTotal) })}
                {phase === 'processing' && (
                  <>
                    <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />
                    {t('payment.form.processing')}
                  </>
                )}
                {phase === 'done' && (
                  <>
                    <AnimatedCheck />
                    {/* The animated check is aria-hidden — announce the
                        completion for screen readers (aria-live above). */}
                    <span className="sr-only">{t('payment.form.done')}</span>
                  </>
                )}
              </Button>
            </div>
          </Reveal>

          {/* Trust badges */}
          <Reveal delay={0.14}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TrustBadge icon={<Lock className="size-4" aria-hidden="true" />} label={t('payment.trust.ssl')} />
              <TrustBadge
                icon={<ShieldCheck className="size-4" aria-hidden="true" />}
                label={t('payment.trust.fraud')}
              />
              <TrustBadge
                icon={<CreditCard className="size-4" aria-hidden="true" />}
                label={t('payment.trust.cards')}
              />
            </div>
          </Reveal>
        </div>

        {/* ---- Right column: order summary ---- */}
        <div className="lg:col-span-1">
          <Reveal delay={0.1}>
            <div className="sticky top-24 rounded-md border border-border bg-card p-6 shadow-lg shadow-primary/10">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
                <span className="eyebrow text-[0.625rem] text-primary/90">
                  {t('payment.orderSummary')}
                </span>
              </div>
              <h2 className="mb-4 font-display text-lg font-bold text-foreground">
                {t('payment.orderSummary')}
              </h2>

              <p className="text-xs text-muted-foreground">
                {t('payment.orderId', { id: order.orderId.slice(-8) })}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm font-bold text-foreground">
                  {t('checkout.summary.total')}
                </span>
                <span className="font-display text-xl font-bold tabular-nums text-primary">
                  {t('payment.total', { amount: formatKwd(displayTotal) })}
                </span>
              </div>

              {/* Post-order link: the order is already placed (created at
                  checkout) and the cart cleared — "back to cart" would land
                  on a dead end, so keep browsing instead (M2). */}
              <Button
                variant="outline"
                onClick={() => navigate('/products')}
                className="mt-5 w-full min-h-[44px] rounded-md"
              >
                <ArrowIcon className="me-2 size-4 rotate-180" aria-hidden="true" />
                {t('cart.continueShopping')}
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

/* ================= Helpers ================= */

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-xs text-foreground">{label}</span>
    </div>
  )
}

/** Animated circle + check draw (the simulated payment success tick). */
function AnimatedCheck() {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="mx-auto size-6"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      aria-hidden="true"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
      <motion.path
        d="M7.5 12.5l3 3 6-6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.35, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}
