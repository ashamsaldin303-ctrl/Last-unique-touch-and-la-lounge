'use client'

/**
 * ADMIN — Messages panel (Task 2-d).
 *
 * Self-contained dark-glass panel listing customer contact messages
 * (cards, not a table) with a read/unread filter, per-message
 * mark-read toggle + delete-with-confirm, expandable message bodies,
 * locale-aware received dates and pagination.
 *
 * API contract (wave 2):
 *   GET    /api/admin/messages?read=&page=&pageSize=
 *          → { items, total, page, pageSize }
 *   PATCH  /api/admin/messages/[id]  body { read: boolean } → { ok }
 *   DELETE /api/admin/messages/[id]  → { ok } | 404
 *   401 → dispatch 'admin:unauthorized' + show session-expired notice.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, ChevronLeft, ChevronRight, Inbox, KeyRound, Mail, MailOpen, Phone, RotateCw, Trash2 } from 'lucide-react'
import { useI18n, type Locale } from '@/lib/i18n'
import { useAdminApi } from '@/components/admin/use-admin-api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { cn } from '@/lib/utils'

/* ================= Types ================= */
type Brand = 'LUT' | 'LA_LOUNGE' | 'YOUR_BIRTHDAY'

interface AdminMessage {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  brand: Brand
  read: boolean
  createdAt: string /* ISO string */
}

interface MessagesPage {
  items: AdminMessage[]
  total: number
  page: number
  pageSize: number
}

type ReadFilter = 'all' | 'unread' | 'read'

const PAGE_SIZE = 8

/* ================= Brand badge tokens (dark glass) ================= */

const BRAND_BADGE: Record<Brand, string> = {
  LUT: 'border-[#C9A25E]/45 bg-[#C9A25E]/12 text-[#E5C878]',
  LA_LOUNGE: 'border-[#E6007E]/45 bg-[#E6007E]/12 text-[#FF85C8]',
  YOUR_BIRTHDAY: 'border-[#F5B914]/45 bg-[#F5B914]/12 text-[#FFD25E]',
}

const BRAND_LABEL_KEY: Record<Brand, string> = {
  LUT: 'products.brandFilter.lut',
  LA_LOUNGE: 'products.brandFilter.lalounge',
  YOUR_BIRTHDAY: 'products.brandFilter.birthday',
}

/* ================= Helpers ================= */

