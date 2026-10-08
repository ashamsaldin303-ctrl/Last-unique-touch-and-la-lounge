'use client'

/**
 * Admin — «بيت الإدارة» (the Administration House).
 *
 * One hash route (#/ar/admin · #/en/admin) hosting the whole back office:
 *
 *   1. Login gate — dark glass card with a glowing gold ShieldCheck
 *      medallion. POSTs the password to /api/admin/login; the httpOnly
 *      session cookie is set by the server (same-origin fetch keeps it).
 *   2. Dashboard — house header + six KPI cards from /api/admin/stats +
 *      a tab band whose panels (Orders / Messages / Products) are built
 *      by parallel agents and imported here per the wave contract.
 *
 * Session contract with the parallel API + panel agents:
 *   - GET  /api/admin/session → { authenticated: boolean }
 *   - POST /api/admin/login   → 200 {ok} | 401 invalid_credentials | 429 rate_limited
 *   - POST /api/admin/logout  → {ok}
 *   - GET  /api/admin/stats   → KPI numbers (expectedRevenue in KWD)
 *   - panels dispatch `window.dispatchEvent(new CustomEvent('admin:unauthorized'))`
 *     on any 401 → this page drops back to the gate with an
 *     expired-session notice (admin.session.expired).
 *
 * The house identity is the neutral warm-dark champagne palette
 * (data-brand="neutral", asserted below — the router's brand resolver
 * would otherwise stamp 'lut' on this path).
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  Armchair,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { Particles } from '@/components/shared/particles'
import { Reveal } from '@/components/shared/reveal'
import { AnimatedCounter } from '@/components/shared/upgrade/animated-counter'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
// Parallel-agent panels — wave contract: default export, no props,
// self-fetching, and they dispatch 'admin:unauthorized' on 401.
// Dynamically imported (r3 architecture finding): the three panels carry
// ~4.5k lines of back-office code (plus zod + editor dialog) that must
// not ship to anonymous shoppers. Loading states stream in behind the
// login gate; ssr:false is allowed here — admin.tsx is a client component.
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

/** GET /api/admin/stats — contract with the parallel API agent. */
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
}

type AuthPhase = 'checking' | 'gate' | 'ready'
type LoginError = 'invalid' | 'rate_limited' | 'server' | null
type TabId = 'overview' | 'orders' | 'messages' | 'products'
type StatsPhase = 'idle' | 'loading' | 'error'

const TABS: TabId[] = ['overview', 'orders', 'messages', 'products']

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
   Panel placeholder — dark-glass shimmer while a lazily-loaded
   panel chunk streams in (shared by the three dynamic imports).
   ============================================================ */

function PanelSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="lux-card flex flex-col gap-4 rounded-xl border border-[#C9A25E]/20 bg-[#14110B]/95 p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-44 rounded-md bg-white/[0.07]" />
          <Skeleton className="h-3 w-16 rounded bg-white/[0.05]" />
        </div>
        <Skeleton className="h-11 w-24 rounded-md bg-white/[0.05]" />
      </div>
      <Skeleton className="h-11 w-full rounded-md bg-white/[0.05]" />
      <Skeleton className="h-64 w-full rounded-lg bg-white/[0.04]" />
    </div>
  )
}

/* ============================================================
   Session-probe state (rendered before the first API answer)
   ============================================================ */

