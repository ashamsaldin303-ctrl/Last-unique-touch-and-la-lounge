'use client'

/**
 * LA LOUNGE — Editorial Collection storefront (route /la-lounge/products).
 *
 * Task 28-a redesign: a magenta editorial "atelier lookbook" catalog built
 * on the pre-provisioned ll-store-* kit — drafting-paper backdrop
 * (ll-store-draft), outlined oversized index numbers (ll-store-index),
 * magenta hairline rules (ll-store-rule), price plates (ll-store-price)
 * and glowing-frame cards (ll-store-card). The page themes itself
 * automatically via data-brand='lalounge' (dark plum + magenta) set by
 * BrandThemeSetter; every shared component and theme variable follows.
 *
 * Data: the 4 LA_LOUNGE pieces from /api/products (fetchProducts). Each
 * card links to its product-detail page, which re-themes magenta through
 * the product's own brand.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { AlertCircle, ArrowLeft, ArrowRight, RotateCcw, SearchX } from 'lucide-react'
import { useI18n, type Locale } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { withTimeout } from '@/lib/with-timeout'
import {
  fetchProducts,
  formatKwd,
  localizedName,
  localizedDescription,
  type ProductDTO,
} from '@/lib/products'
import { Reveal } from '@/components/shared/reveal'
import { TiltCard } from '@/components/shared/upgrade'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Editorial helpers                                                   */
/* ------------------------------------------------------------------ */

/** Latin house marker embedded in the localized collection titles. */
const TITLE_MARKER = 'La Lounge'

/** Title with the house marker set in italic magenta (editorial accent). */
function EditorialTitle({ title }: { title: string }) {
  const cut = title.indexOf(TITLE_MARKER)
  if (cut === -1) return <>{title}</>
  return (
    <>
      {title.slice(0, cut)}
      <span className="text-primary italic">{TITLE_MARKER}</span>
      {title.slice(cut + TITLE_MARKER.length)}
    </>
  )
}

/** Two-digit editorial numbering: 01 / 02 / 03 / 04. */
const issueNo = (i: number) => String(i + 1).padStart(2, '0')

/**
 * Spaced-caps treatment that respects Arabic script: Latin gets
 * letter-spacing + uppercase; Arabic gets word-spacing instead
 * (letter-spacing would tear the joined letters apart).
 */
const eyebrowTypo = (locale: Locale): CSSProperties =>
  locale === 'ar'
    ? { wordSpacing: '0.45em' }
    : { letterSpacing: '0.32em', textTransform: 'uppercase' }

/* ------------------------------------------------------------------ */
/* Editorial collection card                                           */
/* ------------------------------------------------------------------ */

interface CollectionCardProps {
  product: ProductDTO
  index: number
  /** Editorial feature treatment — spans the row, horizontal plate. */
  featured?: boolean
}

