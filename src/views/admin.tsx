'use client'

/**
 * Admin Overview — «بيت الإدارة» (the Administration House, Task 38 redesign).
 *
 * Hash route #/ar/admin · #/en/admin. The command center of the back office:
 *
 *   1. Login gate — shared <AdminGate/> (dark glass card + gold medallion)
 *      driven by useAdminSession(); the httpOnly cookie lands automatically.
 *   2. Dashboard —
 *        · house header (title, secure badge, storefront link, logout)
 *        · six global KPI cards from /api/admin/stats
 *        · THREE BRAND HOUSE CARDS — one per house (LUT · La Lounge ·
 *          Your Birthday), each an accent-framed link to its own admin
 *          page (#/admin/lut · #/admin/la-lounge · #/admin/birthday) with
 *          live per-brand counters (products / bookings / pending) from
 *          the same stats payload.
 *        · global tab band — Orders / Messages / Products (panels are
 *          self-fetching dynamic imports; brand-scoped management lives
 *          on the per-brand pages).
 *
 * Session contract (wave-wide):
 *   - 401 anywhere (panels' useAdminApi, mutation fetches, this page's own
 *     stats load) dispatches 'admin:unauthorized' → useAdminSession drops
 *     the page back to the gate with the expired notice.
 *   - KPIs refresh on login, on every tab switch (mutations land fresh),
 *     and via the header refresh button — sequence-guarded so a stale
 *     success can never overwrite newer state.
 *
 * The house identity stays the neutral warm-dark champagne palette
 * (data-brand="neutral", asserted on every locale flip because the
 * router's brand resolver would otherwise stamp 'lut' on this path).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Armchair,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
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
import { ADMIN_BRANDS, ADMIN_BRAND_META, type Brand } from '@/components/admin/brand-theme'

// Self-fetching panels — default export, no props, dispatch
// 'admin:unauthorized' on 401. Dynamically imported (r3 architecture
// finding): the panels carry ~4.5k lines of back-office code that must
// not ship to anonymous shoppers. ssr:false is allowed — client view.
const OrdersPanel = dynamic(() => import('@/components/admin/orders-panel'), {
  ssr: false,
  loading: () => <PanelSkeleton />,
})
const MessagesPanel = dynamic(() => import('@/components/admin/messages-panel'), {
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

/** Per-brand counters in the stats payload (brand house cards). */
interface BrandStats {
  products: number
  activeProducts: number
  bookings: number
  pendingBookings: number
  revenue: number
}

/** GET /api/admin/stats — contract with the API. */
interface AdminStats {
  totalBookings: number
  pendingBookings: number
  confirmedBookings: number
  cancelledBookings: number
  completedBookings: number
  expectedRevenue: number
  totalMessages: number
  unreadMessages: number
  totalProducts: number
  activeProducts: number
  /** Bookings created in the last 7 days (a count, not a series). */
  last7Bookings: number
  /** Per-house breakdown for the brand cards (defensive: optional so a
   *  stale server during hot-reload degrades to "—" instead of crashing). */
  brands?: Partial<Record<Brand, BrandStats>>
}

type TabId = 'orders' | 'messages' | 'products'
type StatsPhase = 'idle' | 'loading' | 'error'

const TABS: TabId[] = ['orders', 'messages', 'products']

/* ============================================================
   KPI card — big display-font numeral, gold/amber/green tone
   ============================================================ */

type KpiTone = 'gold' | 'amber' | 'green'

const kpiToneNumber: Record<KpiTone, string> = {
  gold: 'text-primary',
  amber: 'text-amber-400',
  green: 'text-emerald-400',
}

