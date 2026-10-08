'use client'

/**
 * ADMIN — Products panel (rebuilt in wave 2, task 37-2-k; split in wave 5,
 * task 37-6-c — the create/edit dialog now lives in products-dialog.tsx).
 *
 * Product editing center: a 300ms-debounced search, brand pills, a category
 * filter (fed by the list response), a responsive table (desktop) / cards
 * (mobile), optimistic activate/deactivate + inline stock quick-edit, a full
 * create/edit dialog (imported below — bilingual data · price & stock ·
 * image manager) and a confirmed delete flow.
 *
 * The LIST-LOAD plumbing (seq guard + AbortController + 401 signal) comes
 * from the shared useAdminApi hook; mutation fetches (PATCH/DELETE) stay
 * here and patch the hook's data state optimistically.
 *
 * API contract (wave 2 — coded against the contract, not live endpoints):
 *   GET    /api/admin/products?brand=&page=&pageSize=&search=&categoryId=&includeInactive=true
 *          → { items: ProductItem[], page, pageSize, total, totalPages, categories: CategoryItem[] }
 *   PATCH  /api/admin/products/{id}           partial ProductInput (or legacy
 *          { isActive?, stock? })             → 200 { item } | 400 | 409
 *   DELETE /api/admin/products/{id}           → 200 { ok:true }
 *          | 409 { error:'has_bookings', bookingsCount }
 *   401 → useAdminApi dispatches 'admin:unauthorized' (the admin shell
 *          listens) + the local sessionExpired notice.
 *
 * Toasts render through the single shell-level <Toaster> (src/views/admin.tsx).
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Loader2,
  PackageX,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
} from 'lucide-react'
import { useI18n, type Locale } from '@/lib/i18n'
import { formatKwd } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAdminApi } from '@/components/admin/use-admin-api'
import ProductsDialog, {
  BRAND_BADGE,
  BRAND_LABEL_KEY,
  localizedName,
  localizedCategoryName,
  type Brand,
  type CategoryItem,
  type ProductItem,
} from '@/components/admin/products-dialog'

/* ================= Types (contract) ================= */

type BrandFilter = Brand | 'ALL'

interface ProductsPage {
  items: ProductItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  categories: CategoryItem[]
}

interface StockDialogState {
  product: ProductItem
  draft: string
}

/** Edit/create dialog target — `product: null` means CREATE. */
interface EditorTarget {
  product: ProductItem | null
  brand: Brand
}

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

const BRAND_FILTERS: Array<{ value: BrandFilter; labelKey: string }> = [
  { value: 'ALL', labelKey: 'products.brandFilter.all' },
  { value: 'LUT', labelKey: 'products.brandFilter.lut' },
  { value: 'LA_LOUNGE', labelKey: 'products.brandFilter.lalounge' },
  { value: 'YOUR_BIRTHDAY', labelKey: 'products.brandFilter.birthday' },
]

/* ================= Helpers ================= */

function localizedCategory(p: ProductItem, locale: Locale): string {
  return locale === 'ar' ? p.categoryNameAr ?? '' : p.categoryNameEn ?? ''
}

/** First image path or null (monogram fallback when absent). */
function firstImage(p: ProductItem): string | null {
  const src = p.images?.[0]
  return typeof src === 'string' && src.length > 0 ? src : null
}

/* ================= Component ================= */

