'use client'

/**
 * Footer v2 — mirrors the original repo's footer.tsx (tagline, quick links,
 * sister brands, contact info, legal links) with the legendary polish layer:
 * flowing gold hairline on the top edge, columns that rise in sequence when
 * the footer enters the viewport, and link-slide/link-shift micro-interactions.
 * Sticky to the bottom via the shell's flex layout.
 */

import { useRouter } from '@/lib/router'
import { useI18n } from '@/lib/i18n'
import { resolveBrandFromPath } from '@/lib/brand'
import { Phone, Mail, MapPin } from 'lucide-react'
import { Reveal } from '@/components/shared/reveal'

export function Footer() {
  const { t, locale } = useI18n()
  const { path, navigate } = useRouter()
  const brand = resolveBrandFromPath(path)
  const year = new Date().getFullYear()

  const brandHomeHref =
    brand === 'lalounge' ? '/la-lounge' : brand === 'birthday' ? '/your-birthday' : '/last-unique-touch'

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand + tagline */}
          <Reveal direction="up">
            <h3 className="font-display text-xl text-gold mb-3 tracking-wide">Last Unique Touch</h3>
            <p className="text-sm text-paper/60 leading-relaxed mb-4">{t('footer.tagline')}</p>
            <p className="text-xs text-paper/40">{t('footer.craftedIn')}</p>
          </Reveal>

          {/* Quick links */}
          <Reveal direction="up" delay={0.08}>
            <nav aria-label={t('footer.quickLinks')}>
              <h4 className="eyebrow text-paper/50 mb-4">{t('footer.quickLinks')}</h4>
              <ul className="space-y-2.5 list-none p-0 m-0">
                {quickLinks.map((link) => (
                  <li key={link.path}>
                    <button
                      onClick={() => navigate(link.path)}
                      className="link-slide link-shift text-sm text-paper/70 hover:text-gold transition-colors duration-300 cursor-pointer bg-transparent border-0 p-0 text-start"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </Reveal>

          {/* Sister brands */}
          <Reveal direction="up" delay={0.16}>
            <nav aria-label={t('footer.sisterBrands')}>
              <h4 className="eyebrow text-paper/50 mb-4">{t('footer.sisterBrands')}</h4>
              <ul className="space-y-2.5 list-none p-0 m-0">
                {sisterBrands.map((brandLink) => (
                  <li key={brandLink.path}>
                    <button
                      onClick={() => navigate(brandLink.path)}
                      className="group flex flex-col cursor-pointer bg-transparent border-0 p-0 text-start"
                    >
                      <span className="link-slide inline-block text-sm text-paper/80 group-hover:text-gold transition-colors duration-300">
                        {brandLink.label}
                      </span>
                      <span className="text-[11px] text-paper/40 group-hover:text-paper/60 transition-colors duration-300">
                        {brandLink.desc}
                      </span>
                    </button>
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
                <li className="group flex items-center gap-3 text-sm text-paper/70">
                  <span className="icon-ring flex items-center justify-center w-8 h-8 rounded-full border border-gold/20 text-gold transition-colors duration-300 group-hover:border-gold/50">
                    <Phone className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                  <span dir="ltr">{t('footer.phone')}</span>
                </li>
                <li className="group flex items-center gap-3 text-sm text-paper/70">
                  <span className="icon-ring flex items-center justify-center w-8 h-8 rounded-full border border-gold/20 text-gold transition-colors duration-300 group-hover:border-gold/50">
                    <Mail className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                  <span>{t('footer.email')}</span>
                </li>
                <li className="group flex items-center gap-3 text-sm text-paper/70">
                  <span className="icon-ring flex items-center justify-center w-8 h-8 rounded-full border border-gold/20 text-gold transition-colors duration-300 group-hover:border-gold/50">
                    <MapPin className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                  <span>{t('footer.address')}</span>
                </li>
              </ul>
            </div>
          </Reveal>
        </div>

        {/* Legal bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-paper/40 order-2 sm:order-1">
            {locale === 'ar'
              ? `© ${year} Last Unique Touch. جميع الحقوق محفوظة.`
              : `© ${year} Last Unique Touch. All rights reserved.`}
          </p>
          <nav className="order-1 sm:order-2 flex items-center gap-5" aria-label={t('footer.legal')}>
            {legalLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="link-slide text-xs text-paper/50 hover:text-gold transition-colors cursor-pointer bg-transparent border-0 p-0"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
