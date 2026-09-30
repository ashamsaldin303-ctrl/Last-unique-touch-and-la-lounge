'use client'

/**
 * PRODUCTS — LUT catalog (route /products).
 *
 * Reproduces the original repo's products page (search + category pills +
 * sort + pagination) with component-local filter state (no URL state),
 * a 300ms-debounced search, shimmer skeleton loaders, staggered reveals
 * and animated page transitions — elevated by the CATALOG LAYER:
 * ambient gold backdrop, jewel search toolbar, sliding active pill,
 * circular gold pagination and an end-of-page finial.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, RotateCcw, Search, SearchX } from 'lucide-react'
import { useI18n, useResultCount } from '@/lib/i18n'
import {
  fetchProducts,
  localizedName,
  type CategoryDTO,
  type ProductDTO,
  type ProductSort,
  type ProductsResponse,
} from '@/lib/products'
import { PageHeader } from '@/components/shared/page-header'
import { Reveal } from '@/components/shared/reveal'
import { StaggerGroup } from '@/components/shared/upgrade'
import { ProductCard } from '@/components/shop/product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const SORTS: ProductSort[] = ['newest', 'price-asc', 'price-desc']
const PAGE_SIZE_SKELETON = 8

export default function ProductsPage() {
  const { t, locale } = useI18n()
  const resultCount = useResultCount()

  /* ---- Filter state (component-local; URL state not needed) ---- */
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<ProductSort>('newest')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<ProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const gridTopRef = useRef<HTMLDivElement | null>(null)
  const requestIdRef = useRef(0)

  /* ---- Debounced search (300ms) ---- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  /* ---- Fetch products (stale-response guarded) ---- */
  const load = useCallback(() => {
    const id = ++requestIdRef.current
    setLoading(true)
    setError(false)
    fetchProducts({ brand: 'LUT', category, search, sort, page })
      .then((res) => {
        if (requestIdRef.current !== id) return
        setData(res)
        setLoading(false)
      })
      .catch(() => {
        if (requestIdRef.current !== id) return
        setError(true)
        setLoading(false)
      })
  }, [category, search, sort, page])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/filter sync sets the loading flag before the async fetch (data-fetch pattern)
    load()
  }, [load])

  const goToPage = useCallback(
    (next: number) => {
      const totalPages = data?.totalPages ?? 1
      if (next < 1 || next > totalPages || next === page) return
      setPage(next)
      // Keep the results in view when the list swaps.
      requestAnimationFrame(() => {
        gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    [data?.totalPages, page]
  )

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setSearch('')
    setCategory(undefined)
    setSort('newest')
    setPage(1)
  }, [])

  const categories: CategoryDTO[] = data?.categories ?? []
  const products: ProductDTO[] = data?.products ?? []
  const totalPages = data?.totalPages ?? 1
  const showEmpty = !loading && !error && products.length === 0

  return (
    <div className="relative mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      {/* Ambient gold backdrop (decorative) */}
      <div className="catalog-ambient" aria-hidden="true" />

      <div className="relative z-10">
        <PageHeader title={t('products.title')} subtitle={t('products.subtitle')} />

        {/* ---- Filter toolbar ---- */}
        <Reveal className="mb-10">
          <div className="glass-card rounded-lg p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.18)] sm:p-5">
            {/* Search + sort */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="search-jewel relative flex-1 rounded-md border border-input bg-card">
                <Search
                  className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('products.searchPlaceholder')}
                  aria-label={t('products.searchPlaceholder')}
                  className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-0 ps-11"
                />
              </div>

              <div className="w-full sm:w-60">
                <Select
                  value={sort}
                  onValueChange={(value) => {
                    setSort(value as ProductSort)
                    setPage(1)
                  }}
                >
                  <SelectTrigger
                    className="h-11 w-full bg-card"
                    aria-label={t('products.sort.label')}
                  >
                    <SelectValue placeholder={t('products.sort.label')} />
                  </SelectTrigger>
                  <SelectContent>
                    {SORTS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`products.sort.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category pills */}
            <div
              className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4"
              role="group"
              aria-label={t('products.allCategories')}
            >
              <CategoryPill
                active={!category}
                label={t('products.allCategories')}
                onClick={() => {
                  setCategory(undefined)
                  setPage(1)
                }}
              />
              {categories.map((cat) => (
                <CategoryPill
                  key={cat.id}
                  active={category === cat.slug}
                  label={localizedName(cat, locale)}
                  onClick={() => {
                    setCategory(cat.slug)
                    setPage(1)
                  }}
                />
              ))}

              {/* Result count — gold diamond bullet */}
              <span className="ms-auto hidden items-center gap-2 self-center text-xs text-muted-foreground sm:inline-flex" aria-live="polite">
                <span
                  className="inline-block size-1.5 rotate-45 bg-gold/70"
                  aria-hidden="true"
                />
                {loading ? t('common.loading') : resultCount(data?.total ?? 0)}
              </span>
            </div>
            {/* Result count (mobile) */}
            <p className="mt-3 text-xs text-muted-foreground sm:hidden" aria-live="polite">
              {loading ? t('common.loading') : resultCount(data?.total ?? 0)}
            </p>
          </div>
        </Reveal>

        {/* ---- Grid / states ---- */}
        <div ref={gridTopRef} className="scroll-mt-24" />

        {error ? (
          <div className="glass-card flex flex-col items-center justify-center gap-4 rounded-lg px-6 py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
              <SearchX className="size-6 text-gold" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">{t('common.error')}</p>
            <Button variant="outline" onClick={load} className="min-h-[44px]">
              <RotateCcw className="me-2 size-4" aria-hidden="true" />
              {t('common.retry')}
            </Button>
          </div>
        ) : loading ? (
          <ProductsGridSkeleton />
        ) : showEmpty ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${page}-${category ?? 'all'}-${sort}-${search}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <StaggerGroup className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </StaggerGroup>
              </motion.div>
            </AnimatePresence>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onGo={goToPage}
              prevLabel={t('products.previous')}
              nextLabel={t('products.next')}
              navLabel={t('products.page')}
            />
          </>
        )}

        {/* End-of-page finial */}
        <div className="mt-16 flex items-center justify-center gap-4" aria-hidden="true">
          <span className="h-px w-24 bg-gradient-to-r from-transparent to-gold/50 sm:w-36" />
          <span className="finial-diamond" />
          <span className="h-px w-24 bg-gradient-to-l from-transparent to-gold/50 sm:w-36" />
        </div>
      </div>
    </div>
  )
}

/* ================= Sub-components ================= */

function CategoryPill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'pill-lux z-10 min-h-[40px] rounded-full px-4 py-2 text-sm font-medium',
        active && 'text-primary-foreground'
      )}
    >
      {/* Sliding active background shared across pills (layout animation) */}
      {active && (
        <motion.span
          layoutId="catalog-pill-active"
          className="pill-lux-active absolute inset-0 -z-10 rounded-full"
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          aria-hidden="true"
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  )
}

function ProductsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: PAGE_SIZE_SKELETON }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-md border border-border bg-card"
          style={{ opacity: 1 - i * 0.06 }}
        >
          <div className="shimmer aspect-square" />
          <div className="space-y-2.5 p-4">
            <div className="shimmer h-3 w-1/3 rounded" />
            <div className="shimmer h-4 w-2/3 rounded" />
            <div className="shimmer h-4 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  const { t } = useI18n()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      role="status"
      aria-live="polite"
      className="glass-card relative flex flex-col items-center justify-center overflow-hidden rounded-lg px-6 py-20 text-center"
    >
      {/* Faint ambient halo behind the icon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl"
      />
      <div className="relative mb-6 flex size-16 items-center justify-center rounded-full border border-gold/35 bg-gold/10">
        <SearchX className="size-8 text-gold" aria-hidden="true" />
      </div>
      <h3 className="mb-2 font-display text-xl font-bold text-foreground">
        {t('products.empty.title')}
      </h3>
      <div className="mb-3 flex items-center gap-3" aria-hidden="true">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/60" />
        <span className="size-1.5 rotate-45 bg-gold/70" />
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/60" />
      </div>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{t('products.empty.subtitle')}</p>
      <Button onClick={onClear} className="btn-lux min-h-[44px] rounded-md px-6">
        <RotateCcw className="me-2 size-4" aria-hidden="true" />
        {t('products.empty.clearFilters')}
      </Button>
    </motion.div>
  )
}

function Pagination({
  currentPage,
  totalPages,
  onGo,
  prevLabel,
  nextLabel,
  navLabel,
}: {
  currentPage: number
  totalPages: number
  onGo: (page: number) => void
  prevLabel: string
  nextLabel: string
  navLabel: string
}) {
  const { t } = useI18n()

  if (totalPages <= 1) return null

  const pageNumbers: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
  } else {
    pageNumbers.push(1)
    if (currentPage > 3) pageNumbers.push('…')
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pageNumbers.push(i)
    if (currentPage < totalPages - 2) pageNumbers.push('…')
    pageNumbers.push(totalPages)
  }

  const btnBase =
    'group/pagi flex items-center justify-center rounded-full border transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav className="mt-14 flex flex-wrap items-center justify-center gap-2.5" aria-label={navLabel}>
      <button
        type="button"
        onClick={() => onGo(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label={prevLabel}
        className={cn(
          btnBase,
          'size-11 border-gold/30 bg-card/70 text-gold backdrop-blur-sm hover:border-gold/60 hover:bg-gold/10 hover:shadow-[0_8px_20px_-10px_rgba(139,107,61,0.5)]'
        )}
      >
        <PrevIconClass />
      </button>

      <AnimatePresence mode="popLayout" initial={false}>
        {pageNumbers.map((pageNum, idx) =>
          pageNum === '…' ? (
            <motion.span
              layout
              key={`ellipsis-${idx}`}
              className="flex size-11 items-center justify-center text-muted-foreground"
            >
              …
            </motion.span>
          ) : (
            <motion.button
              layout
              key={pageNum}
              type="button"
              onClick={() => onGo(pageNum)}
              aria-current={pageNum === currentPage ? 'page' : undefined}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              whileTap={{ scale: 0.92 }}
              className={cn(
                btnBase,
                'size-11 text-sm font-semibold',
                pageNum === currentPage
                  ? 'border-transparent bg-gradient-to-br from-gold to-primary text-primary-foreground shadow-[0_10px_24px_-8px_rgba(139,107,61,0.6)]'
                  : 'border-gold/30 bg-card/70 text-foreground/80 backdrop-blur-sm hover:border-gold/60 hover:bg-gold/10 hover:text-gold'
              )}
            >
              {pageNum}
            </motion.button>
          )
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => onGo(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label={nextLabel}
        className={cn(
          btnBase,
          'size-11 border-gold/30 bg-card/70 text-gold backdrop-blur-sm hover:border-gold/60 hover:bg-gold/10 hover:shadow-[0_8px_20px_-10px_rgba(139,107,61,0.5)]'
        )}
      >
        <NextIconClass />
      </button>

      {/* Page context */}
      <span className="sr-only">
        {t('products.pageOf', { current: currentPage, total: totalPages })}
      </span>
      <span className="w-full text-center text-xs text-muted-foreground sm:w-auto sm:ms-4" aria-hidden="true">
        {t('products.pageOf', { current: currentPage, total: totalPages })}
      </span>
    </nav>
  )
}

/* Direction-aware chevrons (imported icons need the locale at render time). */
function PrevIconClass() {
  const { locale } = useI18n()
  const Icon = locale === 'ar' ? ChevronRight : ChevronLeft
  return <Icon className="size-4 transition-transform duration-300 group-hover/pagi:scale-110" aria-hidden="true" />
}

function NextIconClass() {
  const { locale } = useI18n()
  const Icon = locale === 'ar' ? ChevronLeft : ChevronRight
  return <Icon className="size-4 transition-transform duration-300 group-hover/pagi:scale-110" aria-hidden="true" />
}