/** Received date → locale-formatted (ar-KW / en-GB), date + time. */
function formatReceived(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return iso
  const region = locale === 'ar' ? 'ar-KW' : 'en-GB'
  try {
    return date.toLocaleString(region, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/* ================= Component ================= */

export default function MessagesPanel() {
  const { t, locale } = useI18n()

  const [filter, setFilter] = useState<ReadFilter>('all')
  const [page, setPage] = useState(1)
  /** Message ids whose body is expanded to full text. */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  /** Message ids with an in-flight PATCH/DELETE (buttons disabled). */
  const [pending, setPending] = useState<Set<string>>(new Set())
  /** Message queued for delete confirmation. */
  const [deleteTarget, setDeleteTarget] = useState<AdminMessage | null>(null)

  /* ---- List load (shared admin plumbing: seq guard + AbortController —
     previously this panel was the one copy missing the abort — + 401 signal) ---- */
  const messagesUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (filter === 'unread') params.set('read', 'false')
    if (filter === 'read') params.set('read', 'true')
    return `/api/admin/messages?${params.toString()}`
  }, [page, filter])

  const { data, loading, error, sessionExpired, reload, setData, markUnauthorized } =
    useAdminApi<MessagesPage>(messagesUrl, [messagesUrl])

  /* ---- Mark read / unread (optimistic, revert on failure) ---- */
  const toggleRead = useCallback(
    async (m: AdminMessage) => {
      const next = !m.read
      setPending((prev) => new Set(prev).add(m.id))
      setData((prev) =>
        prev
          ? { ...prev, items: prev.items.map((i) => (i.id === m.id ? { ...i, read: next } : i)) }
          : prev
      )
      try {
        const res = await fetch(`/api/admin/messages/${encodeURIComponent(m.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: next }),
        })
        if (res.status === 401) {
          markUnauthorized()
          setData((prev) =>
            prev
              ? { ...prev, items: prev.items.map((i) => (i.id === m.id ? { ...i, read: m.read } : i)) }
              : prev
          )
          return
        }
        if (!res.ok) throw new Error(`patch ${res.status}`)
        // The flipped item no longer matches the active read filter →
        // drop it from the list and mirror the delete path's total math.
        const stillMatchesFilter =
          filter === 'all' || (filter === 'unread' && !next) || (filter === 'read' && next)
        if (!stillMatchesFilter) {
          setData((prev) => {
            if (!prev) return prev
            const items = prev.items.filter((i) => i.id !== m.id)
            // Step back a page if we just emptied the last page.
            if (items.length === 0 && page > 1) setPage(page - 1)
            return { ...prev, items, total: Math.max(0, prev.total - 1) }
          })
        }
        toast.success(t('admin.common.updated'))
      } catch {
        setData((prev) =>
          prev
            ? { ...prev, items: prev.items.map((i) => (i.id === m.id ? { ...i, read: m.read } : i)) }
            : prev
        )
        toast.error(t('admin.common.error'))
      } finally {
        setPending((prev) => {
          const nextSet = new Set(prev)
          nextSet.delete(m.id)
          return nextSet
        })
      }
    },
    [t, filter, page, setData, markUnauthorized]
  )

  /* ---- Delete (confirm dialog → 200 ok | 404 already-gone) ---- */
  const confirmDelete = useCallback(async () => {
    const m = deleteTarget
    if (!m) return
    setDeleteTarget(null)
    setPending((prev) => new Set(prev).add(m.id))
    try {
      const res = await fetch(`/api/admin/messages/${encodeURIComponent(m.id)}`, {
        method: 'DELETE',
      })
      if (res.status === 401) {
        markUnauthorized()
        return
      }
      if (!res.ok && res.status !== 404) throw new Error(`delete ${res.status}`)
      // 404 = already gone on the server → drop it locally as well.
      setData((prev) => {
        if (!prev) return prev
        const items = prev.items.filter((i) => i.id !== m.id)
        // Step back a page if we just emptied the last page.
        if (items.length === 0 && page > 1) setPage(page - 1)
        return { ...prev, items, total: Math.max(0, prev.total - 1) }
      })
      toast.success(t('admin.common.updated'))
    } catch {
      toast.error(t('admin.common.error'))
    } finally {
      setPending((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(m.id)
        return nextSet
      })
    }
  }, [deleteTarget, page, t, setData, markUnauthorized])

  /* ---- Expand / collapse a message body ---- */
  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showPagination = !loading && !error && !sessionExpired && total > PAGE_SIZE

  /* ---- Render ---- */
  return (
    <section
      aria-labelledby="admin-messages-title"
      className="lux-card relative overflow-hidden rounded-xl border border-[#C9A25E]/20 bg-[#14110B]/95 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur-md"
    >
      {/* Gold top hairline (subtle) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A25E]/70 to-transparent"
      />

      <div className="p-4 sm:p-6">
        {/* ---- Header + toolbar ---- */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="min-w-0">
            <h2
              id="admin-messages-title"
              className="font-display text-xl font-bold text-[#F2EDE3]"
            >
              {t('admin.messages.title')}
            </h2>
            <p className="mt-0.5 text-xs text-[#8A8072]" aria-live="polite">
              {sessionExpired
                ? null
                : error
                  ? null
                  : loading
                    ? t('admin.common.loading')
                    : (
                        <span dir="ltr" className="tabular-nums">
                          {total}
                        </span>
                      )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={reload}
            disabled={loading}
            aria-label={t('admin.common.refresh')}
            className="min-h-11 border-white/15 bg-white/[0.03] text-[#E5D9BE] hover:bg-white/[0.07] hover:text-[#F2EDE3] disabled:opacity-50"
          >
            <RotateCw
              className={cn('me-2 size-4', loading && 'animate-spin')}
              aria-hidden="true"
            />
            {t('admin.common.refresh')}
          </Button>
        </header>

        {/* ---- Read/unread filter pills ---- */}
        <div
          className="flex flex-wrap items-center gap-2 py-4"
          role="group"
          aria-label={t('admin.messages.title')}
        >
          {(
            [
              { value: 'all', label: t('admin.common.all') },
              { value: 'unread', label: t('admin.messages.unread') },
              { value: 'read', label: t('admin.messages.read') },
            ] as Array<{ value: ReadFilter; label: string }>
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => {
                setFilter(option.value)
                setPage(1)
              }}
              className={cn(
                'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                filter === option.value
                  ? 'border-[#C9A25E]/60 bg-[#C9A25E]/15 text-[#E5C878]'
                  : 'border-white/10 bg-transparent text-[#B6AD9C] hover:bg-white/[0.04] hover:text-[#E5D9BE]'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* ---- States / list ---- */}
        {sessionExpired ? (
          <UnauthorizedNotice label={t('admin.errors.unauthorized')} />
        ) : error ? (
          <ErrorNotice
            message={t('admin.common.error')}
            retryLabel={t('admin.common.retry')}
            onRetry={reload}
          />
        ) : loading ? (
          <MessagesSkeleton />
        ) : items.length === 0 ? (
          <EmptyMessages label={t('admin.messages.noMessages')} />
        ) : (
          <div className="max-h-[34rem] space-y-2.5 overflow-y-auto overscroll-contain pe-1">
            {items.map((m) => (
              <MessageCard
                key={m.id}
                message={m}
                expanded={expanded.has(m.id)}
                busy={pending.has(m.id)}
                locale={locale}
                brandLabel={t(BRAND_LABEL_KEY[m.brand])}
                onToggleRead={() => toggleRead(m)}
                onExpand={() => toggleExpand(m.id)}
                onDelete={() => setDeleteTarget(m)}
              />
            ))}
          </div>
        )}

        {/* ---- Pagination (only when the list overflows a page) ---- */}
        {showPagination && (
          <Pager
            page={page}
            totalPages={totalPages}
            onGo={setPage}
            prevLabel={t('admin.common.prev')}
            nextLabel={t('admin.common.next')}
            pageOfLabel={`${t('admin.common.page')} ${page} ${t('admin.common.of')} ${totalPages}`}
          />
        )}
      </div>

      {/* ---- Delete confirmation ---- */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="border-[#C9A25E]/25 bg-[#1A160E] text-[#F2EDE3]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg text-[#F2EDE3]">
              {t('admin.messages.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#B6AD9C]">
              {t('admin.messages.confirmDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 border-white/15 bg-transparent text-[#E5D9BE] hover:bg-white/[0.06] hover:text-[#F2EDE3]">
              {t('admin.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
              className="min-h-11 bg-[#dc2626] text-white hover:bg-[#c81e1e]"
            >
              {t('admin.common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

/* ================= Sub-components ================= */

function MessageCard({
  message: m,
  expanded,
  busy,
  locale,
  brandLabel,
  onToggleRead,
  onExpand,
  onDelete,
}: {
  message: AdminMessage
  expanded: boolean
  busy: boolean
  locale: Locale
  brandLabel: string
  onToggleRead: () => void
  onExpand: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const toggleReadLabel = m.read ? t('admin.messages.markUnread') : t('admin.messages.markRead')
  const deleteLabel = `${t('admin.messages.delete')}: ${m.subject}`

  /* "More" affordance only when the clamp actually truncates: measure
     scrollHeight vs clientHeight instead of guessing by character count
     (whitespace-pre-line + narrow viewports made the heuristic wrong). */
  const bodyRef = useRef<HTMLParagraphElement | null>(null)
  const [isClamped, setIsClamped] = useState(false)
  useEffect(() => {
    const el = bodyRef.current
    if (!el || expanded) return // keep the collapsed measurement while expanded
    const check = () => {
      setIsClamped(el.scrollHeight > el.clientHeight + 1)
    }
    check()
    // Re-measure when the card's width changes (viewport / filter flips).
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [m.message, expanded])

  return (
    <article
      className={cn(
        'rounded-lg border p-3.5 transition-colors sm:p-4',
        m.read
          ? 'border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.04]'
          : 'border-[#C9A25E]/50 bg-[#C9A25E]/[0.05] shadow-[0_0_28px_-14px_rgba(201,162,94,0.5)] hover:bg-[#C9A25E]/[0.08]'
      )}
    >
      {/* Sender line */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {!m.read && (
            <span
              className="mt-1 inline-block size-2 shrink-0 rounded-full bg-[#E5C878]"
              aria-hidden="true"
            />
          )}
          <h3 className="font-display text-base font-bold text-[#F2EDE3]">{m.name}</h3>
          <a
            dir="ltr"
            href={`mailto:${m.email}`}
            aria-label={`${t('admin.messages.email')}: ${m.email}`}
            className="truncate text-xs text-[#8A8072] underline-offset-2 hover:text-[#C9A25E] hover:underline"
          >
            {m.email}
          </a>
          {m.phone ? (
            <a
              dir="ltr"
              href={`tel:${m.phone}`}
              aria-label={`${t('admin.messages.phone')}: ${m.phone}`}
              className="inline-flex min-h-11 items-center text-xs text-[#8A8072] tabular-nums underline-offset-2 hover:text-[#C9A25E] hover:underline"
            >
              <Phone className="me-1 size-3.5" aria-hidden="true" />
              {m.phone}
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              'rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold',
              BRAND_BADGE[m.brand]
            )}
          >
            {brandLabel}
          </span>
          {!m.read && (
            <span className="rounded-md border border-[#dc2626]/50 bg-[#dc2626]/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-[#F87171]">
              {t('admin.messages.unread')}
            </span>
          )}
        </div>
      </header>

      {/* Subject */}
      <p className="mt-2 text-sm font-semibold text-[#E5C878]">{m.subject}</p>

      {/* Body — clamped to 3 lines, expandable */}
      <p
        ref={bodyRef}
        className={cn(
          'mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[#B6AD9C]',
          !expanded && 'line-clamp-3'
        )}
      >
        {m.message}
      </p>
      {isClamped && (
        <button
          type="button"
          onClick={onExpand}
          aria-expanded={expanded}
          className="mt-1 min-h-11 px-1 text-xs font-semibold text-[#C9A25E] transition-colors hover:text-[#E5C878]"
        >
          {expanded ? t('admin.messages.less') : t('admin.messages.more')}
        </button>
      )}

      {/* Received + actions */}
      <footer className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
        <p className="text-xs text-[#8A8072]">
          <span>{t('admin.messages.received')}</span>:{' '}
          <time dateTime={m.createdAt}>{formatReceived(m.createdAt, locale)}</time>
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleRead}
            disabled={busy}
            aria-label={`${toggleReadLabel}: ${m.subject}`}
            className="min-h-11 border-white/15 bg-white/[0.03] text-[#E5D9BE] hover:bg-white/[0.07] hover:text-[#F2EDE3] disabled:opacity-50"
          >
            {m.read ? (
              <MailOpen className="me-2 size-4" aria-hidden="true" />
            ) : (
              <Mail className="me-2 size-4" aria-hidden="true" />
            )}
            {toggleReadLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={busy}
            aria-label={deleteLabel}
            className="size-11 text-[#F87171] hover:bg-[#dc2626]/10 hover:text-[#FCA5A5] disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </footer>
    </article>
  )
}

function MessagesSkeleton() {
  return (
    <div className="max-h-[34rem] space-y-2.5 pe-1" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-white/[0.08] p-4"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-5 rounded-full bg-white/[0.07]" />
            <Skeleton className="h-4 w-28 rounded bg-white/[0.07]" />
            <Skeleton className="h-3 w-36 rounded bg-white/[0.05]" />
          </div>
          <Skeleton className="mt-3 h-3.5 w-1/2 rounded bg-white/[0.07]" />
          <Skeleton className="mt-2.5 h-3 w-full rounded bg-white/[0.05]" />
          <Skeleton className="mt-1.5 h-3 w-11/12 rounded bg-white/[0.05]" />
          <Skeleton className="mt-1.5 h-3 w-2/3 rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  )
}

function EmptyMessages({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-full border border-[#C9A25E]/30 bg-[#C9A25E]/10">
        <Inbox className="size-6 text-[#C9A25E]" aria-hidden="true" />
      </div>
      <p className="text-sm text-[#B6AD9C]">{label}</p>
    </div>
  )
}

function ErrorNotice({
  message,
  retryLabel,
  onRetry,
}: {
  message: string
  retryLabel: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-full border border-[#dc2626]/40 bg-[#dc2626]/10">
        <AlertCircle className="size-6 text-[#F87171]" aria-hidden="true" />
      </div>
      <p className="text-sm text-[#B6AD9C]">{message}</p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        className="min-h-11 border-white/15 bg-white/[0.03] text-[#E5D9BE] hover:bg-white/[0.07] hover:text-[#F2EDE3]"
      >
        <RotateCw className="me-2 size-4" aria-hidden="true" />
        {retryLabel}
      </Button>
    </div>
  )
}

function UnauthorizedNotice({ label }: { label: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-full border border-[#C9A25E]/40 bg-[#C9A25E]/10">
        <KeyRound className="size-6 text-[#C9A25E]" aria-hidden="true" />
      </div>
      <p className="font-display text-base font-bold text-[#E5C878]">{label}</p>
    </div>
  )
}

/** Compact dark pager — prev / page dots / next. */
function Pager({
  page,
  totalPages,
  onGo,
  prevLabel,
  nextLabel,
  pageOfLabel,
}: {
  page: number
  totalPages: number
  onGo: (page: number) => void
  prevLabel: string
  nextLabel: string
  pageOfLabel: string
}) {
  const { t, locale } = useI18n()
  const PrevIcon = locale === 'ar' ? ChevronRight : ChevronLeft
  const NextIcon = locale === 'ar' ? ChevronLeft : ChevronRight

  const pageNumbers: Array<number | '…'> = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
  } else {
    pageNumbers.push(1)
    if (page > 3) pageNumbers.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pageNumbers.push(i)
    }
    if (page < totalPages - 2) pageNumbers.push('…')
    pageNumbers.push(totalPages)
  }

  return (
    <nav
      className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-white/[0.06] pt-4"
      aria-label={t('admin.common.page')}
    >
      <button
        type="button"
        onClick={() => onGo(page - 1)}
        disabled={page === 1}
        aria-label={prevLabel}
        className="flex size-11 items-center justify-center rounded-full border border-white/12 text-[#E5C878] transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PrevIcon className="size-4" aria-hidden="true" />
      </button>
      {pageNumbers.map((pageNum, idx) =>
        pageNum === '…' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex size-11 items-center justify-center text-sm text-[#8A8072]"
          >
            …
          </span>
        ) : (
          <button
            key={pageNum}
            type="button"
            onClick={() => onGo(pageNum)}
            aria-current={pageNum === page ? 'page' : undefined}
            className={cn(
              'flex size-11 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors',
              pageNum === page
                ? 'border-transparent bg-[#C9A25E] text-[#17130A]'
                : 'border-white/12 text-[#B6AD9C] hover:bg-white/[0.05] hover:text-[#E5D9BE]'
            )}
          >
            {pageNum}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onGo(page + 1)}
        disabled={page === totalPages}
        aria-label={nextLabel}
        className="flex size-11 items-center justify-center rounded-full border border-white/12 text-[#E5C878] transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <NextIcon className="size-4" aria-hidden="true" />
      </button>
      <span className="w-full text-center text-xs text-[#8A8072] sm:w-auto sm:ms-3" aria-hidden="true">
        {pageOfLabel}
      </span>
    </nav>
  )
}
