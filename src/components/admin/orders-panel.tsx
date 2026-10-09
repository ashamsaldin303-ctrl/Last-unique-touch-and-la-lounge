'use client'

/**
 * OrdersPanel — admin bookings/orders log (Task 2-c).
 *
 * In this site "orders" are Booking records. This panel lists them from
 * `GET /api/admin/bookings?status=&q=&page=&pageSize=`, lets an admin change
 * a booking status via `PATCH /api/admin/bookings/[id]` and delete one via
 * `DELETE /api/admin/bookings/[id]` (with an AlertDialog confirmation).
 *
 * Session contract: any 401 from those endpoints dispatches the global
 * `admin:unauthorized` CustomEvent (the admin shell listens for it to bounce
 * back to login) and swaps the panel body for a "session expired" state.
 *
 * Layout: real `<table>` on ≥md, stacked cards on mobile — both render the
 * same data. Dark glass surface with a faint gold top hairline, warm-darks
 * palette (#0F0D0A / #F2EDE2 / #C9A25E), tabular numbers, full RTL with no
 * letter-spacing on Arabic.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n, type Locale } from '@/lib/i18n'
import { formatKwd } from '@/lib/money'
import { useAdminApi } from '@/components/admin/use-admin-api'
import { formatDate } from '@/components/shop/format'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Inbox,
  Loader2,
  Mail,
  RotateCcw,
  Search,
  SearchX,
  ShieldAlert,
  Trash2,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const
type BookingStatus = (typeof STATUSES)[number]
type StatusFilter = BookingStatus | 'ALL'

/** Rows per page — dense admin table, keeps the max-h-96 scroll meaningful. */
const PAGE_SIZE = 12
const SKELETON_ROWS = 6

interface BookingRow {
  id: string
  brand: string
  customerName: string
  customerPhone: string
  customerEmail: string
  productId: string | null
  productName: string | null
  productNameAr: string | null
  productNameEn: string | null
  startDate: string
  endDate: string
  quantity: number
  totalAmount: number
  address: string | null
  city: string | null
  notes: string | null
  status: BookingStatus
  createdAt: string
}

interface BookingsResponse {
  items: BookingRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Warm-dark surface tokens (self-contained — survives any data-brand). */
const INK = '#F2EDE2'
const GOLD = '#C9A25E'
const GOLD_SOFT = '#E5C878'

/** Brand badge palette — the project's known identity colors. */
const BRAND_STYLES: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  LUT: { label: 'LUT', dot: '#C9A25E', text: '#E5C878', bg: 'rgba(201,162,94,0.12)', border: 'rgba(201,162,94,0.32)' },
  LA_LOUNGE: { label: 'La Lounge', dot: '#E6007E', text: '#FF8AC8', bg: 'rgba(230,0,126,0.13)', border: 'rgba(230,0,126,0.38)' },
  YOUR_BIRTHDAY: { label: 'Your Birthday', dot: '#F5B914', text: '#FFD666', bg: 'rgba(245,185,20,0.13)', border: 'rgba(245,185,20,0.38)' },
}

/** Status badge palette — amber / calm green / calm red / champagne. */
const STATUS_STYLES: Record<BookingStatus, { dot: string; text: string; bg: string; border: string }> = {
  PENDING: { dot: '#FBBF24', text: '#FCD34D', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.32)' },
  CONFIRMED: { dot: '#34D399', text: '#6EE7B7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.32)' },
  CANCELLED: { dot: '#F87171', text: '#FCA5A5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.32)' },
  COMPLETED: { dot: '#C9A25E', text: '#D8CFBE', bg: 'rgba(201,162,94,0.10)', border: 'rgba(201,162,94,0.28)' },
}

/** Allowed status transitions (server contract):
 *  PENDING → CONFIRMED | CANCELLED · CONFIRMED → CANCELLED | COMPLETED ·
 *  COMPLETED / CANCELLED are terminal. */
const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED'],
  CANCELLED: [],
  COMPLETED: [],
}

