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

import { useMemo, useRef, useState } from 'react'
import { useForm, useWatch, type FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, ShieldCheck, ShoppingCart } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { localizedName, formatKwd } from '@/lib/products'
import { useCart, cartTotals, isSafeCartItem, type CartItem } from '@/lib/cart-store'
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

/** Translator signature accepted by the schema factory (narrower than the
 *  full i18n t so the factory stays dependency-free). */
type TFunc = (key: string) => string

/* Localized schema factory — built once per locale (useMemo on [t]) with a
 *  per-rule message, so every zod issue carries the right localized text:
 *  a max-length violation can no longer surface a min-length message (M3). */
const makeCheckoutSchema = (t: TFunc) =>
  z.object({
    customerName: z
      .string()
      .min(3, t('checkout.form.errors.nameMinLength'))
      .max(100, t('checkout.form.errors.nameMaxLength')),
    // ASCII + Arabic-Indic digits (٠-٩) — parity with the /contact form, so
    // Kuwaiti users typing local numerals pass checkout validation too.
    customerPhone: z.string().regex(/^\+?[0-9٠-٩\s-]{8,20}$/, t('checkout.form.errors.phoneInvalid')),
    customerEmail: z
      .string()
      .email(t('checkout.form.errors.emailInvalid'))
      .max(200, t('checkout.form.errors.emailMaxLength')),
    address: z
      .string()
      .min(10, t('checkout.form.errors.addressMinLength'))
      .max(500, t('checkout.form.errors.addressMaxLength')),
    city: z
      .string()
      .min(2, t('checkout.form.errors.cityMinLength'))
      .max(100, t('checkout.form.errors.cityMaxLength')),
    notes: z.string().max(2000, t('checkout.form.errors.notesMaxLength')).optional(),
  })

type CheckoutSchema = ReturnType<typeof makeCheckoutSchema>
type CheckoutFormData = z.infer<CheckoutSchema>

/** Message for a failed field: an empty value reads as "required", a
 *  too_big violation reads its max-length key, anything else falls back to
 *  the schema's own per-rule message (min / format — makeCheckoutSchema
 *  already localized those). Branches on the zod issue type mapped by
 *  zodResolver (M3). */
