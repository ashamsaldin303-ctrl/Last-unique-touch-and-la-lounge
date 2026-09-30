'use client'

/**
 * CHECKOUT — route /checkout.
 *
 * Reproduces the original repo's checkout-view: customer form with zod
 * validation (react-hook-form) on the start column, condensed order
 * summary with the availability note on the end column. Submits a flat
 * POST /api/orders payload (the server recomputes all prices — no totals
 * are sent); on success the cart is cleared, the last order is stored in
 * sessionStorage('lut_last_order') and the user is routed to the success
 * page. Server error codes map to checkout.errors.* (snake keys).
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, ShieldCheck, ShoppingCart } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { localizedName, formatKwd } from '@/lib/products'
import { useCart, cartTotals, type CartItem } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { Reveal } from '@/components/shared/reveal'
import { GrandTotalRow, TotalsBlock } from '@/components/shop/totals-block'
import { formatDate } from '@/components/shop/format'
import { useCartHydrated } from '@/components/shop/use-cart-hydrated'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Image from 'next/image'

const LAST_ORDER_KEY = 'lut_last_order'

const checkoutSchema = z.object({
  customerName: z.string().min(3).max(100),
  customerPhone: z.string().regex(/^\+?[0-9\s-]{8,20}$/),
  customerEmail: z.string().email().max(200),
  address: z.string().min(10).max(500),
  city: z.string().min(2).max(100),
  notes: z.string().max(2000).optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

/* Server error code → message key (snake_case keys per the messages). */
const ERROR_KEYS: Record<string, string> = {
  invalid_input: 'checkout.errors.invalid_input',
  invalid_products: 'checkout.errors.invalid_products',
  invalid_dates: 'checkout.errors.invalid_dates',
  insufficient_stock: 'checkout.errors.insufficient_stock',
  duplicate_request: 'checkout.errors.duplicate_request',
  days_mismatch: 'checkout.errors.days_mismatch',
  total_mismatch: 'checkout.errors.total_mismatch',
  rate_limited: 'checkout.errors.rate_limited',
  price_mismatch: 'checkout.errors.price_mismatch',
  not_available: 'checkout.errors.not_available',
  internal_error: 'checkout.errors.internal_error',
}

