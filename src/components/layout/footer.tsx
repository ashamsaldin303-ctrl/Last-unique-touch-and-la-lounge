'use client'

/**
 * Footer v2 — mirrors the original repo's footer.tsx (tagline, quick links,
 * sister brands, contact info, legal links) with the legendary polish layer:
 * flowing gold hairline on the top edge, columns that rise in sequence when
 * the footer enters the viewport (Reveal stagger, 0.08s), ElasticLink
 * hairlines on the router link columns (draw from the reading edge), a
 * live Kuwait clock with a pulsing availability dot ("we are here, now"),
 * a one-time champagne gloss over the closing rights line (ShimmerText),
 * and link-slide/link-shift micro-interactions on the contact rows.
 * Sticky to the bottom via the shell's flex layout.
 */

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter } from '@/lib/router'
import { useI18n } from '@/lib/i18n'
import { resolveBrandFromPath } from '@/lib/brand'
import { Phone, Mail, MapPin } from 'lucide-react'
import { Reveal } from '@/components/shared/reveal'
import { ElasticLink } from '@/components/fx/elastic-underline'
import { LiveClock } from '@/components/fx/live-clock'
import { PulseDot } from '@/components/fx/pulse-dot'
import { ShimmerText } from '@/components/fx/shimmer-text'