function checkoutErrorMessage(
  t: TFunc,
  error: FieldError | undefined,
  value: string,
  requiredKey: string,
  maxLengthKey?: string
): string {
  if (value.trim() === '') return t(requiredKey)
  if (maxLengthKey && error?.type === 'too_big') return t(maxLengthKey)
  return error?.message ?? t(requiredKey)
}

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

  /* Sanitized rows — poisoned/legacy localStorage lines (missing fields /
     wrong types) would crash formatKwd/cartTotals at render; only fully
     valid lines are shown and submitted. */
  const safeItems = items.filter(isSafeCartItem)

  /* Ref-based double-submit guard: the Enter key can re-fire onSubmit in
     the same tick as a click, before the disabled state re-renders. */
  const submittingRef = useRef(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)

  /* One schema per locale — rebuilt only when the language changes. */
  const schema = useMemo(() => makeCheckoutSchema(t), [t])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(schema),
    defaultValues: { customerName: '', customerPhone: '', customerEmail: '', address: '', city: '', notes: '' },
  })

  /* Field-level useWatch subscriptions instead of render-time watch():
   *  the incompatible-library lint warning disappears and the React
   *  Compiler can memoize this page, so keystrokes no longer re-render
   *  the whole order-summary column. Empty-string checks pick the
   *  required vs. format error message. Must run before the early
   *  returns below (hook order). */
  const nameVal = useWatch({ control, name: 'customerName' }) ?? ''
  const phoneVal = useWatch({ control, name: 'customerPhone' }) ?? ''
  const emailVal = useWatch({ control, name: 'customerEmail' }) ?? ''
  const addressVal = useWatch({ control, name: 'address' }) ?? ''
  const cityVal = useWatch({ control, name: 'city' }) ?? ''

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

  /* Empty cart (or a fully-poisoned one) — a designed state: concierge card with gold hairline,
     entrance motion, icon medallion, subtitle and a clear CTA (matches the
     cart page's empty-state pattern). */
  if (safeItems.length === 0) {
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

  const totals = cartTotals(safeItems)

  const onSubmit = async (data: CheckoutFormData) => {
    if (submitting || submittingRef.current) return
    // Terms gate as a VISIBLE validation error (the submit button stays
    // clickable — see the button below — so empty-field errors also surface
    // on the first attempt instead of a silently disabled button).
    if (!termsAccepted) {
      setTermsError(t('checkout.termsRequired'))
      return
    }
    setTermsError(null)
    submittingRef.current = true
    setSubmitting(true)
    setErrorMessage(null)

    // Flat payload — the server recomputes prices from the DB (valid rows
    // only; malformed persisted lines are never submitted).
    const payload = {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      address: data.address,
      city: data.city,
      notes: data.notes || undefined,
      items: safeItems.map((item: CartItem) => ({
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
        submittingRef.current = false
        setSubmitting(false)
        return
      }

      // Success: clear the cart, remember the order (with an items snapshot
      // so the payment screen can show what is being paid for), then continue
      // to the PAYMENT step — the original repo's flow is checkout → payment
      // → success, and skipping payment orphaned that whole trust screen.
      sessionStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({
          orderId: result.orderId,
          total: result.total ?? totals.total,
          items: safeItems.map((item: CartItem) => ({
            productId: item.productId,
            slug: item.slug,
            nameAr: item.nameAr,
            nameEn: item.nameEn,
            image: item.image,
            startDate: item.startDate,
            endDate: item.endDate,
            quantity: item.quantity,
            days: item.days,
            total: item.total,
          })),
        })
      )
      clear()
      navigate('/checkout/payment')
    } catch {
      const message = t('checkout.errors.internal_error')
      setErrorMessage(message)
      toast({ title: t('common.error'), description: message, variant: 'destructive' })
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const errClasses = 'flex items-center gap-1.5 text-xs text-destructive mt-1'
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
              // RHF's handleSubmit only invokes the valid-callback from the
              // DOM submit event (after async validation) — never during
              // render. The same-tick double-submit guard reads/writes
              // submittingRef inside the callback by design, so silence the
              // compiler's conservative advisory (repo policy for
              // react-hook-form integrations — same as set-state-in-effect).
              // eslint-disable-next-line react-hooks/refs
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
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
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
                      {checkoutErrorMessage(
                        t,
                        errors.customerName,
                        nameVal,
                        'checkout.form.errors.nameRequired',
                        'checkout.form.errors.nameMaxLength'
                      )}
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
                        {checkoutErrorMessage(t, errors.customerPhone, phoneVal, 'checkout.form.errors.phoneRequired')}
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
                        {checkoutErrorMessage(
                          t,
                          errors.customerEmail,
                          emailVal,
                          'checkout.form.errors.emailRequired',
                          'checkout.form.errors.emailMaxLength'
                        )}
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
                      {checkoutErrorMessage(
                        t,
                        errors.address,
                        addressVal,
                        'checkout.form.errors.addressRequired',
                        'checkout.form.errors.addressMaxLength'
                      )}
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
                    <span>
                      {checkoutErrorMessage(
                        t,
                        errors.city,
                        cityVal,
                        'checkout.form.errors.cityRequired',
                        'checkout.form.errors.cityMaxLength'
                      )}
                    </span>
                  </p>
                )}
              </div>

              {/* Notes — maxLength makes the 2000-cap un-triggerable by
                  typing; the error row below is the safety net for
                  autofill/programmatic overflow (previously silent). */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">{t('checkout.form.notes')}</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  maxLength={2000}
                  aria-invalid={!!errors.notes}
                  aria-describedby={errors.notes ? 'notes-error' : undefined}
                  {...register('notes')}
                  className="bg-background"
                />
                {errors.notes && (
                  <p id="notes-error" role="alert" className={errClasses}>
                    {errIcon}
                    <span>{errors.notes.message ?? t('checkout.form.errors.notesMaxLength')}</span>
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked)
                    if (e.target.checked) setTermsError(null)
                  }}
                  className="mt-1 size-5 accent-[var(--primary)]"
                  aria-required="true"
                  aria-invalid={!!termsError}
                  aria-describedby={termsError ? 'terms-error' : undefined}
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
              {termsError && (
                <p
                  id="terms-error"
                  role="alert"
                  className="-mt-3 flex items-center gap-1.5 text-xs text-destructive"
                >
                  {errIcon}
                  <span>{termsError}</span>
                </p>
              )}

              {/* Submit — disabled ONLY while submitting: the terms gate is
                  enforced by validation above so it never silently blocks
                  the click (field errors become visible on empty submit). */}
              <Button
                type="submit"
                disabled={submitting}
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
                {safeItems.map((item, index) => {
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
