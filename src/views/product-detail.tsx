'use client'

/**
 * PRODUCT DETAIL — route /products/[slug] (LUT brand).
 *
 * Reproduces the original repo's product page: breadcrumbs, gallery with
 * thumbnails, product info, rental picker with live availability, trust
 * badges and related products — elevated by the CATALOG LAYER: ambient
 * gold backdrop, spotlight gallery with cursor-follow glow + keyboard
 * navigation, gold-seal 3D badge, price display, concierge rental
 * section, ornamental related header and an end-of-page finial.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, ChevronLeft, ChevronRight, PackageSearch, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import {
  fetchProductBySlug,
  fetchRelatedProducts,
  localizedName,
  localizedDescription,
  formatKwd,
  type ProductDTO,
} from '@/lib/products'
import { Reveal } from '@/components/shared/reveal'
import { StaggerGroup } from '@/components/shared/upgrade'
import { ProductCard } from '@/components/shop/product-card'
import { RentalPicker } from '@/components/shop/rental-picker'
import { TrustBadges } from '@/components/shop/trust-badges'
import { withTimeout } from '@/lib/with-timeout'
import { Button } from '@/components/ui/button'

export default function ProductDetailPage({ slug }: { slug: string }) {
  const { t, locale } = useI18n()
  const { navigate } = useRouter()

  const [product, setProduct] = useState<ProductDTO | null>(null)
  const [related, setRelated] = useState<ProductDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [failed, setFailed] = useState(false)
  const requestIdRef = useRef(0)

  /* Fetch (retryable) — seq-guarded: a stale response for a previous slug
     or a late response after a timeout can never overwrite the newer state. */
  const load = useCallback(() => {
    const id = ++requestIdRef.current
    setLoading(true)
    setNotFound(false)
    setFailed(false)
    setProduct(null)
    setRelated([])

    // Slug-only lookup: the catalog spans all three brands (LUT / LA_LOUNGE /
    // YOUR_BIRTHDAY) and links by slug — fencing the fetch to 'LUT' made
    // red-carpet & led-dance-floor 404. Theming follows the product's own brand.
    withTimeout(fetchProductBySlug(slug))
      .then((result) => {
        if (requestIdRef.current !== id) return
        if (!result) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setProduct(result)
        setLoading(false)
        // Related products load in the background — same brand as the product.
        // A failure here only skips the rail (never breaks the page).
        withTimeout(fetchRelatedProducts(result.id, result.brand))
          .then((list) => {
            if (requestIdRef.current !== id) return
            setRelated(Array.isArray(list) ? list : [])
          })
          .catch(() => {
            /* background rail — silently skipped */
          })
      })
      .catch(() => {
        if (requestIdRef.current !== id) return
        requestIdRef.current++
        setFailed(true)
        setLoading(false)
      })
  }, [slug])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route-change sync: flip to the skeleton before the async fetch resolves
    load()
  }, [load])

  /* Align the page's brand theme with the product's own brand (the route
     resolver defaults /products/* to 'lut'). BrandThemeSetter re-applies the
     path-derived brand on the next navigation, so no cleanup is needed. */
  useEffect(() => {
    if (!product) return
    const brandKey =
      product.brand === 'LA_LOUNGE' ? 'lalounge' : product.brand === 'YOUR_BIRTHDAY' ? 'birthday' : 'lut'
    document.documentElement.dataset.brand = brandKey
  }, [product])

  if (loading) return <ProductDetailSkeleton />

  /* Network failure (offline / timeout) — distinct from not-found so the
     visitor can retry instead of being told the product doesn't exist. */
  if (failed) {
    return (
      <div className="relative mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="catalog-ambient" aria-hidden="true" />
        <div
          role="alert"
          className="glass-card relative z-10 flex flex-col items-center rounded-lg px-8 py-12"
        >
          <div className="mb-6 flex size-16 items-center justify-center rounded-full border border-gold/35 bg-gold/10">
            <PackageSearch className="size-8 text-gold" aria-hidden="true" />
          </div>
          <p className="mb-8 max-w-sm text-sm text-muted-foreground">{t('common.error')}</p>
          <Button onClick={load} className="btn-lux min-h-[44px] rounded-md px-6">
            {t('common.retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="relative mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="catalog-ambient" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-6 flex size-16 items-center justify-center rounded-full border border-gold/35 bg-gold/10">
            <PackageSearch className="size-8 text-gold" aria-hidden="true" />
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold text-foreground">
            {t('common.notFound')}
          </h1>
          <p className="mb-8 max-w-sm text-sm text-muted-foreground">
            {t('products.empty.subtitle')}
          </p>
          <Button onClick={() => navigate('/products')} className="btn-lux min-h-[44px] rounded-md px-6">
            {t('cart.empty.cta')}
          </Button>
        </div>
      </div>
    )
  }

  const name = localizedName(product, locale)
  const categoryName = product.category ? localizedName(product.category, locale) : ''
  const description = localizedDescription(product, locale)
  const isOutOfStock = product.stock === 0
  const images = product.images?.length ? product.images : []

  return (
    <div className="relative mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      {/* Ambient gold backdrop (decorative) */}
      <div className="catalog-ambient" aria-hidden="true" />

      <div className="relative z-10">
        {/* Breadcrumbs */}
        <Breadcrumbs
          categoryName={categoryName}
          productName={name}
          onNavigate={navigate}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
          {/* ---- Gallery ---- */}
          <Reveal>
            <Gallery images={images} productName={name} model3dUrl={product.model3dUrl} />
          </Reveal>

          {/* ---- Info ---- */}
          <div className="space-y-6">
            <Reveal delay={0.08}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {categoryName && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-gold">
                      <span className="inline-block size-1 rotate-45 bg-gold/70" aria-hidden="true" />
                      {categoryName}
                    </span>
                  )}
                  {isOutOfStock && (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground">
                      {t('product.outOfStock')}
                    </span>
                  )}
                </div>

                <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  {name}
                </h1>

                {/* Title flourish */}
                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="h-px w-16 bg-gradient-to-r from-gold/70 to-transparent" />
                  <span className="size-1.5 rotate-45 bg-gold/70" />
                </div>

                {/* Price display */}
                <div className="space-y-2.5">
                  <p className="price-display flex items-baseline gap-2 text-4xl sm:text-5xl">
                    <span className="price-pop tabular-nums">{formatKwd(product.rentalPricePerDay)}</span>
                    <span className="text-sm font-normal tracking-wide text-muted-foreground">
                      {t('product.perDay')}
                    </span>
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-gold/80" aria-hidden="true" />
                    {t('product.securityDeposit', { amount: formatKwd(product.securityDeposit) })}
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="border-t border-border pt-6">
                <div className="mb-2 flex items-center gap-3">
                  <span className="h-px w-6 bg-gold/50" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-foreground">
                    {t('product.description')}
                  </h2>
                </div>
                <p className="whitespace-pre-line text-sm leading-loose text-muted-foreground">
                  {description}
                </p>
              </div>
            </Reveal>

            {/* ---- Rental section ---- */}
            <Reveal delay={0.2} className="border-t border-border pt-6">
              <RentalPicker product={product} />
            </Reveal>
          </div>
        </div>

        {/* ---- Trust badges ---- */}
        <TrustBadges />

        {/* ---- Related products ---- */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-border pt-12" aria-labelledby="related-heading">
            <Reveal>
              {/* Ornamental header */}
              <div className="mb-8 flex items-center gap-4">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-gold/60" aria-hidden="true" />
                <h2 id="related-heading" className="font-display text-2xl font-bold text-foreground">
                  {t('product.related')}
                </h2>
                <span className="finial-diamond !size-2" aria-hidden="true" />
                <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/40 to-gold/60" aria-hidden="true" />
              </div>
            </Reveal>
            <StaggerGroup className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </StaggerGroup>
          </section>
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

/* ================= Breadcrumbs ================= */

function Breadcrumbs({
  categoryName,
  productName,
  onNavigate,
}: {
  categoryName: string
  productName: string
  onNavigate: (path: string) => void
}) {
  const { t, locale } = useI18n()
  const Separator = locale === 'ar' ? ChevronLeft : ChevronRight

  const crumbs = [
    { label: t('product.breadcrumbs.home'), path: '/' },
    { label: t('product.breadcrumbs.products'), path: '/products' },
    ...(categoryName ? [{ label: categoryName, path: '/products' }] : []),
  ]

  return (
    <nav
      className="mb-8 flex flex-wrap items-center gap-1.5 text-sm"
      aria-label={t('a11y.breadcrumb')}
    >
      {crumbs.map((crumb, idx) => (
        <span key={`${crumb.path}-${idx}`} className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onNavigate(crumb.path)}
            className="crumb-lux rounded text-muted-foreground hover:underline hover:decoration-gold/50 hover:underline-offset-4"
          >
            {crumb.label}
          </button>
          <Separator className="size-3 text-gold/60" aria-hidden="true" />
        </span>
      ))}
      <span className="max-w-[200px] truncate font-medium text-gold" aria-current="page">
        {productName}
      </span>
    </nav>
  )
}

/* ================= Gallery ================= */

/** Frame cap shared by the main image, the counter and the thumb strip —
 *  one constant so they can never desync (previously the thumbs sliced
 *  [0,10] while the gallery indexed the full list). */
const MAX_GALLERY_IMAGES = 10

function Gallery({
  images,
  productName,
  model3dUrl,
}: {
  images: string[]
  productName: string
  model3dUrl: string | null
}) {
  const { t, locale } = useI18n()
  /* Single source of truth for every gallery surface. */
  const shownImages = images.slice(0, MAX_GALLERY_IMAGES)
  const [selected, setSelected] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  /* Broken src for the main frame — swaps it to the no-image placeholder. */
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const current = shownImages[selected] ?? null
  const hasImages = shownImages.length > 1

  /* Switching frames resets the transient flags so each new image gets its
     shimmer/fade-in and a broken src can retry its placeholder — the first
     image's loaded state used to stick for all subsequent frames. */
  const selectImage = useCallback(
    (next: number) => {
      if (next < 0 || next >= shownImages.length || next === selected) return
      setImgLoaded(false)
      setFailedSrc(null)
      setSelected(next)
    },
    [selected, shownImages.length]
  )

  const go = useCallback((dir: 1 | -1) => selectImage(selected + dir), [selected, selectImage])

  /* Cursor-follow spotlight: track the pointer as CSS vars (GPU-cheap). */
  const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }

  /* RTL-aware keyboard navigation: the forward direction follows the
     reading direction (AR: left arrow advances; EN: right arrow). */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasImages) return
    const forwardKey = locale === 'ar' ? 'ArrowLeft' : 'ArrowRight'
    const backKey = locale === 'ar' ? 'ArrowRight' : 'ArrowLeft'
    if (e.key === forwardKey) {
      e.preventDefault()
      go(1)
    } else if (e.key === backKey) {
      e.preventDefault()
      go(-1)
    }
  }

  return (
    <div className="group/gallery">
      {/* Main image — Double-Bezel (Doppelrand) ivory plate: outer shell
          + concentric inner core, brass-tinted shadow (SKILL.md kit) */}
      <div className="spotlight-gallery">
        <div className="bezel-card bezel-card--light">
        <div
          onMouseMove={handleSpotlight}
          onKeyDown={handleKeyDown}
          tabIndex={hasImages ? 0 : -1}
          role="group"
          aria-label={t('product.gallery.label')}
          className="bezel-core spotlight-frame relative aspect-square overflow-hidden rounded-md border border-border bg-card"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current ?? 'empty'}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {current && current !== failedSrc ? (
                <Image
                  src={current}
                  alt={productName}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setFailedSrc(current)}
                  className="img-shimmer object-cover transition-transform duration-[1200ms] ease-out group-hover/gallery:scale-[1.03]"
                  data-loaded={imgLoaded ? 'true' : 'false'}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  {t('common.noImage')}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Cursor-follow spotlight veil */}
          <div className="gallery-spot" aria-hidden="true" />

          {/* Gold frame hairline */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[3] rounded-md ring-1 ring-inset ring-gold/20"
          />

          {/* Image counter */}
          {hasImages && (
            <span className="absolute bottom-3 start-3 z-[4] inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/45 px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums text-white backdrop-blur-sm">
              {selected + 1} / {shownImages.length}
            </span>
          )}

          {/* 3D badge — gold seal */}
          {model3dUrl && (
            <span className="seal-gold absolute bottom-3 end-3 z-[4] rounded-md px-3 py-2 text-xs font-medium">
              <Box className="size-4" aria-hidden="true" />
              {t('product.3d.enable')}
            </span>
          )}

          {/* Slide arrows (desktop hover) — prev at the reading edge, next at the far edge */}
          {hasImages && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t('product.gallery.prev')}
                aria-hidden="true"
                tabIndex={-1}
                className="spotlight-arrow absolute start-3 top-1/2 z-[4] flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-sm"
              >
                {locale === 'ar' ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t('product.gallery.next')}
                aria-hidden="true"
                tabIndex={-1}
                className="spotlight-arrow absolute end-3 top-1/2 z-[4] flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-sm"
              >
                {locale === 'ar' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Thumbnails */}
      {hasImages && (
        <div className="mt-4 grid grid-cols-5 gap-2" role="group" aria-label={productName}>
          {shownImages.map((img, idx) => (
            <GalleryThumb
              key={`${img}-${idx}`}
              img={img}
              label={`${productName} — ${idx + 1}`}
              active={selected === idx}
              onClick={() => selectImage(idx)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Single thumbnail with a broken-src fallback (matches the ProductCard
 *  no-image placeholder pattern). */
function GalleryThumb({
  img,
  label,
  active,
  onClick,
}: {
  img: string
  label: string
  active: boolean
  onClick: () => void
}) {
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active}
      aria-label={label}
      className={`thumb-frame relative aspect-square overflow-hidden rounded-md border-2 ${
        active ? 'border-gold opacity-100' : 'border-border opacity-75 hover:opacity-100'
      }`}
    >
      {failed ? (
        <span className="flex h-full w-full items-center justify-center bg-muted px-1 text-center text-[0.5625rem] leading-tight text-muted-foreground">
          {t('common.noImage')}
        </span>
      ) : (
        <Image
          src={img}
          alt={label}
          fill
          sizes="80px"
          onError={() => setFailed(true)}
          className="object-cover"
        />
      )}
    </button>
  )
}

/* ================= Skeleton ================= */

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10" aria-hidden="true">
      <div className="shimmer mb-6 h-4 w-48 rounded" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="shimmer aspect-square rounded-md" />
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shimmer aspect-square rounded-md" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="shimmer h-6 w-24 rounded-full" />
          <div className="shimmer h-10 w-3/4 rounded" />
          <div className="shimmer h-8 w-40 rounded" />
          <div className="shimmer h-4 w-full rounded" />
          <div className="shimmer h-4 w-2/3 rounded" />
          <div className="shimmer h-40 w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}
