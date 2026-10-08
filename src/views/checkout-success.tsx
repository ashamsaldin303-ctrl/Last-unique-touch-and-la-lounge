'use client'

/**
 * CHECKOUT SUCCESS — route /checkout/success.
 *
 * Reproduces the original repo's success-view with an upgraded animated
 * SVG (circle + check stroke draw), the order id read from
 * sessionStorage('lut_last_order'), the five next-steps and the two CTAs
 * (home / browse more products).
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  CheckCheck,
  Mail,
  Package,
  Phone,
  Truck,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { formatKwd } from '@/lib/products'
import { Reveal } from '@/components/shared/reveal'
import { Button } from '@/components/ui/button'

const LAST_ORDER_KEY = 'lut_last_order'

export default function CheckoutSuccessPage() {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()

  const [orderId, setOrderId] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { orderId?: string; total?: number }
        // Type guard: a hand-poisoned entry could hold a non-string orderId
        // (a number would crash .slice below at render).
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sync from the sessionStorage external store on mount
        if (typeof parsed.orderId === 'string' && parsed.orderId) setOrderId(parsed.orderId)
        if (typeof parsed.total === 'number' && Number.isFinite(parsed.total) && parsed.total > 0)
          setTotal(parsed.total)
      }
      /* One-shot success: consume the entry so /checkout/payment and this
         page cannot stay re-reachable with a live "pay" flow for an already
         processed order (component state keeps the id/total for the current
         view; a later refresh shows the generic success card). */
      sessionStorage.removeItem(LAST_ORDER_KEY)
    } catch {
      /* corrupted entry → show the page without the order id */
    }
  }, [])

  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  const steps = [
    { icon: Package, label: t('checkout.success.nextSteps.step1') },
    { icon: Phone, label: t('checkout.success.nextSteps.step2') },
    { icon: Truck, label: t('checkout.success.nextSteps.step3') },
    { icon: Mail, label: t('checkout.success.nextSteps.step4') },
    { icon: CalendarPlus, label: t('checkout.success.nextSteps.step5') },
  ]

  return (
    <div className="relative mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-20">
      {/* Soft gold radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 max-w-md rounded-full bg-primary/10 blur-3xl"
      />

      {/* Animated success mark — circle + check stroke draw */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.1 }}
        className="relative mx-auto mb-6 flex size-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10"
      >
        <motion.svg
          viewBox="0 0 52 52"
          className="size-14 text-primary"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.circle
            cx="26"
            cy="26"
            r="23"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
          <motion.path
            d="M15.5 27l7.5 7.5L37 17.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.55, duration: 0.45, ease: 'easeOut' }}
          />
        </motion.svg>
      </motion.div>

      <Reveal delay={0.15}>
        <h1 className="mb-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
          {t('checkout.success.title')}
        </h1>
      </Reveal>

      {orderId && (
        <Reveal delay={0.2}>
          <p className="mb-2 text-sm font-medium tabular-nums text-muted-foreground">
            {t('checkout.success.orderId', { id: orderId.slice(-8) })}
          </p>
        </Reveal>
      )}

      {total !== null && (
        <Reveal delay={0.22}>
          <p className="mb-2 font-display text-lg font-bold tabular-nums text-primary">
            {t('payment.total', { amount: formatKwd(total) })}
          </p>
        </Reveal>
      )}

      <Reveal delay={0.25}>
        <p className="mx-auto mb-10 max-w-md text-muted-foreground">
          {t('checkout.success.subtitle')}
        </p>
      </Reveal>

      {/* Next steps */}
      <Reveal delay={0.3}>
        <div className="lux-card mb-10 rounded-md border border-border bg-card p-6 text-start">
          <h2 className="mb-5 text-center font-display text-lg font-bold text-foreground">
            {t('checkout.success.nextSteps.title')}
          </h2>

          <div className="gold-divider mx-auto mb-6 w-32" />

          <ol className="space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon
              return (
                <motion.li
                  key={step.label}
                  initial={{ opacity: 0, x: locale === 'ar' ? 16 : -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-3"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="pt-1.5 text-sm font-medium text-foreground">{step.label}</span>
                </motion.li>
              )
            })}
          </ol>
        </div>
      </Reveal>

      {/* CTAs */}
      <Reveal delay={0.35}>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            onClick={() => navigate('/')}
            className="btn-lux min-h-[44px] rounded-md px-8 py-3 text-base font-semibold"
          >
            <ArrowIcon className="me-2 size-4" aria-hidden="true" />
            {t('checkout.success.goHome')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/products')}
            className="min-h-[44px] rounded-md px-8 py-3 text-base font-semibold"
          >
            <CheckCheck className="me-2 size-4" aria-hidden="true" />
            {t('checkout.success.browseMore')}
          </Button>
        </div>
      </Reveal>
    </div>
  )
}
