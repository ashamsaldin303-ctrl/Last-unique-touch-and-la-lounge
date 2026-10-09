'use client'

/**
 * Admin Brand Page — «بيت العلامة» (Task 38).
 *
 * One page per house, three routes through the same component:
 *
 *   #/ar/admin/lut        → brand="LUT"
 *   #/ar/admin/la-lounge  → brand="LA_LOUNGE"
 *   #/ar/admin/birthday   → brand="YOUR_BIRTHDAY"
 *
 * Everything on the page is BRAND-SCOPED:
 *   - the hero band carries the house accent (LUT champagne gold ·
 *     La Lounge magenta · Your Birthday amber) over the neutral maison
 *     dark — the whole back office shares one warm-dark surface, each
 *     house page breathes its own color locally;
 *   - KPI cards come from GET /api/admin/stats?brand=<brand> (the same
 *     response shape as the overview, scoped to the house);
 *   - the Products panel is locked to the house (no brand pills, create
 *     dialog seeds the house);
 *   - the Orders panel filters bookings by the house's brand.
 *
 * Session: the shared <AdminGate/> + useAdminSession() guard deep links;
 * any 401 (panel fetches, this page's own stats load) drops the page back
 * to the gate with the expired notice, exactly like the overview.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Lock,
  LogOut,
  PackageCheck,
  RefreshCw,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Reveal } from '@/components/shared/reveal'
import { AnimatedCounter } from '@/components/shared/upgrade/animated-counter'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { useAdminSession } from '@/components/admin/use-admin-session'
import { AdminGate } from '@/components/admin/admin-gate'
import { AdminBackdrop, AdminToaster, CheckingState, PanelSkeleton } from '@/components/admin/admin-kit'
import { ADMIN_BRAND_META, type Brand } from '@/components/admin/brand-theme'

// Self-fetching panels, scoped through the `brand` prop (wave contract +
// Task 38 brand-scoping). Dynamic import keeps the ~4.5k lines of
// back-office code out of anonymous shoppers' bundles.
const OrdersPanel = dynamic(() => import('@/components/admin/orders-panel'), {
  ssr: false,
  loading: () => <PanelSkeleton />,
})
const ProductsPanel = dynamic(() => import('@/components/admin/products-panel'), {
  ssr: false,
  loading: () => <PanelSkeleton />,
})

/* ============================================================
   Types
   ============================================================ */

/** GET /api/admin/stats?brand=… — same shape as the overview, scoped. */
interface BrandAdminStats {
  totalBookings: number
  pendingBookings: number
  confirmedBookings: number
  cancelledBookings: number
  completedBookings: number
  expectedRevenue: number
  totalProducts: number
  activeProducts: number
  last7Bookings: number
}

type TabId = 'products' | 'orders'
type StatsPhase = 'idle' | 'loading' | 'error'

const TABS: TabId[] = ['products', 'orders']

/* ============================================================
   Brand-scoped KPI card — accent-tinted numeral
   ============================================================ */

interface BrandKpiCardProps {
  icon: LucideIcon
  label: string
  value: number
  accentText: string
  accentSoft: string
  accentBorder: string
  /** 'kwd' renders the 3-decimal Kuwaiti Dinar figure (dir=ltr). */
  format?: 'integer' | 'kwd'
  currencyLabel?: string
  badge?: string | null
  delay?: number
}