const PANEL_CSS = `
.orders-panel-scroll { scrollbar-width: thin; scrollbar-color: rgba(201,162,94,0.35) transparent; }
.orders-panel-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.orders-panel-scroll::-webkit-scrollbar-track { background: transparent; }
.orders-panel-scroll::-webkit-scrollbar-thumb { background: rgba(201,162,94,0.3); border-radius: 999px; }
.orders-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(201,162,94,0.55); }
@keyframes orders-panel-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.orders-panel-skel { position: relative; overflow: hidden; border-radius: 6px; background: rgba(242,237,226,0.05); }
.orders-panel-skel::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(201,162,94,0.12), transparent); animation: orders-panel-shimmer 1.7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .orders-panel-skel::after { animation: none; } }
`

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const shortId = (id: string) => id.slice(0, 8)

function brandStyle(brand: string) {
  return BRAND_STYLES[brand] ?? BRAND_STYLES.LUT
}

function normalizeRow(raw: unknown): BookingRow {
  const r = (raw ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0)
  const optStr = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return {
    id: str(r.id),
    brand: str(r.brand) || str(r.productBrand) || 'LUT',
    customerName: str(r.customerName),
    customerPhone: str(r.customerPhone),
    customerEmail: str(r.customerEmail),
    productId: optStr(r.productId),
    productName: optStr(r.productName),
    productNameAr: optStr(r.productNameAr),
    productNameEn: optStr(r.productNameEn),
    startDate: str(r.startDate),
    endDate: str(r.endDate),
    quantity: Math.max(1, Math.round(num(r.quantity)) || 1),
    totalAmount: num(r.totalAmount),
    address: optStr(r.address),
    city: optStr(r.city),
    notes: optStr(r.notes),
    status: STATUSES.includes(r.status as BookingStatus) ? (r.status as BookingStatus) : 'PENDING',
    createdAt: str(r.createdAt),
  }
}

/** Locale-aware product name — the API may send productNameAr/En or productName. */
function resolveProductName(row: BookingRow, locale: Locale): string | null {
  if (locale === 'ar') return row.productNameAr ?? row.productName
  return row.productNameEn ?? row.productName
}

/** "3 days ago" / «قبل ٣ أيام» — falls back to the locale date when older. */
function relativeTime(iso: string, locale: Locale): string {
  const then = new Date(iso).getTime()
  if (!iso || isNaN(then)) return iso || '—'
  const minutes = Math.round((Date.now() - then) / 60000)
  try {
    const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar' : 'en-GB', { numeric: 'auto' })
    if (Math.abs(minutes) < 1) return rtf.format(0, 'minute')
    if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute')
    const hours = Math.round(minutes / 60)
    if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour')
    const days = Math.round(hours / 24)
    if (Math.abs(days) < 30) return rtf.format(-days, 'day')
    const months = Math.round(days / 30)
    if (Math.abs(months) < 18) return rtf.format(-months, 'month')
    return rtf.format(-Math.round(months / 12), 'year')
  } catch {
    return formatDate(iso, locale)
  }
}

/* ------------------------------------------------------------------ */
/* Atoms (module-level — stable identities keep Radix state alive)     */
/* ------------------------------------------------------------------ */

function BrandBadge({ brand, label }: { brand: string; label: string }) {
  const st = brandStyle(brand)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4"
      style={{ color: st.text, backgroundColor: st.bg, borderColor: st.border }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: st.dot }} aria-hidden="true" />
      {st.label}
      <span className="sr-only">{label}</span>
    </span>
  )
}

interface StatusMenuProps {
  current: BookingStatus
  disabled?: boolean
  fullWidth?: boolean
  statusLabels: Record<BookingStatus, string>
  menuLabel: string
  onChange: (next: BookingStatus) => void
}