const kpiToneIcon: Record<KpiTone, string> = {
  gold: 'border-primary/25 bg-primary/10 text-primary',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-400',
  green: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400',
}

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: number
  tone?: KpiTone
  /** 'kwd' renders the 3-decimal Kuwaiti Dinar figure (dir=ltr). */
  format?: 'integer' | 'kwd'
  currencyLabel?: string
  badge?: string | null
  delay?: number
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = 'gold',
  format = 'integer',
  currencyLabel,
  badge = null,
  delay = 0,
}: KpiCardProps) {
  return (
    <Reveal delay={delay} className="h-full">
      <Card className="lux-card h-full gap-0 overflow-hidden rounded-xl border-border/60 py-0">
        <CardContent className="flex items-start justify-between gap-3 p-5 sm:p-6">
          <div className="flex min-w-0 flex-col items-start">
            <span className="eyebrow text-[10px] text-muted-foreground sm:text-[11px]">{label}</span>
            <div className="mt-3 font-display text-3xl leading-none sm:text-4xl" dir="ltr">
              {format === 'kwd' ? (
                <span className={cn('tabular-nums', kpiToneNumber[tone])}>
                  {value.toLocaleString('en-US', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
                  {currencyLabel ? (
                    <span className="ms-1.5 text-sm font-normal text-muted-foreground">{currencyLabel}</span>
                  ) : null}
                </span>
              ) : (
                <AnimatedCounter value={value} className={kpiToneNumber[tone]} />
              )}
            </div>
            {badge ? (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                {badge}
              </span>
            ) : null}
          </div>
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-lg border',
              kpiToneIcon[tone]
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </Reveal>
  )
}

/* ============================================================
   Brand house card — the per-brand navigation moment
   ============================================================ */

interface BrandCardProps {
  brand: Brand
  stats: BrandStats | undefined
  delay: number
}

function BrandCard({ brand, stats, delay }: BrandCardProps) {
  const { t } = useI18n()
  const { href } = useRouter()
  const meta = ADMIN_BRAND_META[brand]
  const Icon = meta.icon

  /** Tabular counter or a muted dash while stats stream in. */
  const num = (value: number | undefined) =>
    typeof value === 'number' ? value.toLocaleString('en-US') : '—'

  return (
    <Reveal delay={delay} className="h-full">
      <div
        className={cn(
          'lux-card group relative h-full overflow-hidden rounded-xl border-border/60 bg-[#14110B]/95 py-0',
          'transition-[border-color,transform] duration-300 hover:-translate-y-1'
        )}
      >
        {/* Brand accent top hairline */}
        <span
          aria-hidden="true"
          className="absolute inset-x-4 top-0 h-[3px] rounded-full opacity-80"
          style={{
            background: `linear-gradient(90deg, transparent, ${meta.accent}, transparent)`,
          }}
        />

        {/* Whole-card overlay link (manage) — sits under the storefront link */}
        <a
          href={href(meta.adminPath)}
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{ ['--tw-ring-color' as string]: meta.accentBorder }}
          aria-label={`${t(meta.labelKey)} — ${t('admin.brands.manage')}`}
        />

        <div className="relative z-0 flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-lg border"
                style={{
                  color: meta.accentText,
                  backgroundColor: meta.accentSoft,
                  borderColor: meta.accentBorder,
                }}
              >
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-display text-lg leading-tight text-foreground sm:text-xl">
                  {t(meta.labelKey)}
                </h3>
                <p className="text-[11px] leading-snug text-muted-foreground">{t(meta.taglineKey)}</p>
              </div>
            </div>
            <span
              className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 group-hover:scale-110"
              style={{
                color: meta.accentText,
                borderColor: meta.accentBorder,
                backgroundColor: meta.accentSoft,
              }}
              aria-hidden="true"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </span>
          </div>

          {/* Per-brand mini counters */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/50 pt-4">
            <span className="flex items-center gap-1.5 text-sm">
              <span className="text-[11px] text-muted-foreground">{t('admin.stats.activeProducts')}</span>
              <span className="font-display tabular-nums text-foreground" dir="ltr">
                {num(stats?.activeProducts)}
              </span>
              <span className="text-[11px] text-muted-foreground">/ {num(stats?.products)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="text-[11px] text-muted-foreground">{t('admin.stats.totalBookings')}</span>
              <span className="font-display tabular-nums text-foreground" dir="ltr">
                {num(stats?.bookings)}
              </span>
            </span>
            {stats && stats.pendingBookings > 0 ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                style={{
                  color: meta.accentText,
                  borderColor: meta.accentBorder,
                  backgroundColor: meta.accentSoft,
                }}
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.accent }} aria-hidden="true" />
                {stats.pendingBookings.toLocaleString('en-US')} {t('admin.stats.pendingBookings')}
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Storefront preview link — above the overlay (z-20) */}
            <a
              href={href(meta.sitePath)}
              className="relative z-20 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {t('admin.brands.viewStorefront')}
            </a>
            <span
              className="inline-flex min-h-11 items-center gap-1.5 pe-1 text-xs font-semibold"
              style={{ color: meta.accentText }}
            >
              {t('admin.brands.manage')}
            </span>
          </div>
        </div>
      </div>
    </Reveal>
  )
}

/* ============================================================
   The page
   ============================================================ */

export default function AdminPage() {
  const { t, locale } = useI18n()
  const { href } = useRouter()
  const { phase, sessionExpired, login, logout, markUnauthorized } = useAdminSession()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsPhase, setStatsPhase] = useState<StatsPhase>('idle')
  const [tab, setTab] = useState<TabId>('orders')

  /* Neutral house identity — warm dark champagne for the back office.
     Re-asserted on locale flips because BrandThemeSetter re-stamps the
     path-derived brand ('lut' for /admin) on every locale change. */
  useEffect(() => {
    document.documentElement.dataset.brand = 'neutral'
  }, [locale])

  /* KPI stats loader — sequence-guarded so a stale success can never
     overwrite a newer state (mirrors the panels' requestId pattern). */
  const statsRequestIdRef = useRef(0)
  const loadStats = useCallback(async () => {
    const id = ++statsRequestIdRef.current
    setStatsPhase('loading')
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' })
      if (statsRequestIdRef.current !== id) return
      if (res.status === 401) {
        markUnauthorized()
        return
      }
      if (!res.ok) throw new Error(`admin stats ${res.status}`)
      const data = (await res.json()) as AdminStats
      if (statsRequestIdRef.current !== id) return
      setStats(data)
      setStatsPhase('idle')
    } catch {
      if (statsRequestIdRef.current !== id) return
      setStatsPhase('error')
    }
  }, [markUnauthorized])

  /* Load on login/mount-ready (phase flips to 'ready' exactly once per
     gate pass) — panels are self-fetching, the KPIs are this page's job. */
  useEffect(() => {
    if (phase === 'ready') void loadStats()
  }, [phase, loadStats])

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <AdminBackdrop particleCount={phase === 'gate' ? 22 : 12} />
      <AdminToaster />

      {/* ---------- 1. Login gate ---------- */}
      {phase === 'checking' ? <CheckingState label={t('admin.common.loading')} /> : null}

      {phase === 'gate' ? <AdminGate onLogin={login} sessionExpired={sessionExpired} /> : null}

      {/* ---------- 2. Dashboard ---------- */}
      {phase === 'ready' ? (
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-10 pt-24 sm:px-6 sm:pb-10 sm:pt-28 lg:px-8">
          {/* House header */}
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-3xl text-foreground sm:text-4xl">
                {t('admin.title')}
              </h1>
              <p className="text-sm text-muted-foreground">{t('admin.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <a
                href={href('/')}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border/70 px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                {t('admin.viewSite')}
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
          </header>

          {/* Global KPI band */}
          <section aria-label={t('admin.stats.sectionLabel')} className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-xl text-foreground sm:text-2xl">
                {t('admin.stats.sectionTitle')}
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
                <KpiCard
                  icon={CalendarClock}
                  label={t('admin.stats.totalBookings')}
                  value={stats.totalBookings}
                  badge={
                    stats.last7Bookings > 0
                      ? `${t('admin.stats.last7')}: ${stats.last7Bookings.toLocaleString('en-US')}`
                      : null
                  }
                />
                <KpiCard
                  icon={Clock}
                  label={t('admin.stats.pendingBookings')}
                  value={stats.pendingBookings}
                  tone="amber"
                  delay={0.06}
                />
                <KpiCard
                  icon={CheckCircle2}
                  label={t('admin.stats.confirmedBookings')}
                  value={stats.confirmedBookings}
                  tone="green"
                  delay={0.12}
                />
                <KpiCard
                  icon={Coins}
                  label={t('admin.stats.expectedRevenue')}
                  value={stats.expectedRevenue}
                  format="kwd"
                  currencyLabel={t('admin.common.kwd')}
                  delay={0.18}
                />
                <KpiCard
                  icon={Mail}
                  label={t('admin.stats.messages')}
                  value={stats.totalMessages}
                  tone={stats.unreadMessages > 0 ? 'amber' : 'gold'}
                  badge={
                    stats.unreadMessages > 0
                      ? `${stats.unreadMessages.toLocaleString('en-US')} ${t('admin.stats.unread')}`
                      : null
                  }
                  delay={0.24}
                />
                <KpiCard
                  icon={Armchair}
                  label={t('admin.stats.activeProducts')}
                  value={stats.activeProducts}
                  delay={0.3}
                />
              </div>
            ) : null}
          </section>

          {/* Brand house cards — one door per house */}
          <section aria-label={t('admin.brands.sectionLabel')} className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-xl text-foreground sm:text-2xl">
                  {t('admin.brands.sectionTitle')}
                </h2>
                <p className="text-sm text-muted-foreground">{t('admin.brands.sectionSubtitle')}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {ADMIN_BRANDS.map((brand, index) => (
                <BrandCard
                  key={brand}
                  brand={brand}
                  stats={stats?.brands?.[brand]}
                  delay={0.08 * index}
                />
              ))}
            </div>
          </section>

          {/* Global tab band — role=tablist/tab/tabpanel + arrow-key
              navigation come from the Radix Tabs primitives; ≥44px targets.
              Every tab switch refreshes the KPIs so the counters absorb
              any mutations made inside the panels. */}
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

            <TabsContent value="orders" className="pt-6">
              <OrdersPanel />
            </TabsContent>
            <TabsContent value="messages" className="pt-6">
              <MessagesPanel />
            </TabsContent>
            <TabsContent value="products" className="pt-6">
              <ProductsPanel />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  )
}
