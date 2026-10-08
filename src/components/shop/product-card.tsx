'use client'

/**
 * ProductCard v3 — LUT catalog card (reproduces the original repo's
 * landing/product-card.tsx and upgrades it to the CATALOG LAYER):
 * hover image scale + gold veil + quick-view affordance (glass text
 * that rises on hover), glow border, gold-seal 3D badge, frosted
 * out-of-stock veil, refined category chip, price-display hierarchy
 * with entrance pop, image shimmer while loading, gold hairline that
 * draws across the card's bottom edge on hover and a "rent now" CTA
 * whose arrow slides forward on hover (direction-aware).
 */

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Box, Eye } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { localizedName, localizedDescription, formatKwd, type ProductDTO } from '@/lib/products'
import { cn } from '@/lib/utils'

export function ProductCard({
  product,
  className,
}: {
  product: ProductDTO
  className?: string
}) {
  const { t, locale } = useI18n()
  const { href } = useRouter()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgErrored, setImgErrored] = useState(false)
  // A 404 (e.g. pending generated images) must not shimmer forever —
  // once <Image> errors out, fall back to the no-image monogram.
  const firstImage = product.images?.[0]

  const name = localizedName(product, locale)
  const categoryName = product.category ? localizedName(product.category, locale) : ''
  const description = localizedDescription(product, locale)
  const isOutOfStock = product.stock === 0

  // Arrow direction follows reading direction: AR → left, EN → right.
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  return (
    <a
      href={href(`/products/${product.slug}`)}
      className={cn(
        // Explicit outline style+color: outline-2 alone leaves the CSS
        // initial `outline-style: none` (an invisible ring). The global
        // :where(...) focus-visible rule covers this too — kept explicit
        // so the card is self-sufficient.
        'group block h-full rounded-md focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-primary',
        className
      )}
      aria-label={name}
    >
      <article
        className={cn(
          'lux-card glow-border relative flex h-full flex-col overflow-hidden rounded-md border border-border bg-card',
          isOutOfStock && 'opacity-95'
        )}
      >
        {/* Image */}
        <div
          className={cn('img-shimmer relative aspect-square overflow-hidden bg-muted/40')}
          data-loaded={imgLoaded ? 'true' : 'false'}
        >
          {firstImage && !imgErrored ? (
            <Image
              src={firstImage}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgErrored(true)}
              className={cn(
                'object-cover transition-transform duration-700 ease-out group-hover:scale-105',
                isOutOfStock && 'grayscale-[0.4]'
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
              {t('common.noImage')}
            </div>
          )}

          {/* Gold sheen — soft gradient veil on hover */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-primary/30 via-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          {/* Gold sheen — diagonal light sweep: enters from the reading
              edge (Tailwind translate is physical, so the signs flip in RTL
              to sweep right→left like the mirrored CTA arrow). */}
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 ease-out',
              locale === 'ar'
                ? 'translate-x-full group-hover:-translate-x-full'
                : '-translate-x-full group-hover:translate-x-full'
            )}
          />

          {/* Quick-view affordance (rises on hover) */}
          <div className="veil-quick" aria-hidden="true">
            <Eye className="size-4" />
            <span>{t('products.viewDetails')}</span>
          </div>

          {/* 3D viewer badge — gold seal */}
          {product.model3dUrl && (
            <span className="seal-gold absolute top-2 end-2 z-[4] rounded-full px-2.5 py-1 text-[0.625rem] font-semibold">
              <Box className="size-3" aria-hidden="true" />
              {t('products.badge3d')}
            </span>
          )}

          {/* Out of stock — frosted veil with gold-ringed pill */}
          {isOutOfStock && (
            <div className="stock-veil">
              <span>{t('products.outOfStock')}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          {categoryName && (
            <span
              className={cn(
                'inline-flex w-fit items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-gold',
                // Arabic is a joined script — never letter-space it (fix-2 lesson).
                locale === 'en' && 'tracking-wide'
              )}
            >
              <span className="inline-block size-1 rotate-45 bg-gold/70" aria-hidden="true" />
              {categoryName}
            </span>
          )}

          <h3 className="font-display text-lg font-bold leading-snug text-foreground line-clamp-2 transition-colors duration-300 group-hover:text-gold">
            {name}
          </h3>

          <p className="text-xs leading-relaxed text-muted-foreground/90 line-clamp-2">{description}</p>

          {/* Price + CTA — stacked on 2-col mobile grids (price column was
              collapsing to ~12px next to the shrink-0 CTA), row from sm up */}
          <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <p
                className={cn(
                  'price-pop price-display flex items-baseline gap-1.5 text-xl',
                  isOutOfStock ? 'text-muted-foreground' : 'text-primary'
                )}
              >
                <span dir="ltr" className="tabular-nums">
                  {formatKwd(product.rentalPricePerDay)}
                </span>
                <span
                  className={cn(
                    'text-[0.625rem] font-normal text-muted-foreground',
                    // tracking-wide only for Latin; normal also defeats the
                    // 0.01em inherited from .price-display over Arabic.
                    locale === 'en' ? 'tracking-wide' : 'tracking-normal'
                  )}
                >
                  {t('products.perDay')}
                </span>
              </p>
              <p className="text-[0.625rem] leading-tight text-muted-foreground/80">
                {t('product.securityDeposit', {
                  amount: formatKwd(product.securityDeposit),
                })}
              </p>
            </div>

            <span
              className={cn(
                'btn-lux inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-3 min-h-11 py-2 text-xs font-semibold w-full sm:w-auto',
                isOutOfStock && 'pointer-events-none opacity-50'
              )}
            >
              {t('products.rentNow')}
              <ArrowIcon className="cta-arrow size-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>

        {/* Gold hairline — draws across the bottom edge on hover */}
        <span className="card-hairline" aria-hidden="true" />
      </article>
    </a>
  )
}