export default function CheckoutPage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()
  const { items, clear } = useCart()
  const hydrated = useCartHydrated()
  const { toast } = useToast()

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { customerName: '', customerPhone: '', customerEmail: '', address: '', city: '', notes: '' },
  })

  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  /* Hydration guard */
  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6" aria-busy="true">
        <div className="shimmer h-10 w-64 rounded" aria-hidden="true" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    )
  }

  /* Empty cart — a designed state: concierge card with gold hairline,
     entrance motion, icon medallion, subtitle and a clear CTA (matches the
     cart page's empty-state pattern). */
  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="concierge-card relative w-full rounded-2xl border border-border bg-card px-6 py-12 sm:px-12"
        >
          <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
            <ShoppingCart className="size-10 text-primary" aria-hidden="true" />
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold text-foreground sm:text-3xl">
            {t('checkout.empty.title')}
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('checkout.empty.subtitle')}
          </p>
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

  const onSubmit = async (data: CheckoutFormData) => {
    if (submitting) return
    setSubmitting(true)
    setErrorMessage(null)

    // Flat payload — the server recomputes prices from the DB.
    const payload = {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      address: data.address,
      city: data.city,
      notes: data.notes || undefined,
      items: items.map((item: CartItem) => ({
        productId: item.productId,
        startDate: item.startDate,
        endDate: item.endDate,
        quantity: item.quantity,
        days: item.days,
      })),
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        orderId?: string
        total?: number
        error?: string
      }

      if (!response.ok || !result.ok || !result.orderId) {
        const key = ERROR_KEYS[result.error ?? ''] ?? 'checkout.errors.internal_error'
        const message = t(key)
        setErrorMessage(message)
        toast({ title: t('common.error'), description: message, variant: 'destructive' })
        setSubmitting(false)
        return
      }

      // Success: clear the cart, remember the order, go to the success page.
      sessionStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({ orderId: result.orderId, total: result.total ?? totals.total })
      )
      clear()
      navigate('/checkout/success')
    } catch {
      const message = t('checkout.errors.internal_error')
      setErrorMessage(message)
      toast({ title: t('common.error'), description: message, variant: 'destructive' })
      setSubmitting(false)
    }
  }

  /* Empty-string checks pick required vs. format error messages. */
  const nameVal = watch('customerName') ?? ''
  const phoneVal = watch('customerPhone') ?? ''
  const emailVal = watch('customerEmail') ?? ''
  const addressVal = watch('address') ?? ''

  const errClasses = 'flex items-center gap-1.5 text-xs text-red-600 mt-1'
  const errIcon = <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      {/* Header */}
      <Reveal className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
          <span className="eyebrow text-[0.625rem] text-primary/90">{t('checkout.title')}</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          {t('checkout.title')}
        </h1>
      </Reveal>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ---- Customer form ---- */}
        <div className="lg:col-span-2">
          <Reveal>
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-5 rounded-md border border-border bg-card p-5 shadow-lg shadow-primary/5 sm:p-6"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
                  <span className="eyebrow text-[0.625rem] text-primary/90">
                    {t('checkout.form.customerInfo')}
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  {t('checkout.form.customerInfo')}
                </h2>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-red-600/30 bg-red-500/10 p-3 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="customerName">{t('checkout.form.name')}</Label>
                <Input
                  id="customerName"
                  autoComplete="name"
                  aria-invalid={!!errors.customerName}
                  aria-describedby={errors.customerName ? 'customerName-error' : undefined}
                  {...register('customerName')}
                  className="h-11 bg-background"
                />
                {errors.customerName && (
                  <p id="customerName-error" role="alert" className={errClasses}>
                    {errIcon}
                    <span>
                      {nameVal.trim() === ''
                        ? t('checkout.form.errors.nameRequired')
                        : t('checkout.form.errors.nameMinLength')}
                    </span>
                  </p>
                )}
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="customerPhone">{t('checkout.form.phone')}</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    dir="ltr"
                    autoComplete="tel"
                    aria-invalid={!!errors.customerPhone}
                    aria-describedby={errors.customerPhone ? 'customerPhone-error' : undefined}
                    {...register('customerPhone')}
                    className="h-11 bg-background text-start"
                  />
                  {errors.customerPhone && (
                    <p id="customerPhone-error" role="alert" className={errClasses}>
                      {errIcon}
                      <span>
                        {phoneVal.trim() === ''
                          ? t('checkout.form.errors.phoneRequired')
                          : t('checkout.form.errors.phoneInvalid')}
                      </span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customerEmail">{t('checkout.form.email')}</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    aria-invalid={!!errors.customerEmail}
                    aria-describedby={errors.customerEmail ? 'customerEmail-error' : undefined}
                    {...register('customerEmail')}
                    className="h-11 bg-background text-start"
                  />
                  {errors.customerEmail && (
                    <p id="customerEmail-error" role="alert" className={errClasses}>
                      {errIcon}
                      <span>
                        {emailVal.trim() === ''
                          ? t('checkout.form.errors.emailRequired')
                          : t('checkout.form.errors.emailInvalid')}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address">{t('checkout.form.address')}</Label>
                <Textarea
                  id="address"
                  rows={2}
                  autoComplete="street-address"
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? 'address-error' : undefined}
                  {...register('address')}
                  className="bg-background"
                />
                {errors.address && (
                  <p id="address-error" role="alert" className={errClasses}>
                    {errIcon}
                    <span>
                      {addressVal.trim() === ''
                        ? t('checkout.form.errors.addressRequired')
                        : t('checkout.form.errors.addressMinLength')}
                    </span>
                  </p>
                )}
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label htmlFor="city">{t('checkout.form.city')}</Label>
                <Input
                  id="city"
                  autoComplete="address-level2"
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? 'city-error' : undefined}
                  {...register('city')}
                  className="h-11 bg-background"
                />
                {errors.city && (
                  <p id="city-error" role="alert" className={errClasses}>
                    {errIcon}
                    <span>{t('checkout.form.errors.cityRequired')}</span>
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">{t('checkout.form.notes')}</Label>
                <Textarea id="notes" rows={3} {...register('notes')} className="bg-background" />
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 size-5 accent-[var(--primary)]"
                  aria-required="true"
                />
                <label htmlFor="terms" className="text-sm text-foreground">
                  {t('checkout.form.agreePrefix')}
                  <button
                    type="button"
                    onClick={() => navigate('/terms')}
                    className="text-primary underline underline-offset-4"
                  >
                    {t('checkout.form.termsLink')}
                  </button>
                </label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting || !termsAccepted}
                className="btn-lux w-full min-h-[44px] rounded-md py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />
                    {t('checkout.form.submitting')}
                  </>
                ) : (
                  t('checkout.form.submit')
                )}
              </Button>
            </form>
          </Reveal>
        </div>

        {/* ---- Order summary ---- */}
        <div className="lg:col-span-1">
          <Reveal delay={0.1}>
            {/* Double-Bezel receipt (SKILL.md kit): machined ivory plate —
                outer gold shell + concentric inner core, brass-tinted shadow */}
            <div className="sticky top-24 bezel-card bezel-card--light">
            <div className="bezel-core p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
                <span className="eyebrow text-[0.625rem] text-primary/90">
                  {t('checkout.summary.title')}
                </span>
              </div>
              <h2 className="mb-4 font-display text-lg font-bold text-foreground">
                {t('checkout.summary.title')}
              </h2>

              {/* Condensed items */}
              <div className="max-h-64 space-y-3 overflow-y-auto border-b border-border pb-4">
                {items.map((item, index) => {
                  const productName = localizedName(item, locale)
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={productName}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-foreground">
                          {productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('cart.item.period', {
                            start: formatDate(item.startDate, locale),
                            end: formatDate(item.endDate, locale),
                            days: item.days,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                        {formatKwd(item.total)} {t('common.currency')}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <TotalsBlock
                rentalTotal={totals.rentalTotal}
                depositTotal={totals.depositTotal}
                total={totals.total}
                labels={{
                  rental: t('cart.summary.rental'),
                  deposit: t('cart.summary.deposit'),
                  total: t('checkout.summary.total'),
                  currency: t('common.currency'),
                }}
                className="pt-4"
              />

              <GrandTotalRow
                total={totals.total}
                labels={{ total: t('checkout.summary.total'), currency: t('common.currency') }}
                className="mt-3"
              />

              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                {t('checkout.summary.availabilityNote')}
              </p>
            </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