/* SSR-safe layout effect: useEffect on the server, useLayoutEffect on the
   client — flips post-hydration state before the first paint. */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function Footer() {
  const { t, locale } = useI18n()
  const { path: routerPath, navigate } = useRouter()
  const [mounted, setMounted] = useState(false)
  useIsomorphicLayoutEffect(() => {
    setMounted(true)
  }, [])
  // HYDRATION-SAFE PATH (same rationale as the Navbar/page): the hash
  // router parses window.location.hash in its initial state on the client
  // while SSR always renders the '/' shell — brand-derived quick links
  // diverged during hydration on deep links. Render the '/' shell on the
  // first client render, then apply the real hash route before first paint.
  const path = mounted ? routerPath : '/'
  const brand = resolveBrandFromPath(path)
  const year = new Date().getFullYear()

  // Router-aware anchor click (real anchors for middle/modified clicks,
  // plain left clicks through the client hash router).
  const routerClick =
    (target: string) =>
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      navigate(target)
    }

  const brandHomeHref =
    brand === 'neutral'
      ? '/'
      : brand === 'lalounge'
        ? '/la-lounge'
        : brand === 'birthday'
          ? '/your-birthday'
          : '/last-unique-touch'

  const quickLinks: Array<{ path: string; label: string }> = [
    { path: brandHomeHref, label: t('nav.home') },
    { path: '/products', label: t('nav.products') },
    { path: '/about', label: t('nav.about') },
    { path: '/contact', label: t('nav.contact') },
    { path: '/cart', label: t('footer.cart') },
  ]

  const sisterBrands: Array<{ path: string; label: string; desc: string }> = [
    { path: '/last-unique-touch', label: 'Last Unique Touch', desc: t('brandSelector.lut.desc') },
    { path: '/la-lounge', label: 'La Lounge', desc: t('brandSelector.lalounge.desc') },
    { path: '/your-birthday', label: 'Your Birthday', desc: t('brandSelector.birthday.desc') },
  ]

  const legalLinks: Array<{ path: string; label: string }> = [
    { path: '/terms', label: t('footer.terms') },
    { path: '/privacy', label: t('footer.privacy') },
    { path: '/refund', label: t('footer.refund') },
  ]

  return (
    <footer className="relative z-10 mt-auto bg-ink text-paper border-t border-white/[0.06] overflow-hidden">
      {/* Flowing gold hairline along the top edge */}
      <div className="footer-hairline" aria-hidden="true" />

      {/* Editorial watermark wordmark (Task 39 — the cinematic close) */}
      <div
        className="footer-watermark select-none overflow-hidden pt-8 sm:pt-10"
        aria-hidden="true"
      >
        <span className="footer-watermark-dot">✦</span> LAST UNIQUE TOUCH
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand + tagline — heading uses the ink-safe gold token: the
              light-surface LUT gold (#8b6b3d) lands 4.02:1 on the fixed ink
              plate at 20px/400; champagne clears 8:1. (Task 41) */}
          <Reveal direction="up">
            <h3 className="footer-brand-title font-display text-xl text-gold-ink mb-3 tracking-wide">Last Unique Touch</h3>
            <p className="text-sm text-paper/60 leading-relaxed mb-4">{t('footer.tagline')}</p>
            <p className="text-xs text-paper/60">{t('footer.craftedIn')}</p>
          </Reveal>

          {/* Quick links — ElasticLink hairlines that draw from the reading
              edge (leading-[44px] keeps the touch target + vertical rhythm
              the old flex rows had; link-shift keeps the hover nudge). */}
          <Reveal direction="up" delay={0.08}>
            <nav aria-label={t('footer.quickLinks')}>
              <h4 className="eyebrow text-paper/50 mb-4">{t('footer.quickLinks')}</h4>
              <ul className="space-y-2.5 list-none p-0 m-0">
                {quickLinks.map((link) => (
                  <li key={link.path}>
                    <ElasticLink
                      href={`#/${locale}${link.path === '/' ? '' : link.path}`}
                      onClick={routerClick(link.path)}
                      active={path === link.path}
                      className="link-shift min-h-[44px] leading-[44px] text-sm text-paper/70 hover:text-gold transition-colors duration-300 no-underline"
                    >
                      {link.label}
                    </ElasticLink>
                  </li>
                ))}
              </ul>
            </nav>
          </Reveal>

          {/* Sister brands (bespoke two-line rows keep their label-level
              link-slide treatment — the elastic hairline is reserved for
              the single-line link columns). */}
          <Reveal direction="up" delay={0.16}>
            <nav aria-label={t('footer.sisterBrands')}>
              <h4 className="eyebrow text-paper/50 mb-4">{t('footer.sisterBrands')}</h4>
              <ul className="space-y-2.5 list-none p-0 m-0">
                {sisterBrands.map((brandLink) => (
                  <li key={brandLink.path}>
                    <a
                      href={`#/${locale}${brandLink.path}`}
                      onClick={routerClick(brandLink.path)}
                      className="group flex flex-col justify-center min-h-11 py-1 no-underline"
                    >
                      <span className="link-slide inline-block text-sm text-paper/80 group-hover:text-gold transition-colors duration-300">
                        {brandLink.label}
                      </span>
                      <span className="text-[11px] text-paper/60 group-hover:text-paper/80 transition-colors duration-300">
                        {brandLink.desc}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </Reveal>

          {/* Contact */}
          <Reveal direction="up" delay={0.24}>
            <div>
              <h4 className="eyebrow text-paper/50 mb-4">{t('footer.contact')}</h4>
              <ul className="space-y-3 list-none p-0 m-0">
                <li className="group flex min-h-[44px] items-center gap-3 text-sm text-paper/70">
                  <span className="icon-ring flex items-center justify-center w-8 h-8 rounded-full border border-gold/20 text-gold transition-colors duration-300 group-hover:border-gold/50">
                    <Phone className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                  <a
                    href="tel:+96550000000"
                    dir="ltr"
                    className="link-slide flex min-h-[44px] items-center text-sm text-paper/70 hover:text-gold transition-colors duration-300 no-underline"
                  >
                    {t('footer.phone')}
                  </a>
                </li>
                <li className="group flex min-h-[44px] items-center gap-3 text-sm text-paper/70">
                  <span className="icon-ring flex items-center justify-center w-8 h-8 rounded-full border border-gold/20 text-gold transition-colors duration-300 group-hover:border-gold/50">
                    <Mail className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                  <a
                    href="mailto:info@lastuniquetouch.com"
                    className="link-slide flex min-h-[44px] items-center text-sm text-paper/70 hover:text-gold transition-colors duration-300 no-underline"
                  >
                    {t('footer.email')}
                  </a>
                </li>
                <li className="group flex min-h-[44px] items-center gap-3 text-sm text-paper/70">
                  <span className="icon-ring flex items-center justify-center w-8 h-8 rounded-full border border-gold/20 text-gold transition-colors duration-300 group-hover:border-gold/50">
                    <MapPin className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                  <span>{t('footer.address')}</span>
                </li>
                {/* Live maison clock — "we are here, now" (Kuwait time,
                    ticking, with the pulsing availability dot). */}
                <li className="group flex min-h-[44px] items-center gap-3 text-sm text-paper/70">
                  <span className="icon-ring flex items-center justify-center w-8 h-8 rounded-full border border-gold/20 text-gold transition-colors duration-300 group-hover:border-gold/50">
                    <PulseDot size={8} tint="var(--color-gold)" />
                  </span>
                  <LiveClock
                    locale={locale}
                    label={t('brand.kuwait')}
                    className="tracking-wide"
                  />
                </li>
              </ul>
            </div>
          </Reveal>
        </div>

        {/* Legal bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Catalog-driven copyright (footer.rights carries the {year} placeholder in both locales) */}
          <p className="text-xs text-paper/60 order-2 sm:order-1">
            {/* One-time champagne gloss over the closing line (ShimmerText). */}
            <ShimmerText>{t('footer.rights', { year })}</ShimmerText>
          </p>
          <nav className="order-1 sm:order-2 flex items-center gap-5" aria-label={t('footer.legal')}>
            {legalLinks.map((link) => (
              <ElasticLink
                key={link.path}
                href={`#/${locale}${link.path}`}
                onClick={routerClick(link.path)}
                active={path === link.path}
                className="min-h-[44px] leading-[44px] text-xs text-paper/50 hover:text-gold transition-colors no-underline px-0"
              >
                {link.label}
              </ElasticLink>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