export default function ProductsPanel() {
  const { t, locale } = useI18n()

  const [q, setQ] = useState('')
  const [brand, setBrand] = useState<BrandFilter>('ALL')
  const [category, setCategory] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  /** Product ids with an in-flight PATCH (rows disabled). */
  const [pending, setPending] = useState<Set<string>>(new Set())
  /** Stock quick-edit dialog target + draft value (legacy PATCH shape). */
  const [stockDialog, setStockDialog] = useState<StockDialogState | null>(null)
  /** Image srcs that failed to load → fall back to the monogram tile. */
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  /** Create/edit dialog target (null → closed; product null → CREATE). */
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null)
  /** Product queued for delete confirmation. */
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  /* ---- List load (shared admin plumbing: seq guard + abort + 401) ---- */
  const productsUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      includeInactive: 'true',
    })
    if (brand !== 'ALL') params.set('brand', brand)
    if (q) params.set('search', q)
    if (category !== 'ALL') params.set('categoryId', category)
    return `/api/admin/products?${params.toString()}`
  }, [page, brand, q, category])

  const { data, error, loading, sessionExpired, reload, setData, markUnauthorized } =
    useAdminApi<ProductsPage>(productsUrl, [productsUrl])

  /* Clamp an out-of-range page when the dataset shrank externally (the
     request for `page` returned zero rows). Follows the repo's documented
     data-fetch sync-in-effect pattern (see views/products.tsx). */
  useEffect(() => {
    if (!data) return
    const serverPages =
      typeof data.totalPages === 'number' && data.totalPages > 0 ? data.totalPages : 1
    if (data.items.length === 0 && page > serverPages) {
      setPage(serverPages)
    }
  }, [data, page])

  /* ---- Toolbar callbacks (stable → memoized rows don't re-render) ---- */
  const qRef = useRef('')
  const handleSearchCommit = useCallback((value: string) => {
    // Reset the page only when the committed query actually changed.
    setPage((prevPage) => (value === qRef.current ? prevPage : 1))
    qRef.current = value
    setQ(value)
  }, [])

  const handleBrandChange = useCallback((next: BrandFilter) => {
    setBrand(next)
    // Categories are brand-scoped → reset the filter with the brand switch.
    setCategory('ALL')
    setPage(1)
  }, [])

  const handleCategoryChange = useCallback((next: string) => {
    setCategory(next)
    setPage(1)
  }, [])

  const openCreate = useCallback(() => {
    setEditorTarget({ product: null, brand: brand === 'ALL' ? 'LUT' : brand })
  }, [brand])

  const openEdit = useCallback((p: ProductItem) => {
    setEditorTarget({ product: p, brand: p.brand })
  }, [])

  const askDelete = useCallback((p: ProductItem) => {
    setDeleteTarget(p)
  }, [])

  /* ---- Toggle active (optimistic, revert on failure) ---- */
  const patchProduct = useCallback(
    async (p: ProductItem, body: { isActive?: boolean; stock?: number }) => {
      const revert = (patch: Partial<ProductItem>) => {
        setData((prev) =>
          prev
            ? { ...prev, items: prev.items.map((i) => (i.id === p.id ? { ...i, ...patch } : i)) }
            : prev
        )
      }
      setPending((prev) => new Set(prev).add(p.id))
      setData((prev) =>
        prev
          ? { ...prev, items: prev.items.map((i) => (i.id === p.id ? { ...i, ...body } : i)) }
          : prev
      )
      try {
        const res = await fetch(`/api/admin/products/${encodeURIComponent(p.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.status === 401) {
          markUnauthorized()
          revert({ isActive: p.isActive, stock: p.stock })
          return
        }
        if (!res.ok) throw new Error(`patch ${res.status}`)
        const json = (await res.json().catch(() => null)) as { item?: ProductItem } | null
        if (json?.item) {
          // Authoritative row update from the API response.
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  items: prev.items.map((i) => (i.id === p.id ? { ...i, ...json.item } : i)),
                }
              : prev
          )
        }
        toast.success(t('admin.common.updated'))
      } catch {
        revert({ isActive: p.isActive, stock: p.stock })
        toast.error(t('admin.common.error'))
      } finally {
        setPending((prev) => {
          const nextSet = new Set(prev)
          nextSet.delete(p.id)
          return nextSet
        })
      }
    },
    [t, setData, markUnauthorized]
  )

  const toggleActive = useCallback(
    (p: ProductItem) => void patchProduct(p, { isActive: !p.isActive }),
    [patchProduct]
  )

  /* ---- Stock quick-edit (dialog → PATCH legacy shape) ---- */
  const openStockDialog = useCallback((p: ProductItem) => {
    setStockDialog({ product: p, draft: String(p.stock) })
  }, [])

  const saveStock = useCallback(() => {
    const state = stockDialog
    if (!state) return
    const value = Number(state.draft)
    if (!Number.isInteger(value) || value < 0 || value > 9999) {
      toast.error(t('admin.products.errors.stockInvalid'))
      return
    }
    setStockDialog(null)
    void patchProduct(state.product, { stock: value })
  }, [stockDialog, t, patchProduct])

  const markImageFailed = useCallback((src: string) => {
    setFailedImages((prev) => new Set(prev).add(src))
  }, [])

  /* ---- Editor saved → refetch (create jumps to the first page) ---- */
  const closeEditor = useCallback(() => {
    setEditorTarget(null)
  }, [])

  const handleSaved = useCallback(
    (_item: ProductItem | null, created: boolean) => {
      if (created) setPage(1) // new product lands on the first page
      reload()
    },
    [reload]
  )

  /* ---- Delete (confirmed via AlertDialog) ---- */
  const confirmDelete = useCallback(async () => {
    const p = deleteTarget
    if (!p || deletingId) return
    setDeletingId(p.id)
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(p.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (res.status === 401) {
        markUnauthorized()
        return
      }
      if (res.status === 409) {
        const json = (await res.json().catch(() => null)) as { bookingsCount?: number } | null
        const count =
          typeof json?.bookingsCount === 'number' ? json.bookingsCount : p.bookingsCount
        toast.error(t('admin.products.deleteWarningBookings', { count }))
        setDeleteTarget(null)
        return
      }
      if (!res.ok) throw new Error(`delete ${res.status}`)
      toast.success(t('admin.products.deleted'))
      setDeleteTarget(null)
      // Clamp the page if this delete emptied the tail, else just refetch.
      const nextTotal = Math.max(0, (data?.total ?? 0) - 1)
      const nextPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE))
      if (page > nextPages) setPage(nextPages)
      else reload()
    } catch {
      toast.error(t('admin.common.error'))
    } finally {
      setDeletingId(null)
    }
  }, [deleteTarget, deletingId, data?.total, page, t, markUnauthorized, reload])

  /* ---- Derived ---- */
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const categories = data?.categories ?? []
  const totalPages = Math.max(1, data?.totalPages ?? Math.ceil(total / PAGE_SIZE))
  const showPagination = !loading && !error && !sessionExpired && totalPages > 1

  /* ================= Render ================= */

  return (
    <section
      aria-labelledby="admin-products-title"
      className="lux-card relative overflow-hidden rounded-xl border border-[#C9A25E]/20 bg-[#14110B]/95 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur-md"
    >
      {/* Gold top hairline (subtle) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A25E]/70 to-transparent"
      />

      <div className="p-4 sm:p-6">
        {/* ---- Header ---- */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="min-w-0">
            <h2 id="admin-products-title" className="font-display text-xl font-bold text-[#F2EDE3]">
              {t('admin.products.title')}
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
            <RotateCw className={cn('me-2 size-4', loading && 'animate-spin')} aria-hidden="true" />
            {t('admin.common.refresh')}
          </Button>
        </header>

        {/* ---- Toolbar (search lives here — keystrokes stay local) ---- */}
        <ProductsToolbar
          brand={brand}
          onBrandChange={handleBrandChange}
          category={category}
          onCategoryChange={handleCategoryChange}
          categories={categories}
          onSearchCommit={handleSearchCommit}
          onCreate={openCreate}
        />

        {/* ---- States / list ---- */}
        {sessionExpired ? (
          <UnauthorizedNotice label={t('admin.errors.unauthorized')} />
        ) : error ? (
          <ErrorNotice
            message={t('admin.common.error')}
            retryLabel={t('admin.common.retry')}
            onRetry={reload}
          />
        ) : loading && data === null ? (
          <ProductsSkeleton />
        ) : items.length === 0 && !loading ? (
          <EmptyProducts label={t('admin.products.noProducts')} />
        ) : (
          <>
            {/* Desktop — table (dimmed while revalidating) */}
            <div
              aria-busy={loading || undefined}
              className={cn(
                'hidden max-h-[34rem] overflow-y-auto overscroll-contain rounded-lg border border-white/[0.08] transition-opacity md:block',
                loading && 'pointer-events-none opacity-50'
              )}
            >
              <Table className="min-w-[62rem]">
                <TableHeader className="sticky top-0 z-10 bg-[#17130C]">
                  <TableRow className="border-white/[0.08] hover:bg-transparent">
                    <TableHead className="h-11 ps-4 text-start text-xs font-semibold text-[#8A8072]">
                      {t('admin.products.name')}
                    </TableHead>
                    <TableHead className="h-11 text-start text-xs font-semibold text-[#8A8072]">
                      {t('admin.products.category')}
                    </TableHead>
                    <TableHead className="h-11 text-start text-xs font-semibold text-[#8A8072]">
                      {t('admin.products.brand')}
                    </TableHead>
                    <TableHead className="h-11 text-start text-xs font-semibold text-[#8A8072]">
                      {t('admin.products.price')}
                    </TableHead>
                    <TableHead className="h-11 text-start text-xs font-semibold text-[#8A8072]">
                      {t('admin.products.deposit')}
                    </TableHead>
                    <TableHead className="h-11 text-start text-xs font-semibold text-[#8A8072]">
                      {t('admin.products.stock')}
                    </TableHead>
                    <TableHead className="h-11 text-start text-xs font-semibold text-[#8A8072]">
                      {t('admin.products.bookings')}
                    </TableHead>
                    <TableHead className="h-11 text-start text-xs font-semibold text-[#8A8072]">
                      {t('admin.products.active')}
                    </TableHead>
                    <TableHead className="h-11 pe-4 text-start text-xs font-semibold text-[#8A8072]">
                      {t('admin.common.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      busy={pending.has(p.id)}
                      locale={locale}
                      imageFailed={failedImages.has(firstImage(p) ?? '')}
                      onImageError={markImageFailed}
                      onToggleActive={toggleActive}
                      onEditStock={openStockDialog}
                      onEdit={openEdit}
                      onDelete={askDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile — cards */}
            <div
              aria-busy={loading || undefined}
              className={cn(
                'space-y-2.5 transition-opacity md:hidden',
                loading && 'pointer-events-none opacity-50'
              )}
            >
              {items.map((p) => (
                <ProductCardRow
                  key={p.id}
                  product={p}
                  busy={pending.has(p.id)}
                  locale={locale}
                  imageFailed={failedImages.has(firstImage(p) ?? '')}
                  onImageError={markImageFailed}
                  onToggleActive={toggleActive}
                  onEditStock={openStockDialog}
                  onEdit={openEdit}
                  onDelete={askDelete}
                />
              ))}
            </div>
          </>
        )}

        {/* ---- Pagination ---- */}
        {showPagination && (
          <Pager page={page} totalPages={totalPages} onGo={setPage} />
        )}
      </div>

      {/* ---- Stock quick-edit dialog ---- */}
      <Dialog
        open={stockDialog !== null}
        onOpenChange={(open) => {
          if (!open) setStockDialog(null)
        }}
      >
        <DialogContent
          closeAriaLabel={t('common.close')}
          className="border-[#C9A25E]/25 bg-[#1A160E] text-[#F2EDE3]"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-[#F2EDE3]">
              {t('admin.products.stockUpdate')}
            </DialogTitle>
            <DialogDescription className="text-[#B6AD9C]">
              {stockDialog ? localizedName(stockDialog.product, locale) : ''}
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center justify-between gap-3 text-sm text-[#B6AD9C]">
            {t('admin.products.stock')}
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              dir="ltr"
              value={stockDialog?.draft ?? ''}
              onChange={(e) => {
                setStockDialog((prev) => (prev ? { ...prev, draft: e.target.value } : prev))
              }}
              aria-label={t('admin.products.stock')}
              className="h-11 w-32 border-white/12 bg-white/[0.03] text-end tabular-nums text-[#F2EDE3] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStockDialog(null)}
              className="min-h-11 border-white/15 bg-transparent text-[#E5D9BE] hover:bg-white/[0.06] hover:text-[#F2EDE3]"
            >
              {t('admin.common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => saveStock()}
              className="min-h-11 bg-[#C9A25E] font-semibold text-[#17130A] hover:bg-[#D9B56E]"
            >
              {t('admin.common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Create / edit dialog (mounted on demand → fresh state) ---- */}
      {editorTarget !== null ? (
        <ProductsDialog
          key={editorTarget.product?.id ?? 'create'}
          open
          onOpenChange={closeEditor}
          product={editorTarget.product}
          categories={categories}
          brand={editorTarget.brand}
          onSaved={handleSaved}
          onUnauthorized={markUnauthorized}
        />
      ) : null}

      {/* ---- Delete confirmation ---- */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="border-[#C9A25E]/25 bg-[#1A160E] text-[#F2EDE3]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg text-[#F2EDE3]">
              {t('admin.products.deleteConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-[13px] leading-relaxed text-[#B6AD9C]">
                <p>{t('admin.products.deleteConfirm')}</p>
                {deleteTarget ? (
                  <p className="mt-1.5">
                    {localizedName(deleteTarget, locale)}
                    <span dir="ltr" className="ms-1.5 font-mono text-xs text-[#C9A25E]">
                      {deleteTarget.slug}
                    </span>
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={!!deletingId}
              className="min-h-11 border-white/15 bg-transparent text-[#E5D9BE] hover:bg-white/[0.06] hover:text-[#F2EDE3] focus-visible:ring-[#C9A25E]/30"
            >
              {t('admin.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!!deletingId}
              onClick={(e) => {
                e.preventDefault() // stay open while the request is in flight
                void confirmDelete()
              }}
              className="min-h-11 gap-2 bg-[#DC2626] text-[13px] text-white hover:bg-[#DC2626]/85 focus-visible:ring-[#DC2626]/40"
            >
              {deletingId ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {t('admin.common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

/* ================= Toolbar ================= */

/**
 * Search + brand pills + category select + create button. The raw search
 * input lives here so keystrokes re-render only the toolbar, not the table.
 */
function ProductsToolbar({
  brand,
  onBrandChange,
  category,
  onCategoryChange,
  categories,
  onSearchCommit,
  onCreate,
}: {
  brand: BrandFilter
  onBrandChange: (brand: BrandFilter) => void
  category: string
  onCategoryChange: (category: string) => void
  categories: CategoryItem[]
  onSearchCommit: (q: string) => void
  onCreate: () => void
}) {
  const { t, locale } = useI18n()
  const [searchInput, setSearchInput] = useState('')

  /* Debounced search commit (300ms) — resets the page with the query. */
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchCommit(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput, onSearchCommit])

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8A8072]"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('admin.common.search')}
            aria-label={t('admin.common.search')}
            className="h-11 border-white/12 bg-white/[0.03] ps-11 text-[#F2EDE3] placeholder:text-[#8A8072] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger
              id="admin-products-category-filter"
              aria-label={t('admin.products.category')}
              className="h-11 w-full border-white/12 bg-white/[0.03] text-[#F2EDE3] shadow-none focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
            >
              <SelectValue placeholder={t('admin.products.category')} />
            </SelectTrigger>
            <SelectContent className="border-[#C9A25E]/25 bg-[#17130C]/95 text-[#F2EDE3] backdrop-blur-xl">
              <SelectItem
                value="ALL"
                className="text-[13px] focus:bg-[#C9A25E]/10 focus:text-[#F2EDE3]"
              >
                {t('admin.common.all')}
              </SelectItem>
              {categories.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  className="text-[13px] focus:bg-[#C9A25E]/10 focus:text-[#F2EDE3]"
                >
                  {localizedCategoryName(c, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          onClick={onCreate}
          className="ms-auto min-h-11 gap-2 bg-[#C9A25E] px-5 font-semibold text-[#17130A] hover:bg-[#D9B56E]"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('admin.products.create')}
        </Button>
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t('products.brandFilter.label')}
      >
        {BRAND_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={brand === option.value}
            onClick={() => onBrandChange(option.value)}
            className={cn(
              'min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              brand === option.value
                ? 'border-[#C9A25E]/60 bg-[#C9A25E]/15 text-[#E5C878]'
                : 'border-white/10 bg-transparent text-[#B6AD9C] hover:bg-white/[0.04] hover:text-[#E5D9BE]'
            )}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ================= Row atoms ================= */

/** Thumbnail tile — first image or a gold monogram fallback. */
function ProductThumb({
  product,
  locale,
  failed,
  onError,
  size = 'md',
}: {
  product: ProductItem
  locale: Locale
  failed: boolean
  onError: (src: string) => void
  size?: 'md' | 'sm'
}) {
  const src = firstImage(product)
  const box = size === 'md' ? 'size-12' : 'size-11'
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => onError(src)}
        className={cn('shrink-0 rounded-md border border-white/10 bg-white/[0.04] object-cover', box)}
      />
    )
  }
  const name = localizedName(product, locale)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border border-[#C9A25E]/25 bg-[#C9A25E]/10 font-display text-lg font-bold text-[#C9A25E]',
        box
      )}
    >
      {name.trim().charAt(0) || '?'}
    </span>
  )
}

/** Status dot + label — calm green for active, gray for suspended. */
function StatusText({ isActive }: { isActive: boolean }) {
  const { t } = useI18n()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold',
        isActive ? 'text-[#4ADE80]' : 'text-[#8A8072]'
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', isActive ? 'bg-[#4ADE80]' : 'bg-[#8A8072]')}
      />
      {isActive ? t('admin.products.active') : t('admin.products.inactive')}
    </span>
  )
}

/** RTL-aware switch — 44px hit area with the compact track drawn inside. */
function ActiveSwitch({
  product,
  locale,
  busy,
  onToggle,
}: {
  product: ProductItem
  locale: Locale
  busy: boolean
  onToggle: (product: ProductItem) => void
}) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={product.isActive}
      disabled={busy}
      aria-label={`${t('admin.products.toggleActive')}: ${localizedName(product, locale)}`}
      onClick={() => onToggle(product)}
      className={cn(
        'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A25E]/60 disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex h-7 w-11 items-center rounded-full border transition-colors duration-200',
          product.isActive
            ? 'border-[#4ADE80]/40 bg-[#4ADE80]/25'
            : 'border-white/15 bg-white/[0.08]'
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 size-5 -translate-y-1/2 rounded-full transition-[inset-inline-start,background-color] duration-200',
            product.isActive
              ? 'start-[calc(100%_-_1.4375rem)] bg-[#4ADE80]'
              : 'start-[0.1875rem] bg-[#8A8072]'
          )}
        />
      </span>
    </button>
  )
}

/** Bookings count — small chip. */
function BookingsBadge({ count }: { count: number }) {
  return (
    <span
      dir="ltr"
      className="inline-flex min-w-8 items-center justify-center rounded-md border border-white/12 bg-white/[0.05] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#E5D9BE]"
    >
      {count}
    </span>
  )
}

/** Price / deposit figures — LTR + tabular-nums + KWD unit. */
function PriceValue({
  amount,
  locale,
  unitLabel,
}: {
  amount: number
  locale: Locale
  unitLabel: string
}) {
  return (
    <span dir="ltr" className="inline-flex items-baseline gap-1 tabular-nums">
      <span className="text-sm font-semibold text-[#F2EDE3]">{formatKwd(amount, locale)}</span>
      <span className="text-[0.6875rem] text-[#8A8072]">{unitLabel}</span>
    </span>
  )
}

/* ================= Rows (memoized) ================= */

interface RowProps {
  product: ProductItem
  busy: boolean
  locale: Locale
  imageFailed: boolean
  onImageError: (src: string) => void
  onToggleActive: (product: ProductItem) => void
  onEditStock: (product: ProductItem) => void
  onEdit: (product: ProductItem) => void
  onDelete: (product: ProductItem) => void
}

/** Desktop table row. */
const ProductRow = memo(function ProductRow({
  product: p,
  busy,
  locale,
  imageFailed,
  onImageError,
  onToggleActive,
  onEditStock,
  onEdit,
  onDelete,
}: RowProps) {
  const { t } = useI18n()
  const category = localizedCategory(p, locale)
  const name = localizedName(p, locale)

  return (
    <TableRow
      className={cn(
        'border-white/[0.06] transition-colors hover:bg-white/[0.04]',
        !p.isActive && 'opacity-55'
      )}
    >
      <TableCell className="ps-4 py-3">
        <div className="flex items-center gap-3">
          <ProductThumb product={p} locale={locale} failed={imageFailed} onError={onImageError} />
          <div className="min-w-0">
            <p dir="auto" className="truncate text-sm font-semibold text-[#F2EDE3]">
              {name}
            </p>
            <p dir="ltr" className="truncate text-[0.6875rem] text-[#8A8072]">
              {p.slug}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3 text-sm text-[#B6AD9C]">
        {category || <span className="text-[#8A8072]">—</span>}
      </TableCell>
      <TableCell className="py-3">
        <span
          className={cn(
            'rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold',
            BRAND_BADGE[p.brand]
          )}
        >
          {t(BRAND_LABEL_KEY[p.brand])}
        </span>
      </TableCell>
      <TableCell className="py-3">
        <PriceValue amount={p.priceKwd} locale={locale} unitLabel={t('admin.common.kwd')} />
      </TableCell>
      <TableCell className="py-3">
        <PriceValue amount={p.depositKwd} locale={locale} unitLabel={t('admin.common.kwd')} />
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-1">
          <span dir="ltr" className="min-w-6 text-sm font-semibold tabular-nums text-[#F2EDE3]">
            {p.stock}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onEditStock(p)}
            disabled={busy}
            aria-label={`${t('admin.products.stockUpdate')}: ${name}`}
            className="size-11 text-[#C9A25E] hover:bg-white/[0.06] hover:text-[#E5C878] disabled:opacity-50"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <BookingsBadge count={p.bookingsCount} />
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <StatusText isActive={p.isActive} />
          <ActiveSwitch product={p} locale={locale} busy={busy} onToggle={onToggleActive} />
        </div>
      </TableCell>
      <TableCell className="pe-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onEdit(p)}
            disabled={busy}
            aria-label={`${t('admin.products.edit')}: ${name}`}
            className="size-11 text-[#C9A25E] hover:bg-white/[0.06] hover:text-[#E5C878] disabled:opacity-50"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(p)}
            disabled={busy}
            aria-label={`${t('admin.products.delete')}: ${name}`}
            className="size-11 text-[#F87171] hover:bg-[#dc2626]/10 hover:text-[#FCA5A5] disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})

/** Mobile card row. */
const ProductCardRow = memo(function ProductCardRow({
  product: p,
  busy,
  locale,
  imageFailed,
  onImageError,
  onToggleActive,
  onEditStock,
  onEdit,
  onDelete,
}: RowProps) {
  const { t } = useI18n()
  const category = localizedCategory(p, locale)
  const name = localizedName(p, locale)
  const kwd = t('admin.common.kwd')

  return (
    <article
      className={cn(
        'rounded-lg border border-white/[0.08] bg-white/[0.015] p-3.5 transition-colors hover:bg-white/[0.04]',
        !p.isActive && 'opacity-55'
      )}
    >
      {/* Product identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProductThumb
            product={p}
            locale={locale}
            failed={imageFailed}
            onError={onImageError}
            size="sm"
          />
          <div className="min-w-0">
            <p dir="auto" className="truncate text-sm font-semibold text-[#F2EDE3]">
              {name}
            </p>
            <p dir="ltr" className="truncate text-[0.6875rem] text-[#8A8072]">
              {p.slug}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold',
            BRAND_BADGE[p.brand]
          )}
        >
          {t(BRAND_LABEL_KEY[p.brand])}
        </span>
      </div>

      {/* Specs grid */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3 text-xs">
        {category ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-[#8A8072]">{t('admin.products.category')}</dt>
            <dd className="text-[#B6AD9C]">{category}</dd>
          </div>
        ) : null}
        <div className="flex flex-col gap-0.5">
          <dt className="text-[#8A8072]">{t('admin.products.price')}</dt>
          <dd>
            <PriceValue amount={p.priceKwd} locale={locale} unitLabel={kwd} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[#8A8072]">{t('admin.products.deposit')}</dt>
          <dd>
            <PriceValue amount={p.depositKwd} locale={locale} unitLabel={kwd} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[#8A8072]">{t('admin.products.stock')}</dt>
          <dd className="flex items-center gap-2">
            <span dir="ltr" className="text-sm font-semibold tabular-nums text-[#F2EDE3]">
              {p.stock}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onEditStock(p)}
              disabled={busy}
              aria-label={`${t('admin.products.stockUpdate')}: ${name}`}
              className="size-11 text-[#C9A25E] hover:bg-white/[0.06] hover:text-[#E5C878] disabled:opacity-50"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[#8A8072]">{t('admin.products.bookings')}</dt>
          <dd>
            <BookingsBadge count={p.bookingsCount} />
          </dd>
        </div>
      </dl>

      {/* Status + actions */}
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onEdit(p)}
            disabled={busy}
            aria-label={`${t('admin.products.edit')}: ${name}`}
            className="size-11 text-[#C9A25E] hover:bg-white/[0.06] hover:text-[#E5C878] disabled:opacity-50"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(p)}
            disabled={busy}
            aria-label={`${t('admin.products.delete')}: ${name}`}
            className="size-11 text-[#F87171] hover:bg-[#dc2626]/10 hover:text-[#FCA5A5] disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <StatusText isActive={p.isActive} />
          <ActiveSwitch product={p} locale={locale} busy={busy} onToggle={onToggleActive} />
        </div>
      </div>
    </article>
  )
})

/* ================= States ================= */

function ProductsSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-white/[0.08] p-3.5"
          style={{ opacity: 1 - i * 0.1 }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-md bg-white/[0.07]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5 rounded bg-white/[0.07]" />
              <Skeleton className="h-2.5 w-1/4 rounded bg-white/[0.05]" />
            </div>
            <Skeleton className="h-5 w-16 rounded-md bg-white/[0.05]" />
          </div>
          <div className="mt-3 flex gap-3 border-t border-white/[0.06] pt-3">
            <Skeleton className="h-3 w-16 rounded bg-white/[0.05]" />
            <Skeleton className="h-3 w-20 rounded bg-white/[0.05]" />
            <Skeleton className="h-3 w-16 rounded bg-white/[0.05]" />
            <Skeleton className="ms-auto h-3 w-14 rounded bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyProducts({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-full border border-[#C9A25E]/30 bg-[#C9A25E]/10">
        <PackageX className="size-6 text-[#C9A25E]" aria-hidden="true" />
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

/* ================= Pager ================= */

/** Compact dark pager — prev / page dots / next (parametric pageOf label). */
function Pager({
  page,
  totalPages,
  onGo,
}: {
  page: number
  totalPages: number
  onGo: (page: number) => void
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
      aria-label={t('admin.products.pagination')}
    >
      <button
        type="button"
        onClick={() => onGo(page - 1)}
        disabled={page === 1}
        aria-label={t('admin.common.prev')}
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
        aria-label={t('admin.common.next')}
        className="flex size-11 items-center justify-center rounded-full border border-white/12 text-[#E5C878] transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <NextIcon className="size-4" aria-hidden="true" />
      </button>
      <span dir={locale === 'ar' ? 'rtl' : 'ltr'} className="w-full text-center text-xs text-[#8A8072] sm:w-auto sm:ms-3">
        {t('products.pageOf', { current: page, total: totalPages })}
      </span>
    </nav>
  )
}