function StatusMenu({ current, disabled, fullWidth, statusLabels, menuLabel, onChange }: StatusMenuProps) {
  const st = STATUS_STYLES[current]
  // Only the current status + its legal successors are offered; terminal
  // statuses (COMPLETED/CANCELLED) render a disabled trigger.
  const options: BookingStatus[] = [current, ...ALLOWED_TRANSITIONS[current]]
  const canTransition = ALLOWED_TRANSITIONS[current].length > 0
  const triggerDisabled = disabled || !canTransition
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={triggerDisabled}
          aria-label={menuLabel}
          aria-haspopup="menu"
          className={
            'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#C9A25E]/40 disabled:opacity-50 ' +
            (fullWidth ? 'w-full justify-center ' : '')
          }
          style={{ color: st.text, backgroundColor: st.bg, borderColor: st.border }}
        >
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: st.dot }} aria-hidden="true" />
          <span className="truncate">{statusLabels[current]}</span>
          {disabled ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin opacity-80" aria-hidden="true" />
          ) : canTransition ? (
            <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-44 border-[#C9A25E]/20 bg-[#171410]/95 text-[#F2EDE2] backdrop-blur-xl"
      >
        {options.map((s) => {
          const sst = STATUS_STYLES[s]
          return (
            <DropdownMenuItem
              key={s}
              disabled={s === current}
              onSelect={() => onChange(s)}
              className="min-h-9 gap-2 rounded-sm px-2 text-[13px] text-[#F2EDE2]/85 focus:bg-[#C9A25E]/10 focus:text-[#F2EDE2] data-[disabled]:opacity-60"
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: sst.dot }} aria-hidden="true" />
              <span>{statusLabels[s]}</span>
              {s === current && <Check className="ms-auto size-3.5 text-[#C9A25E]" aria-hidden="true" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

/** Optional prop — the Task 38 brand pages render the panel LOCKED to
 *  one house (the list query carries &brand=…). The overview renders it
 *  unscoped across all houses. */
export interface OrdersPanelProps {
  brand?: 'LUT' | 'LA_LOUNGE' | 'YOUR_BIRTHDAY'
}

export default function OrdersPanel({ brand: fixedBrand }: OrdersPanelProps = {}) {
  const { t, locale } = useI18n()

  /* ---- Data state (the list load runs through the shared useAdminApi
     hook: sequence guard + AbortController + 401 → admin:unauthorized) ---- */
  const [page, setPage] = useState(1)

  /* ---- Filters ---- */
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  /* ---- Row mutations ---- */
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BookingRow | null>(null)

  const bookingsUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (q) params.set('q', q)
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (fixedBrand) params.set('brand', fixedBrand)
    return `/api/admin/bookings?${params.toString()}`
  }, [page, q, statusFilter, fixedBrand])

  const { data, loading, error, sessionExpired, reload, setData, markUnauthorized } =
    useAdminApi<BookingsResponse>(bookingsUrl, [bookingsUrl])

  /* ---- 401 contract (mutation fetches): the hook's signal + shell event
     via markUnauthorized, plus closing any open confirm dialog. ---- */
  const handleUnauthorized = useCallback(() => {
    markUnauthorized()
    setDeleteTarget(null)
  }, [markUnauthorized])

  /* ---- Debounced search (300ms) ---- */
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim()
      if (next === q) return
      setQ(next)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, q])

  /* ---- Derived (normalized rows + honest pagination from the response) ---- */
  const items = useMemo<BookingRow[]>(
    () => (Array.isArray(data?.items) ? data.items.map(normalizeRow) : []),
    [data]
  )
  const total = typeof data?.total === 'number' ? data.total : items.length
  const totalPages =
    typeof data?.totalPages === 'number' && data.totalPages > 0
      ? data.totalPages
      : Math.max(1, Math.ceil(items.length / PAGE_SIZE))

  /* ---- Status change → PATCH + local row update ---- */
  const changeStatus = useCallback(
    async (row: BookingRow, next: BookingStatus) => {
      // Client-side guard of the server's transition map.
      if (rowBusyId || next === row.status) return
      if (!ALLOWED_TRANSITIONS[row.status].includes(next)) return
      setRowBusyId(row.id)
      try {
        const res = await fetch(`/api/admin/bookings/${encodeURIComponent(row.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
          credentials: 'same-origin',
        })
        if (res.status === 401) {
          handleUnauthorized()
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // Optimistic local row update on the hook's data state.
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: Array.isArray(prev.items)
                  ? prev.items.map((b) => (b.id === row.id ? { ...b, status: next } : b))
                  : [],
              }
            : prev
        )
        toast.success(t('admin.common.updated'), {
          description: `#${shortId(row.id)} · ${t(`admin.status.${next}`)}`,
        })
      } catch (err) {
        toast.error(t('admin.common.error'), {
          description: err instanceof Error ? err.message : 'network error',
        })
      } finally {
        setRowBusyId(null)
      }
    },
    [rowBusyId, handleUnauthorized, t, setData]
  )

  /* ---- Delete (confirmed via AlertDialog) → DELETE + local removal ---- */
  const confirmDelete = useCallback(async () => {
    const row = deleteTarget
    if (!row || deletingId) return
    setDeletingId(row.id)
    try {
      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (res.status === 409) {
        // Server allows deletes only for PENDING/CANCELLED bookings.
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(
          json?.error === 'not_deletable'
            ? t('admin.orders.errors.notDeletable')
            : t('admin.common.conflict')
        )
        setDeleteTarget(null)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const wasLastOnPage = items.length === 1
      // Local removal + total/pager math mirror the pre-hook behavior.
      setData((prev) => {
        if (!prev) return prev
        const nextTotal = Math.max(
          0,
          (typeof prev.total === 'number' ? prev.total : items.length) - 1
        )
        return {
          ...prev,
          items: Array.isArray(prev.items) ? prev.items.filter((b) => b.id !== row.id) : [],
          total: nextTotal,
          totalPages: Math.max(1, Math.ceil(nextTotal / PAGE_SIZE)),
        }
      })
      toast.success(t('admin.orders.deleted'), { description: `#${shortId(row.id)}` })
      setDeleteTarget(null)
      if (wasLastOnPage && page > 1) setPage(page - 1)
    } catch (err) {
      toast.error(t('admin.common.error'), {
        description: err instanceof Error ? err.message : 'network error',
      })
    } finally {
      setDeletingId(null)
    }
  }, [deleteTarget, deletingId, handleUnauthorized, items.length, page, t, setData])

  /* ---- Derived ---- */
  const statusLabels = {
    PENDING: t('admin.status.PENDING'),
    CONFIRMED: t('admin.status.CONFIRMED'),
    CANCELLED: t('admin.status.CANCELLED'),
    COMPLETED: t('admin.status.COMPLETED'),
  } as Record<BookingStatus, string>

  const kwdLabel = t('admin.common.kwd')
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight
  const PrevIcon = locale === 'ar' ? ArrowRight : ArrowLeft
  const NextIcon = locale === 'ar' ? ArrowLeft : ArrowRight
  const filtered = q !== '' || statusFilter !== 'ALL'
  const showEmpty = !loading && !error && !sessionExpired && items.length === 0

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setQ('')
    setStatusFilter('ALL')
    setPage(1)
  }, [])

  const goToPage = useCallback(
    (next: number) => {
      if (next < 1 || next > totalPages || next === page) return
      setPage(next)
    },
    [page, totalPages]
  )

  /* ---- Shared cell fragments ---- */
  const datesCell = (row: BookingRow) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[#F2EDE2]/85">
      <span className="tabular-nums">{row.startDate ? formatDate(row.startDate, locale) : '—'}</span>
      <ArrowIcon className="size-3 shrink-0 text-[#C9A25E]/60" aria-hidden="true" />
      <span className="tabular-nums">{row.endDate ? formatDate(row.endDate, locale) : '—'}</span>
    </span>
  )

  const totalCell = (row: BookingRow) => (
    <span className="whitespace-nowrap">
      <span dir="ltr" className="font-semibold tabular-nums" style={{ color: GOLD_SOFT }}>
        {formatKwd(row.totalAmount, locale)}
      </span>{' '}
      <span className="text-[11px] text-[#F2EDE2]/55">{kwdLabel}</span>
    </span>
  )

  const createdCell = (row: BookingRow) => {
    const full = row.createdAt ? formatDate(row.createdAt, locale) : ''
    return (
      <time dateTime={row.createdAt || undefined} title={full} className="whitespace-nowrap text-xs text-[#F2EDE2]/55">
        {row.createdAt ? relativeTime(row.createdAt, locale) : '—'}
      </time>
    )
  }

  /* ================================================================ */
  return (
    <section
      aria-labelledby="orders-panel-title"
      className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0F0D0A]/90 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur-xl"
    >
      <style>{PANEL_CSS}</style>

      {/* Gold top hairline (decorative) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A25E]/60 to-transparent"
      />

      {/* ---- Header ---- */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <h2 id="orders-panel-title" className="font-display text-xl leading-snug" style={{ color: INK }}>
            {t('admin.orders.title')}
          </h2>
          {!sessionExpired && !error && (
            <p className="mt-1 text-xs text-[#F2EDE2]/55" aria-live="polite">
              <span dir="ltr" className="tabular-nums">
                {loading ? '…' : total}
              </span>{' '}
              {t('admin.common.rows')}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={reload}
          disabled={loading || sessionExpired}
          className="h-11 gap-2 border-white/10 bg-white/[0.03] text-[13px] text-[#F2EDE2] hover:border-[#C9A25E]/30 hover:bg-[#C9A25E]/10 hover:text-[#F2EDE2] focus-visible:ring-[#C9A25E]/30"
        >
          <RotateCcw className={loading ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" />
          {t('admin.common.refresh')}
        </Button>
      </header>

      {sessionExpired ? (
        /* ---- Session expired (401) ---- */
        <div role="alert" className="flex flex-col items-center gap-3 border-t border-white/[0.05] px-6 py-14 text-center">
          <ShieldAlert className="size-8 text-[#C9A25E]" aria-hidden="true" />
          <h3 className="font-display text-lg" style={{ color: INK }}>
            {t('admin.orders.sessionExpiredTitle')}
          </h3>
          <p className="max-w-sm text-[13px] leading-relaxed text-[#F2EDE2]/60">
            {t('admin.errors.unauthorized')} —{' '}
            {t('admin.orders.sessionExpiredBody')}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={reload}
            className="h-11 gap-2 border-[#C9A25E]/30 bg-[#C9A25E]/10 text-[13px] text-[#E5C878] hover:bg-[#C9A25E]/20 hover:text-[#E5C878]"
          >
            {t('admin.common.retry')}
          </Button>
        </div>
      ) : (
        <>
          {/* ---- Toolbar: search + status filter ---- */}
          <div className="flex flex-col gap-3 border-t border-white/[0.05] px-5 py-4 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-[#F2EDE2]/40"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('admin.common.search')}
                aria-label={t('admin.common.search')}
                className="h-11 border-white/10 bg-white/[0.04] ps-10 text-[13px] text-[#F2EDE2] shadow-none placeholder:text-[#F2EDE2]/35 focus-visible:border-[#C9A25E]/40 focus-visible:ring-[#C9A25E]/25"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as StatusFilter)
                  setPage(1)
                }}
              >
                <SelectTrigger
                  aria-label={t('admin.orders.status')}
                  className="h-11 w-full border-white/10 bg-white/[0.04] text-[13px] text-[#F2EDE2] shadow-none focus-visible:border-[#C9A25E]/40 focus-visible:ring-[#C9A25E]/25"
                >
                  <SelectValue placeholder={t('admin.orders.status')} />
                </SelectTrigger>
                <SelectContent className="border-[#C9A25E]/20 bg-[#171410]/95 text-[#F2EDE2] backdrop-blur-xl">
                  <SelectItem
                    value="ALL"
                    className="text-[13px] focus:bg-[#C9A25E]/10 focus:text-[#F2EDE2]"
                  >
                    {t('admin.common.all')}
                  </SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-[13px] focus:bg-[#C9A25E]/10 focus:text-[#F2EDE2]"
                    >
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ---- Body states ---- */}
          <div className="border-t border-white/[0.05]">
            {loading ? (
              /* Skeleton — shimmer rows in both layouts */
              <div>
                <p role="status" className="sr-only">
                  {t('admin.common.loading')}
                </p>
                {/* desktop */}
                <div className="orders-panel-scroll hidden max-h-96 overflow-auto overscroll-contain md:block" aria-hidden="true">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-[#14110C]">
                      <tr className="border-b border-white/[0.08]">
                        {['4rem', '8rem', '10rem', '11rem', '3rem', '6rem', '6.5rem', '5.5rem', '5rem'].map(
                          (w, i) => (
                            <th key={i} scope="col" className="px-3 py-3 text-start">
                              <div className="orders-panel-skel h-2.5" style={{ width: `calc(${w} * 0.6)` }} />
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: SKELETON_ROWS }).map((_, r) => (
                        <tr key={r} className="border-b border-white/[0.04]">
                          {['4rem', '8rem', '10rem', '11rem', '3rem', '6rem', '6.5rem', '5.5rem', '5rem'].map(
                            (w, i) => (
                              <td key={i} className="px-3 py-4">
                                <div className="orders-panel-skel h-3" style={{ width: `calc(${w} * ${0.75 + ((r + i) % 3) * 0.08})` }} />
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* mobile */}
                <div className="divide-y divide-white/[0.04] md:hidden" aria-hidden="true">
                  {Array.from({ length: SKELETON_ROWS }).map((_, r) => (
                    <div key={r} className="space-y-2.5 p-4">
                      <div className="orders-panel-skel h-3 w-20" />
                      <div className="orders-panel-skel h-3.5 w-2/3" />
                      <div className="orders-panel-skel h-3 w-1/2" />
                      <div className="orders-panel-skel h-3 w-3/4" />
                      <div className="orders-panel-skel h-8 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              /* Error — role=alert + retry */
              <div
                role="alert"
                className="flex flex-col items-center gap-3 px-6 py-12 text-center"
              >
                <CircleAlert className="size-8 text-[#FCA5A5]" aria-hidden="true" />
                <h3 className="font-display text-lg" style={{ color: INK }}>
                  {t('admin.common.error')}
                </h3>
                <p dir="ltr" className="font-mono text-xs text-[#F2EDE2]/50">
                  {error}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={reload}
                  className="h-11 gap-2 border-[#C9A25E]/30 bg-[#C9A25E]/10 text-[13px] text-[#E5C878] hover:bg-[#C9A25E]/20 hover:text-[#E5C878]"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {t('admin.common.retry')}
                </Button>
              </div>
            ) : showEmpty ? (
              /* Empty */
              <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center">
                {filtered ? (
                  <SearchX className="size-8 text-[#C9A25E]/70" aria-hidden="true" />
                ) : (
                  <Inbox className="size-8 text-[#C9A25E]/70" aria-hidden="true" />
                )}
                <p className="text-[13px] text-[#F2EDE2]/60">{t('admin.orders.noOrders')}</p>
                {filtered && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={clearFilters}
                    className="h-11 text-[13px] text-[#E5C878] hover:text-[#F5DFA4]"
                  >
                    {t('admin.orders.clearFilters')}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* ---- Desktop: real table (hidden below md) ---- */}
                <div className="orders-panel-scroll hidden max-h-96 overflow-auto overscroll-contain md:block">
                  <table className="w-full border-collapse text-[13px]">
                    <caption className="sr-only">{t('admin.orders.title')}</caption>
                    <thead className="sticky top-0 z-10 bg-[#14110C]">
                      <tr className="border-b border-white/[0.08]">
                        <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-start text-[11px] font-medium text-[#F2EDE2]/50">
                          {t('admin.orders.id')}
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-start text-[11px] font-medium text-[#F2EDE2]/50">
                          {t('admin.orders.customer')}
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-start text-[11px] font-medium text-[#F2EDE2]/50">
                          {t('admin.orders.product')}
                        </th>
                        <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-start text-[11px] font-medium text-[#F2EDE2]/50">
                          {t('admin.orders.dates')}
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-medium text-[#F2EDE2]/50">
                          {t('admin.orders.quantity')}
                        </th>
                        <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-start text-[11px] font-medium text-[#F2EDE2]/50">
                          {t('admin.orders.total')}
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-start text-[11px] font-medium text-[#F2EDE2]/50">
                          {t('admin.orders.status')}
                        </th>
                        <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-start text-[11px] font-medium text-[#F2EDE2]/50">
                          {t('admin.orders.createdAt')}
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-start text-[11px] font-medium text-[#F2EDE2]/50">
                          {t('admin.common.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => {
                        const rowBusy = rowBusyId === row.id
                        const pname = resolveProductName(row, locale)
                        return (
                          <tr
                            key={row.id}
                            className="border-b border-white/[0.045] transition-colors hover:bg-[#C9A25E]/[0.04]"
                          >
                            <td className="whitespace-nowrap px-3 py-3">
                              <span dir="ltr" title={row.id} className="font-mono text-[11px] text-[#F2EDE2]/45">
                                #{shortId(row.id)}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div
                                className="max-w-[11rem] truncate font-medium text-[#F2EDE2]"
                                title={
                                  [row.customerEmail, row.address, row.city, row.notes].filter(Boolean).join(' · ') ||
                                  undefined
                                }
                              >
                                {row.customerName || '—'}
                              </div>
                              {row.customerPhone && (
                                <a
                                  dir="ltr"
                                  href={`tel:${row.customerPhone}`}
                                  aria-label={`${t('admin.orders.phone')}: ${row.customerPhone}`}
                                  className="block text-xs tabular-nums text-[#F2EDE2]/55 underline-offset-2 hover:text-[#C9A25E] hover:underline"
                                >
                                  {row.customerPhone}
                                </a>
                              )}
                              {row.customerEmail && (
                                <a
                                  dir="ltr"
                                  href={`mailto:${row.customerEmail}`}
                                  aria-label={`${t('admin.orders.email')}: ${row.customerEmail}`}
                                  className="block truncate text-xs text-[#F2EDE2]/55 underline-offset-2 hover:text-[#C9A25E] hover:underline"
                                >
                                  {row.customerEmail}
                                </a>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="max-w-[13rem] truncate text-[#F2EDE2]/85" title={pname ?? undefined}>
                                {pname || '—'}
                              </div>
                              <div className="mt-1">
                                <BrandBadge brand={row.brand} label={t('admin.orders.brand')} />
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-[13px]">{datesCell(row)}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-center">
                              <span dir="ltr" className="tabular-nums text-[#F2EDE2]/85">
                                ×{row.quantity}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">{totalCell(row)}</td>
                            <td className="px-3 py-3">
                              <StatusMenu
                                current={row.status}
                                disabled={rowBusy}
                                statusLabels={statusLabels}
                                menuLabel={`${t('admin.orders.statusUpdate')} — #${shortId(row.id)}`}
                                onChange={(next) => changeStatus(row, next)}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">{createdCell(row)}</td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`${t('admin.common.deleteConfirmTitle')} — #${shortId(row.id)}`}
                                disabled={deletingId === row.id}
                                onClick={() => setDeleteTarget(row)}
                                className="size-9 rounded-md text-[#F2EDE2]/50 hover:bg-[#EF4444]/10 hover:text-[#FCA5A5]"
                              >
                                {deletingId === row.id ? (
                                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                ) : (
                                  <Trash2 className="size-4" aria-hidden="true" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ---- Mobile: stacked cards (md and up) ---- */}
                <div className="orders-panel-scroll max-h-[30rem] divide-y divide-white/[0.045] overflow-y-auto overscroll-contain md:hidden">
                  {items.map((row) => {
                    const rowBusy = rowBusyId === row.id
                    const pname = resolveProductName(row, locale)
                    const placeLine = [row.address, row.city]
                      .filter(Boolean)
                      .join(locale === 'ar' ? '، ' : ', ')
                    return (
                      <article key={row.id} className="space-y-3 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span dir="ltr" className="font-mono text-[11px] text-[#F2EDE2]/50">
                            #{shortId(row.id)}
                          </span>
                          {createdCell(row)}
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-[14px] font-medium text-[#F2EDE2]">
                            {row.customerName || '—'}
                          </span>
                          {row.customerPhone && (
                            <a
                              dir="ltr"
                              href={`tel:${row.customerPhone}`}
                              aria-label={`${t('admin.orders.phone')}: ${row.customerPhone}`}
                              className="shrink-0 text-xs tabular-nums text-[#F2EDE2]/60 underline-offset-2 hover:text-[#C9A25E] hover:underline"
                            >
                              {row.customerPhone}
                            </a>
                          )}
                          {row.customerEmail && (
                            <a
                              dir="ltr"
                              href={`mailto:${row.customerEmail}`}
                              aria-label={`${t('admin.orders.email')}: ${row.customerEmail}`}
                              className="flex size-11 items-center justify-center text-[#F2EDE2]/60 underline-offset-2 hover:text-[#C9A25E] hover:underline"
                            >
                              <Mail className="size-3.5" aria-hidden="true" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-[13px] text-[#F2EDE2]/85" title={pname ?? undefined}>
                            {pname || '—'}
                          </span>
                          <BrandBadge brand={row.brand} label={t('admin.orders.brand')} />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="min-w-0">{datesCell(row)}</span>
                          <span className="shrink-0 text-xs text-[#F2EDE2]/55">
                            {t('admin.orders.quantity')}:{' '}
                            <span dir="ltr" className="tabular-nums">
                              ×{row.quantity}
                            </span>
                          </span>
                        </div>
                        {placeLine && (
                          <p className="text-xs leading-relaxed text-[#F2EDE2]/50">
                            <span className="text-[#F2EDE2]/40">{t('admin.orders.address')}: </span>
                            {placeLine}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          {totalCell(row)}
                          {row.notes && <span className="sr-only">{row.notes}</span>}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <div className="min-w-0 flex-1">
                            <StatusMenu
                              current={row.status}
                              disabled={rowBusy}
                              fullWidth
                              statusLabels={statusLabels}
                              menuLabel={`${t('admin.orders.statusUpdate')} — #${shortId(row.id)}`}
                              onChange={(next) => changeStatus(row, next)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`${t('admin.common.deleteConfirmTitle')} — #${shortId(row.id)}`}
                            disabled={deletingId === row.id}
                            onClick={() => setDeleteTarget(row)}
                            className="size-11 rounded-md text-[#F2EDE2]/50 hover:bg-[#EF4444]/10 hover:text-[#FCA5A5]"
                          >
                            {deletingId === row.id ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="size-4" aria-hidden="true" />
                            )}
                          </Button>
                        </div>
                      </article>
                    )
                  })}
                </div>

                {/* ---- Pagination ---- */}
                <nav
                  className="flex items-center justify-between gap-3 border-t border-white/[0.05] px-5 py-3"
                  aria-label={t('admin.orders.pagination')}
                >
                  <span className="text-xs text-[#F2EDE2]/60">
                    {t('admin.common.page')}{' '}
                    <span dir="ltr" className="tabular-nums">
                      {page}
                    </span>{' '}
                    {t('admin.common.of')}{' '}
                    <span dir="ltr" className="tabular-nums">
                      {totalPages}
                    </span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1 || loading}
                      aria-label={t('admin.common.prev')}
                      className="size-11 border-white/10 bg-white/[0.03] text-[#F2EDE2] hover:border-[#C9A25E]/30 hover:bg-[#C9A25E]/10 hover:text-[#F2EDE2] focus-visible:ring-[#C9A25E]/30"
                    >
                      <PrevIcon className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= totalPages || loading}
                      aria-label={t('admin.common.next')}
                      className="size-11 border-white/10 bg-white/[0.03] text-[#F2EDE2] hover:border-[#C9A25E]/30 hover:bg-[#C9A25E]/10 hover:text-[#F2EDE2] focus-visible:ring-[#C9A25E]/30"
                    >
                      <NextIcon className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </nav>
              </>
            )}
          </div>
        </>
      )}

      {/* ---- Delete confirmation (shared, controlled) ---- */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="max-w-sm border-[#C9A25E]/20 bg-[#14110C] text-[#F2EDE2] sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg" style={{ color: INK }}>
              {t('admin.common.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-[13px] leading-relaxed text-[#F2EDE2]/60">
                <p>{t('admin.orders.deleteConfirm')}</p>
                {deleteTarget && (
                  <p className="mt-1.5">
                    <span dir="ltr" className="font-mono text-xs text-[#C9A25E]">
                      #{shortId(deleteTarget.id)}
                    </span>
                    {' · '}
                    {deleteTarget.customerName || '—'}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={!!deletingId}
              className="h-10 border-white/10 bg-transparent text-[13px] text-[#F2EDE2] hover:bg-white/5 hover:text-[#F2EDE2] focus-visible:ring-[#C9A25E]/30"
            >
              {t('admin.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!!deletingId}
              onClick={(e) => {
                e.preventDefault() // stay open while the request is in flight
                void confirmDelete()
              }}
              className="h-10 gap-2 bg-[#DC2626] text-[13px] text-white hover:bg-[#DC2626]/85 focus-visible:ring-[#DC2626]/40"
            >
              {deletingId && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t('admin.common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