function CheckingState({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24" role="status">
      <div className="flex flex-col items-center gap-4">
        <span className="animate-pulse-ring inline-flex size-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
          <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

/* ============================================================
   The page
   ============================================================ */

export default function AdminPage() {
  const { t, locale, dir } = useI18n()

  const [phase, setPhase] = useState<AuthPhase>('checking')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<LoginError>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsPhase, setStatsPhase] = useState<StatsPhase>('idle')
  const [tab, setTab] = useState<TabId>('overview')

  /* Neutral house identity — warm dark champagne for the back office.
     Re-asserted on locale flips because BrandThemeSetter re-stamps the
     path-derived brand ('lut' for /admin) on every locale change. */
  useEffect(() => {
    document.documentElement.dataset.brand = 'neutral'
  }, [locale])

  /* Any 401 from the parallel panels (window event) or from this page's
     own stats fetch → drop to the gate with an expired-session notice. */
  const handleUnauthorized = useCallback(() => {
    setPhase('gate')
    setSessionExpired(true)
    setStats(null)
    setStatsPhase('idle')
    setTab('overview')
  }, [])

  useEffect(() => {
    const onUnauthorized = () => handleUnauthorized()
    window.addEventListener('admin:unauthorized', onUnauthorized)
    return () => window.removeEventListener('admin:unauthorized', onUnauthorized)
  }, [handleUnauthorized])

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
        handleUnauthorized()
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
  }, [handleUnauthorized])

  /* Session probe on mount — decides gate vs dashboard. A non-OK answer
     (401, or 404 while the parallel API agent is still landing) simply
     shows the gate: the house stays closed until the API answers. */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store' })
        if (cancelled) return
        if (!res.ok) {
          setPhase('gate')
          return
        }
        const data = (await res.json()) as { authenticated?: boolean }
        if (cancelled) return
        if (data?.authenticated) {
          setPhase('ready')
          void loadStats()
        } else {
          setPhase('gate')
        }
      } catch {
        if (!cancelled) setPhase('gate')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadStats])

  /* Login — POST {password}; the httpOnly cookie lands automatically. */
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    if (!password.trim()) {
      setLoginError('invalid')
      return
    }
    setSubmitting(true)
    setLoginError(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        cache: 'no-store',
      })
      if (res.ok) {
        setPassword('')
        setSessionExpired(false)
        setPhase('ready')
        void loadStats()
        return
      }
      setLoginError(
        res.status === 401 ? 'invalid' : res.status === 429 ? 'rate_limited' : 'server'
      )
    } catch {
      setLoginError('server')
    } finally {
      setSubmitting(false)
    }
  }

  /* Logout — POST then back to the gate (no expiry notice: deliberate). */
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', cache: 'no-store' })
    } catch {
      /* network hiccup — the server cookie expires on its own */
    }
    setPhase('gate')
    setPassword('')
    setLoginError(null)
    setStats(null)
    setStatsPhase('idle')
    setSessionExpired(false)
    setTab('overview')
  }

  const loginErrorMessage =
    loginError === 'rate_limited'
      ? t('admin.login.rateLimited')
      : loginError === 'invalid'
        ? t('admin.login.error')
        : loginError === 'server'
          ? t('admin.login.serverError')
          : null

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Warm dark maison backdrop + drifting gold dust (both states) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(201,162,94,0.13),transparent_62%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_115%,rgba(139,107,61,0.10),transparent_65%)]"
      />
      <Particles count={phase === 'gate' ? 22 : 12} />

      {/* Single admin-shell sonner toaster — panels no longer mount their own
          (toasts survive tab switches and share one dark-gold style). */}
      <Toaster
        position="top-center"
        dir={dir}
        theme="dark"
        toastOptions={{
          style: {
            background: '#171410',
            border: '1px solid rgba(201,162,94,0.25)',
            color: '#F2EDE2',
            fontSize: '13px',
          },
        }}
      />

      {/* ---------- 1. Login gate ---------- */}
      {phase === 'checking' ? <CheckingState label={t('admin.common.loading')} /> : null}

      {phase === 'gate' ? (
        <div className="relative flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
          <Reveal className="w-full max-w-sm">
            <div className="glass-panel flex flex-col gap-6 rounded-2xl p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                {/* Glowing gold medallion */}
                <span className="animate-pulse-ring inline-flex size-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                  <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h1 className="font-display text-2xl text-foreground sm:text-3xl">
                    {t('admin.login.title')}
                  </h1>
                  <p className="text-sm text-muted-foreground">{t('admin.login.hint')}</p>
                </div>
              </div>

              {sessionExpired ? (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                >
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  {t('admin.session.expired')}
                </p>
              ) : null}

              <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="admin-password">{t('admin.login.passwordLabel')}</Label>
                  <Input
                    id="admin-password"
                    name="password"
                    type="password"
                    dir="ltr"
                    autoComplete="current-password"
                    autoFocus
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (loginError) setLoginError(null)
                    }}
                    aria-invalid={loginError ? true : undefined}
                    aria-describedby={loginError ? 'admin-login-error' : undefined}
                    placeholder="••••••••"
                    className="h-11 min-h-11"
                  />
                </div>

                {loginErrorMessage ? (
                  <p id="admin-login-error" role="alert" className="text-sm text-destructive">
                    {loginErrorMessage}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="btn-lux min-h-11 rounded-md px-6 py-2.5 text-base font-semibold"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Lock aria-hidden="true" />
                  )}
                  {submitting ? t('admin.common.loading') : t('admin.login.submit')}
                </Button>
              </form>
            </div>
          </Reveal>
        </div>
      ) : null}

      {/* ---------- 2. Dashboard ---------- */}
      {phase === 'ready' ? (
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {/* House header */}
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-3xl text-foreground sm:text-4xl">
                {t('admin.title')}
              </h1>
              <p className="text-sm text-muted-foreground">{t('admin.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs text-primary">
                <Lock className="size-3.5" aria-hidden="true" />
                {t('admin.secureBadge')}
              </span>
              <Button
                variant="outline"
                onClick={() => void handleLogout()}
                className="min-h-11 rounded-md border-primary/30 px-4 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <LogOut aria-hidden="true" />
                {t('admin.logout')}
              </Button>
            </div>
          </header>

          {/* Tab band — role=tablist/tab/tabpanel + arrow-key navigation
              come from the Radix Tabs primitives; ≥44px targets.
              Returning to the Overview tab refreshes the KPIs, so counters
              reflect any mutations made inside the panels (Task 4-9 note). */}
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = v as TabId
              setTab(next)
              if (next === 'overview') void loadStats()
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

            {/* Overview tab = the KPI band itself */}
            <TabsContent value="overview" className="flex flex-col gap-4 pt-6">
              <div className="flex justify-end">
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
            </TabsContent>

            {/* Panel tabs — parallel-agent components (self-fetching) */}
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