function BrandKpiCard({
  icon: Icon,
  label,
  value,
  accentText,
  accentSoft,
  accentBorder,
  format = 'integer',
  currencyLabel,
  badge = null,
  delay = 0,
}: BrandKpiCardProps) {
  return (
    <Reveal delay={delay} className="h-full">
      <Card className="lux-card h-full gap-0 overflow-hidden rounded-xl border-border/60 py-0">
        <CardContent className="flex items-start justify-between gap-3 p-5 sm:p-6">
          <div className="flex min-w-0 flex-col items-start">
            <span className="eyebrow text-[10px] text-muted-foreground sm:text-[11px]">{label}</span>
            <div className="mt-3 font-display text-3xl leading-none sm:text-4xl" dir="ltr">
              {format === 'kwd' ? (
                <span className="tabular-nums" style={{ color: accentText }}>
                  {value.toLocaleString('en-US', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                  {currencyLabel ? (
                    <span className="ms-1.5 text-sm font-normal text-muted-foreground">{currencyLabel}</span>
                  ) : null}
                </span>
              ) : (
                <span style={{ color: accentText }}>
                  <AnimatedCounter value={value} />
                </span>
              )}
            </div>
            {badge ? (
              <span
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
                style={{ color: accentText, borderColor: accentBorder, backgroundColor: accentSoft }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: accentText }}
                  aria-hidden="true"
                />
                {badge}
              </span>
            ) : null}
          </div>
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-lg border"
            style={{ color: accentText, backgroundColor: accentSoft, borderColor: accentBorder }}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </Reveal>
  )
}

/* ============================================================
   The page
   ============================================================ */

export default function AdminBrandPage({ brand }: { brand: Brand }) {
  const { t, locale } = useI18n()
  const { href } = useRouter()
  const meta = ADMIN_BRAND_META[brand]
  const { phase, sessionExpired, login, logout, markUnauthorized } = useAdminSession()

  const [stats, setStats] = useState<BrandAdminStats | null>(null)
  const [statsPhase, setStatsPhase] = useState<StatsPhase>('idle')
  const [tab, setTab] = useState<TabId>('products')

  /* Neutral maison identity (re-asserted on locale flips — the router's
     BrandThemeSetter would stamp e.g. 'lalounge' for /admin/la-lounge). */
  useEffect(() => {
    document.documentElement.dataset.brand = 'neutral'
  }, [locale])

  /* Brand-scoped KPI loader — sequence-guarded (stale successes can never
     overwrite newer state), 401 → the shared gate. */
  const statsRequestIdRef = useRef(0)
  const loadStats = useCallback(async () => {
    const id = ++statsRequestIdRef.current
    setStatsPhase('loading')
    try {
      const res = await fetch(`/api/admin/stats?brand=${encodeURIComponent(brand)}`, {
        cache: 'no-store',
      })
      if (statsRequestIdRef.current !== id) return
      if (res.status === 401) {
        markUnauthorized()
        return
      }
      if (!res.ok) throw new Error(`admin stats ${res.status}`)
      const data = (await res.json()) as BrandAdminStats
      if (statsRequestIdRef.current !== id) return
      setStats(data)
      setStatsPhase('idle')
    } catch {
      if (statsRequestIdRef.current !== id) return
      setStatsPhase('error')
    }
  }, [brand, markUnauthorized])

  useEffect(() => {
    if (phase === 'ready') void loadStats()
  }, [phase, loadStats])

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Maison backdrop (shared kit) + the house's own accent glow */}
      <AdminBackdrop particleCount={phase === 'gate' ? 22 : 10} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 55% 30% at 50% -6%, ${meta.accentSoft}, transparent 65%)`,
        }}
      />
      <AdminToaster />

      {/* ---------- 1. Login gate (deep-link guard) ---------- */}
      {phase === 'checking' ? <CheckingState label={t('admin.common.loading')} /> : null}

      {phase === 'gate' ? <AdminGate onLogin={login} sessionExpired={sessionExpired} /> : null}

      {/* ---------- 2. House dashboard ---------- */}
      {phase === 'ready' ? (
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-10 pt-24 sm:px-6 sm:pb-10 sm:pt-28 lg:px-8">
          {/* House header — back to the overview + house identity */}
          <header className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-3">
                <a
                  href={href('/admin')}
                  className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                  {t('admin.brand.backToAdmin')}
                </a>
                <div className="flex items-center gap-4">
                  <span
                    className="flex size-14 shrink-0 items-center justify-center rounded-xl border sm:size-16"
                    style={{
                      color: meta.accentText,
                      backgroundColor: meta.accentSoft,
                      borderColor: meta.accentBorder,
                    }}
                  >
                    <meta.icon className="size-7 sm:size-8" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="eyebrow text-[11px] text-muted-foreground">
                      {t('admin.brand.houseEyebrow')}
                    </p>
                    <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
                      {t(meta.labelKey)}
                    </h1>
                    <p className="text-sm text-muted-foreground">{t(meta.taglineKey)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <a
                  href={href(meta.sitePath)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/70 px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  {t('admin.brands.viewStorefront')}
                </a>
                <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary">
                  <Lock className="size-3.5" aria-hidden="true" />
                  {t('admin.secureBadge')}
                </span>
                <Button
                  variant="outline"
                  onClick={() => void logout()}
                  className="min-h-11 rounded-md border-primary/30 px-4 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <LogOut aria-hidden="true" />
                  {t('admin.logout')}
                </Button>
              </div>
            </div>
            {/* Brand accent hairline under the header */}
            <span
              aria-hidden="true"
              className="h-[2px] w-full rounded-full opacity-70"
              style={{
                background: `linear-gradient(90deg, transparent 2%, ${meta.accent}, transparent 98%)`,
              }}
            />
          </header>

          {/* House KPI band (scoped) */}
          <section aria-label={t('admin.stats.sectionLabel')} className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-xl text-foreground sm:text-2xl">
                {t('admin.brand.kpiTitle')}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void loadStats()}
                disabled={statsPhase === 'loading'}
                aria-label={t('admin.common.refresh')}
                className="size-11 rounded-lg text-muted-foreground hover:text-primary"
              >
                <RefreshCw
                  className={cn('size-4', statsPhase === 'loading' && 'animate-spin')}
                  aria-hidden="true"
                />
              </Button>
            </div>

            {statsPhase === 'error' ? (
              <div
                role="alert"
                className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center"
              >
                <p className="text-sm text-destructive">{t('admin.common.error')}</p>
                <Button
                  variant="outline"
                  onClick={() => void loadStats()}
                  className="min-h-11 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <RefreshCw aria-hidden="true" />
                  {t('admin.common.retry')}
                </Button>
              </div>
            ) : null}

            {statsPhase === 'loading' && !stats ? (
              <div className="grid gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl sm:h-36" />
                ))}
              </div>
            ) : null}

            {stats ? (
              <div className="grid gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">
                <BrandKpiCard
                  icon={PackageCheck}
                  label={t('admin.stats.activeProducts')}
                  value={stats.activeProducts}
                  badge={`${t('admin.brand.totalProductsLabel')}: ${stats.totalProducts.toLocaleString('en-US')}`}
                  accentText={meta.accentText}
                  accentSoft={meta.accentSoft}
                  accentBorder={meta.accentBorder}
                />
                <BrandKpiCard
                  icon={CalendarClock}
                  label={t('admin.stats.totalBookings')}
                  value={stats.totalBookings}
                  badge={
                    stats.last7Bookings > 0
                      ? `${t('admin.stats.last7')}: ${stats.last7Bookings.toLocaleString('en-US')}`
                      : null
                  }
                  accentText={meta.accentText}
                  accentSoft={meta.accentSoft}
                  accentBorder={meta.accentBorder}
                  delay={0.06}
                />
                <BrandKpiCard
                  icon={Clock}
                  label={t('admin.stats.pendingBookings')}
                  value={stats.pendingBookings}
                  accentText={meta.accentText}
                  accentSoft={meta.accentSoft}
                  accentBorder={meta.accentBorder}
                  delay={0.12}
                />
                <BrandKpiCard
                  icon={CheckCircle2}
                  label={t('admin.stats.confirmedBookings')}
                  value={stats.confirmedBookings}
                  accentText={meta.accentText}
                  accentSoft={meta.accentSoft}
                  accentBorder={meta.accentBorder}
                  delay={0.18}
                />
                <BrandKpiCard
                  icon={BadgeCheck}
                  label={t('admin.stats.completedBookings')}
                  value={stats.completedBookings}
                  accentText={meta.accentText}
                  accentSoft={meta.accentSoft}
                  accentBorder={meta.accentBorder}
                  delay={0.24}
                />
                <BrandKpiCard
                  icon={Coins}
                  label={t('admin.stats.expectedRevenue')}
                  value={stats.expectedRevenue}
                  format="kwd"
                  currencyLabel={t('admin.common.kwd')}
                  accentText={meta.accentText}
                  accentSoft={meta.accentSoft}
                  accentBorder={meta.accentBorder}
                  delay={0.3}
                />
              </div>
            ) : null}
          </section>

          {/* Scoped tab band — Products / Orders for THIS house */}
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as TabId)
              void loadStats()
            }}
            className="gap-0"
          >
            <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border/70 bg-transparent p-0 sm:w-fit">
              {TABS.map((id) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="min-h-11 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  {t(`admin.tabs.${id}`)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="products" className="pt-6">
              <ProductsPanel brand={brand} />
            </TabsContent>
            <TabsContent value="orders" className="pt-6">
              <OrdersPanel brand={brand} />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  )
}