function CollectionCard({ product, index, featured = false }: CollectionCardProps) {
  const { t, locale } = useI18n()
  const { navigate, href } = useRouter()
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight
  const arrowSlide =
    locale === 'ar' ? 'group-hover/link:-translate-x-1.5' : 'group-hover/link:translate-x-1.5'

  const name = localizedName(product, locale)
  const description = localizedDescription(product, locale)
  const category = product.category
    ? locale === 'ar'
      ? product.category.nameAr
      : product.category.nameEn
    : null
  const detailPath = `/products/${product.slug}`

  return (
    <Reveal className={cn('h-full', featured && 'sm:col-span-2')} delay={index * 0.07}>
      <TiltCard className="h-full rounded-xl" max={featured ? 4 : 6}>
        <article
          className={cn(
            'll-store-card group flex h-full overflow-hidden rounded-xl',
            featured ? 'flex-col sm:flex-row' : 'flex-col'
          )}
        >
          {/* — visual plate — */}
          <div
            className={cn(
              'relative overflow-hidden bg-secondary',
              featured ? 'aspect-[4/3] sm:aspect-auto sm:w-[55%]' : 'aspect-[4/3]'
            )}
          >
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={name}
                fill
                priority={featured}
                sizes={featured ? '(max-width: 640px) 100vw, 58vw' : '(max-width: 640px) 100vw, 46vw'}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                {t('common.noImage')}
              </div>
            )}

            {/* scrim so the outlined index reads over the photograph */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/85 to-transparent"
            />
            {/* oversized outlined index number */}
            <span
              aria-hidden="true"
              className={cn(
                'll-store-index absolute start-3 top-1 select-none',
                featured ? 'text-7xl sm:text-8xl' : 'text-6xl sm:text-7xl'
              )}
            >
              {issueNo(index)}
            </span>

            {/* category hairline pill */}
            {category && (
              <span
                className={cn(
                  'absolute end-3 top-3 rounded-full border border-primary/45 bg-background/65 px-3 py-1 text-[0.62rem] font-semibold text-primary backdrop-blur-sm',
                  locale === 'en' && 'tracking-[0.18em] uppercase'
                )}
              >
                {category}
              </span>
            )}
          </div>

          {/* — editorial caption — */}
          <div className={cn('flex flex-1 flex-col gap-3 p-5', featured && 'sm:gap-4 sm:p-7')}>
            <h3
              className={cn(
                'font-display leading-snug text-foreground',
                featured ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
              )}
            >
              {name}
            </h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

            {/* price plate */}
            <div className="ll-store-price mt-auto rounded-lg p-4">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span style={eyebrowTypo(locale)} className="text-[0.62rem] font-bold text-muted-foreground/90">
                  {t('laLoungeProducts.rentFrom')}
                </span>
                <span className="font-display text-3xl font-semibold leading-none text-primary">
                  {formatKwd(product.rentalPricePerDay)}
                </span>
                <span className="text-xs text-muted-foreground">{t('product.perDay')}</span>
              </div>
              <p className="mt-2 text-[0.7rem] leading-relaxed text-muted-foreground/90">
                {t('product.securityDeposit', { amount: formatKwd(product.securityDeposit) })}
              </p>
            </div>

            {/* view product */}
            <a
              href={href(detailPath)}
              onClick={(e) => {
                // Only intercept plain left clicks — ctrl/cmd/shift/alt and
                // middle clicks fall through to the browser (open in new tab).
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                e.preventDefault()
                navigate(detailPath)
              }}
              aria-label={`${t('laLoungeProducts.viewProduct')} — ${name}`}
              className="group/link inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-primary/40 px-5 py-3 text-sm font-bold text-primary transition-colors duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              {t('laLoungeProducts.viewProduct')}
              <ArrowIcon
                className={cn('size-4 transition-transform duration-300', arrowSlide)}
                aria-hidden="true"
              />
            </a>
          </div>
        </article>
      </TiltCard>
    </Reveal>
  )
}

/* ------------------------------------------------------------------ */
/* Editorial note plate (fills the closing grid cell)                  */
/* ------------------------------------------------------------------ */

function CollectionNote() {
  const { t } = useI18n()
  return (
    <Reveal delay={0.28} className="h-full">
      <aside className="ll-store-card relative flex h-full min-h-[260px] flex-col items-center justify-center gap-5 overflow-hidden rounded-xl p-7 text-center">
        <span
          aria-hidden="true"
          className="size-2.5 rotate-45 bg-primary shadow-[0_0_16px_rgba(230,0,126,0.55)]"
        />
        <p className="text-[0.62rem] font-bold tracking-[0.4em] text-primary/80">{t('brand.lalounge')}</p>
        <p className="font-display max-w-[24ch] text-lg leading-relaxed text-foreground/90 sm:text-xl">
          {t('laLoungeProducts.collectionNote')}
        </p>
        <div className="ll-store-rule w-24" aria-hidden="true" />
      </aside>
    </Reveal>
  )
}

/* ------------------------------------------------------------------ */
/* Loading skeleton — mirrors the editorial layout                     */
/* ------------------------------------------------------------------ */

function SkeletonCard({ featured = false }: { featured?: boolean }) {
  return (
    <div className={cn('h-full', featured && 'sm:col-span-2')} aria-hidden="true">
      <div
        className={cn(
          'll-store-card flex h-full overflow-hidden rounded-xl',
          featured ? 'flex-col sm:flex-row' : 'flex-col'
        )}
      >
        <div
          className={cn(
            'shimmer',
            featured ? 'aspect-[4/3] sm:aspect-auto sm:w-[55%] sm:min-h-[280px]' : 'aspect-[4/3]'
          )}
        />
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="shimmer h-6 w-2/3 rounded-md" />
          <div className="shimmer h-4 w-full rounded-md" />
          <div className="shimmer h-4 w-4/5 rounded-md" />
          <div className="ll-store-price mt-auto rounded-lg p-4">
            <div className="shimmer h-7 w-1/2 rounded-md" />
            <div className="shimmer mt-2 h-3 w-3/5 rounded-md" />
          </div>
          <div className="shimmer h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LaLoungeProductsPage() {
  const { t, locale } = useI18n()
  const { navigate, href } = useRouter()
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const loadSeqRef = useRef(0)

  const load = useCallback(() => {
    const seq = ++loadSeqRef.current
    withTimeout(fetchProducts({ brand: 'LA_LOUNGE' }))
      .then((res) => {
        if (loadSeqRef.current !== seq) return
        // Array guard: a malformed payload (products missing) degrades to
        // the empty state instead of crashing products.map.
        setProducts(Array.isArray(res.products) ? res.products : [])
        setFailed(false)
      })
      .catch(() => {
        if (loadSeqRef.current !== seq) return
        setFailed(true)
      })
      .finally(() => {
        if (loadSeqRef.current !== seq) return
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRetry = () => {
    setLoading(true)
    setFailed(false)
    setProducts([])
    load()
  }

  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight
  const arrowSlide =
    locale === 'ar' ? 'group-hover/cta:-translate-x-1.5' : 'group-hover/cta:translate-x-1.5'
  const readyPlansPath = '/la-lounge/ready-plans'
  const contactPath = '/la-lounge/contact'
  /** Editorial issue mark (piece count from the API), localized per locale. */
  const issueMark = t('laLoungeProducts.issueMark', {
    count: String(products.length).padStart(2, '0'),
  })

  return (
    <div className="relative flex-1 bg-background text-foreground">
      {/* ============ Editorial header ============ */}
      <header className="relative overflow-hidden px-4 pb-10 pt-28 sm:pb-14 sm:pt-32">
        {/* calm magenta absorption into the plum background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(65% 55% at 50% 0%, rgba(230, 0, 126, 0.15) 0%, transparent 72%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <Reveal direction="none">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-10 bg-primary/60" />
              <span style={eyebrowTypo(locale)} className="text-xs font-bold text-primary">
                {t('laLounge.eyebrow')}
              </span>
            </div>
          </Reveal>

          <Reveal direction="none" delay={0.08}>
            <h1
              className={cn(
                'font-display mt-4 text-4xl leading-tight text-foreground sm:text-6xl md:text-7xl',
                locale === 'en' && 'tracking-wide'
              )}
            >
              <EditorialTitle title={t('laLoungeProducts.title')} />
            </h1>
          </Reveal>

          <Reveal direction="none" delay={0.16}>
            <div className="ll-store-rule mt-6 w-full max-w-xl" aria-hidden="true" />
          </Reveal>

          <Reveal direction="up" delay={0.24}>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t('laLoungeProducts.subtitle')}
              </p>
              {loading ? (
                <span className="shimmer h-3 w-40 rounded-full" aria-hidden="true" />
              ) : (
                !failed &&
                products.length > 0 && (
                  <span
                    dir={locale === 'en' ? 'ltr' : undefined}
                    style={eyebrowTypo(locale)}
                    className="shrink-0 text-[0.62rem] font-bold text-primary/90"
                  >
                    {issueMark}
                  </span>
                )
              )}
            </div>
          </Reveal>
        </div>
      </header>

      {/* ============ Drafting table — collection grid ============ */}
      <section className="px-4 pb-16 sm:pb-20" aria-label={t('laLoungeProducts.indexLabel')}>
        <div className="mx-auto max-w-6xl">
          <div className="ll-store-draft rounded-2xl border border-primary/15 p-4 sm:p-6 lg:p-8">
            {/* mini index header */}
            <Reveal direction="none" className="mb-6 sm:mb-8">
              <div className="flex items-center gap-4">
                <span
                  style={eyebrowTypo(locale)}
                  className="shrink-0 text-[0.62rem] font-bold text-primary/85"
                >
                  {t('laLoungeProducts.indexLabel')}
                </span>
                <span className="ll-store-rule flex-1" aria-hidden="true" />
              </div>
            </Reveal>

            {loading ? (
              <>
                <p className="sr-only">{t('common.loading')}</p>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
                  <SkeletonCard featured />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </>
            ) : failed ? (
              <Reveal className="mx-auto max-w-md">
                <div role="alert" className="ll-store-card rounded-xl px-6 py-12 text-center">
                  <AlertCircle className="mx-auto mb-4 size-10 text-primary" aria-hidden="true" />
                  <p className="mb-6 text-sm text-muted-foreground">{t('common.error')}</p>
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    className="min-h-[44px] rounded-full border-primary/40 px-6 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <RotateCcw className="me-2 size-4" aria-hidden="true" />
                    {t('common.retry')}
                  </Button>
                </div>
              </Reveal>
            ) : products.length === 0 ? (
              <Reveal className="mx-auto max-w-md">
                <div role="status" className="ll-store-card rounded-xl px-6 py-12 text-center">
                  <SearchX className="mx-auto mb-4 size-10 text-muted-foreground" aria-hidden="true" />
                  <p className="font-display mb-2 text-xl text-foreground">{t('products.empty.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('products.empty.subtitle')}</p>
                </div>
              </Reveal>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
                {products.map((product, i) => (
                  <CollectionCard key={product.id} product={product} index={i} featured={i === 0} />
                ))}
                <CollectionNote />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ Closing strip ============ */}
      <section className="px-4 pb-20 sm:pb-28">
        <Reveal className="mx-auto max-w-4xl">
          <div className="ll-store-card relative overflow-hidden rounded-2xl px-6 py-10 text-center sm:px-10 sm:py-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'radial-gradient(70% 85% at 50% 100%, rgba(230, 0, 126, 0.13) 0%, transparent 70%)',
              }}
            />
            <div className="relative">
              <p className="text-[0.62rem] font-bold tracking-[0.4em] text-primary/80">{t('brand.lalounge')}</p>
              <h2 className="font-display mt-3 text-2xl text-foreground sm:text-4xl">{t('laLounge.cta.title')}</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t('laLounge.cta.subtitle')}
              </p>
              <div className="ll-store-rule mx-auto mt-6 w-40" aria-hidden="true" />
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href={href(readyPlansPath)}
                  onClick={(e) => {
                    // Plain left clicks only; let modified/middle clicks
                    // open in a new tab (see the card CTA above).
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    e.preventDefault()
                    navigate(readyPlansPath)
                  }}
                  className="btn-lux group/cta inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-7 text-sm font-bold"
                >
                  {t('laLoungeReadyPlans.ctaButton')}
                  <ArrowIcon
                    className={cn('size-4 transition-transform duration-300', arrowSlide)}
                    aria-hidden="true"
                  />
                </a>
                <a
                  href={href(contactPath)}
                  onClick={(e) => {
                    // Plain left clicks only; let modified/middle clicks
                    // open in a new tab (see the card CTA above).
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    e.preventDefault()
                    navigate(contactPath)
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-primary/45 px-7 text-sm font-bold text-primary transition-colors duration-300 hover:border-primary hover:bg-primary/10"
                >
                  {t('laLounge.contactButton')}
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
