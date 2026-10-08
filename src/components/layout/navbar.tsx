'use client'

/**
 * Brand-aware navbar — mirrors the original repo's navbar.tsx, upgraded to v2:
 * - wordmark hidden on home page (umbrella landing for 3 brands)
 * - nav links resolve per current brand (home/products/contact)
 * - locale switcher (ar/en), theme toggle, cart badge
 * - mobile drawer with focus trap + staggered link animations
 * - SMART HIDE: hides on scroll-down, returns on scroll-up (never at top,
 *   never while the drawer is open)
 * - ACTIVE PILL: a gold indicator that slides between links (layoutId)
 * - WORDMARK SHINE: gold light sweep on hover
 */

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter, useLocaleSwitch } from '@/lib/router'
import { useI18n } from '@/lib/i18n'
import { resolveBrandFromPath, isHomePage } from '@/lib/brand'
import { useCart, cartTotals } from '@/lib/cart-store'
import { useTheme } from 'next-themes'
import { Menu, X, Globe, Moon, Sun, ShoppingCart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

/** Brand wordmark shown in navbar per brand. */
function useWordmark(brand: 'neutral' | 'lut' | 'lalounge' | 'birthday') {
  const { t } = useI18n()
  if (brand === 'neutral') return { main: t('maison.house'), subtitle: t('brand.kuwait') }
  if (brand === 'lalounge') return { main: t('brand.lalounge'), subtitle: null as string | null }
  if (brand === 'birthday') return { main: t('brand.birthday'), subtitle: t('brand.kuwait') }
  return { main: t('brand.lutShort'), subtitle: t('brand.lut') }
}

/* SSR-safe layout effect: useEffect on the server, useLayoutEffect on the
   client — flips post-hydration state before the first paint (no flash of
   the SSR shell, no useLayoutEffect SSR warning). */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function Navbar() {
  const { t, locale } = useI18n()
  const { path: routerPath, navigate } = useRouter()
  const switchLocale = useLocaleSwitch()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  // HYDRATION-SAFE PATH: the hash router's initial state reads
  // window.location.hash on the client while SSR always renders the '/'
  // shell — path-derived markup (wordmark button, brand links, hero text
  // colors) diverged during hydration and React logged a mismatch (server
  // `<div hidden md:flex>` vs client `<button aria-label="LUT">`). Gate the
  // path behind `mounted` so the first client render matches the server
  // tree exactly; the real hash route applies right after mount.
  const path = mounted ? routerPath : '/'

  // Dark hero pages need light text in navbar (home + dark brand landings).
  // The La Lounge landing renders the light 3D blueprint scene over white
  // "blueprint paper" — it needs dark navbar text instead.
  const darkHero =
    isHomePage(path) ||
    path === '/last-unique-touch' ||
    path === '/your-birthday'

  const brand = resolveBrandFromPath(path)
  const homePage = isHomePage(path)
  const items = useCart((s) => s.items)
  const { count: cartCount } = cartTotals(items)
  const wordmark = useWordmark(brand)

  useIsomorphicLayoutEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll while the mobile drawer is open; restore on
  // close/unmount (returns the previous inline value, not a blank slate).
  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  useEffect(() => {
    let ticking = false
    let lastY = window.scrollY
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        setScrolled(y > 40)
        // Smart hide: only after passing 140px, with a small delta guard
        // so tiny scroll jitter (mobile url-bar) doesn't flap the navbar.
        const delta = y - lastY
        if (Math.abs(delta) > 6) {
          setNavHidden(delta > 0 && y > 140 && !mobileOpen)
          lastY = y
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [mobileOpen])

  // Focus trap + Escape for the mobile drawer
  useEffect(() => {
    if (!mobileOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const rafId = requestAnimationFrame(() => firstLinkRef.current?.focus())

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMobileOpen(false)
        return
      }
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      cancelAnimationFrame(rafId)
      previouslyFocused?.focus?.()
    }
  }, [mobileOpen])

  // Close mobile drawer on navigation
  useEffect(() => {
    const onNavigate = () => setMobileOpen(false)
    window.addEventListener('lut:navigate', onNavigate)
    return () => window.removeEventListener('lut:navigate', onNavigate)
  }, [])

  // Brand-aware link targets (mirrors original navbar.tsx). Each brand site
  // now owns its styled storefront; the neutral house links to the unified
  // catalog. Task 25/28.
  const brandHomeHref =
    brand === 'lalounge'
      ? '/la-lounge'
      : brand === 'birthday'
        ? '/your-birthday'
        : brand === 'neutral'
          ? '/'
          : '/last-unique-touch'
  const brandContactHref =
    brand === 'lalounge'
      ? '/la-lounge/contact'
      : brand === 'birthday'
        ? '/your-birthday/contact'
        : brand === 'neutral'
          ? '/contact'
          : '/last-unique-touch/contact'
  const brandProductsHref =
    brand === 'lalounge'
      ? '/la-lounge/products'
      : brand === 'birthday'
        ? '/your-birthday/products'
        : '/products'
  // Cart is brand-agnostic today; kept as a mutable-width string so the
  // drawer's `=== '/'` guard stays meaningful for future brand-specific carts.
  const brandCartHref: string = '/cart'

  const navLinks: Array<{ path: string; label: string }> = [
    { path: brandHomeHref, label: t('nav.home') },
    { path: brandProductsHref, label: t('nav.products') },
    { path: '/about', label: t('nav.about') },
    { path: brandContactHref, label: t('nav.contact') },
  ]

  /* Active detection: exact match wins; otherwise a link is active when the
     current path is nested under it (e.g. /products/[slug] → "Products").
     The root ("/") link never matches by prefix — it is exact-only. If some
     other link matches exactly, prefix-matches are suppressed so only the
     most specific link lights up (e.g. on /la-lounge/contact only Contact). */
  const isLinkActive = (linkPath: string) => {
    if (path === linkPath) return true
    const exactElsewhere = navLinks.some((l) => l.path === path)
    if (exactElsewhere) return false
    if (linkPath === '/') return false
    return path.startsWith(linkPath + '/')
  }

  const linkTextCls = (active: boolean) =>
    cn(
      'relative text-sm font-medium transition-colors duration-300 group',
      // letter-spacing breaks Arabic letter joining — apply to Latin only.
      locale !== 'ar' && 'tracking-wide',
      active
        ? 'text-gold'
        : darkHero || scrolled
          ? 'text-paper/70 hover:text-paper'
          : 'text-foreground/70 hover:text-foreground'
    )

  return (
    <>
      <nav
        aria-label={t('nav.primary')}
        className={cn(
          'navbar-slide-in nav-smart fixed top-0 inset-x-0 z-50',
          scrolled ? 'glass-dark py-3' : 'bg-transparent py-5',
          navHidden && 'nav-hidden'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* LEFT: wordmark + desktop nav */}
            <div className="flex items-center gap-8 lg:gap-10 min-w-0">
              {!homePage && (
                <a
                  href={`#/${locale}${brandHomeHref === '/' ? '' : brandHomeHref}`}
                  onClick={(e) => {
                    // Real anchor (middle/ctrl+click opens the hash URL);
                    // plain left clicks go through the client router.
                    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                    e.preventDefault()
                    navigate(brandHomeHref)
                  }}
                  className="shine-sweep group flex items-baseline gap-2 min-w-0 shrink-0 no-underline"
                  aria-label={wordmark.main}
                >
                  <span className="font-display tracking-tight whitespace-nowrap transition-colors duration-300 text-primary text-lg sm:text-xl lg:text-2xl">
                    {wordmark.main}
                  </span>
                  {wordmark.subtitle && (
                    <span
                      className={cn(
                        'hidden sm:inline text-[10px] lg:text-xs tracking-[0.2em] uppercase transition-colors duration-300',
                        darkHero || scrolled ? 'text-paper/60' : 'text-foreground/60'
                      )}
                    >
                      {wordmark.subtitle}
                    </span>
                  )}
                </a>
              )}

              <div className="hidden md:flex items-center gap-10">
                {navLinks.map((link) => {
                  const active = isLinkActive(link.path)
                  return (
                    <a
                      key={link.path}
                      href={`#/${locale}${link.path === '/' ? '' : link.path}`}
                      onClick={(e) => {
                        // Real anchor (middle/ctrl+click opens the hash URL);
                        // plain left clicks go through the client router.
                        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                        e.preventDefault()
                        navigate(link.path)
                      }}
                      aria-current={active ? 'page' : undefined}
                      className={linkTextCls(active)}
                    >
                      {link.label}
                      {active ? (
                        <motion.span
                          layoutId="nav-active-underline"
                          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                          className="absolute -bottom-1.5 start-0 w-full h-[2px] rounded-full bg-gold shadow-[0_2px_10px_rgba(201,162,75,0.65)]"
                        />
                      ) : (
                        <span
                          className={cn(
                            'absolute -bottom-1.5 start-0 h-px bg-gold/60 transition-[width] duration-300',
                            'w-0 group-hover:w-full'
                          )}
                        />
                      )}
                    </a>
                  )
                })}
              </div>
            </div>

            {/* RIGHT: theme toggle + locale + cart + hamburger */}
            <div className="flex items-center gap-2 shrink-0">
              {mounted ? (
                <button
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  aria-label={t('nav.toggleTheme')}
                  className={cn(
                    'flex items-center justify-center w-11 h-11 rounded-full transition-colors cursor-pointer bg-transparent border-0',
                    darkHero || scrolled
                      ? 'text-paper/70 hover:text-gold hover:bg-paper/10'
                      : 'text-foreground/70 hover:text-gold hover:bg-foreground/10'
                  )}
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="size-4" strokeWidth={1.5} />
                  ) : (
                    <Moon className="size-4" strokeWidth={1.5} />
                  )}
                </button>
              ) : (
                <div className="size-11" aria-hidden="true" />
              )}

              <motion.button
                onClick={switchLocale}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-medium transition-colors cursor-pointer bg-transparent border-0',
                  darkHero || scrolled ? 'text-paper/70 hover:text-gold' : 'text-foreground/70 hover:text-gold'
                )}
                aria-label={t('a11y.switchLanguage')}
              >
                <Globe className="w-4 h-4" strokeWidth={1.3} />
                <span>{locale === 'ar' ? 'EN' : 'عربي'}</span>
              </motion.button>

              <button
                onClick={() => navigate(brandCartHref)}
                className={cn(
                  'relative flex items-center justify-center w-11 h-11 rounded-full transition-colors cursor-pointer bg-transparent border-0',
                  darkHero || scrolled
                    ? 'text-paper/70 hover:text-gold hover:bg-paper/10'
                    : 'text-foreground/70 hover:text-gold hover:bg-foreground/10'
                )}
                aria-label={t('cart.title')}
              >
                <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-0.5 rounded-full bg-gold text-ink text-[10px] font-bold flex items-center justify-center"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </button>

              <button
                ref={hamburgerRef}
                className={cn(
                  'md:hidden p-2 min-w-[44px] min-h-[44px] cursor-pointer bg-transparent border-0',
                  darkHero || scrolled ? 'text-paper' : 'text-foreground'
                )}
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={t('nav.menu')}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav-drawer"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/80 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.menu')}
              id="mobile-nav-drawer"
              initial={{ x: locale === 'ar' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: locale === 'ar' ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 end-0 bottom-0 z-50 w-80 max-w-[85vw] bg-ink md:hidden flex flex-col overscroll-contain"
            >
              <div className="p-6 border-b border-paper/10 flex items-center justify-between">
                {!homePage && (
                  <span className="font-display text-primary text-lg">{wordmark.main}</span>
                )}
                {homePage && <span />}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-paper/60 hover:text-paper min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer bg-transparent border-0"
                  aria-label={t('common.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 p-6 space-y-2 overflow-y-auto max-h-96 overscroll-contain">
                {navLinks.map((link, idx) => (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: locale === 'ar' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <a
                      ref={idx === 0 ? firstLinkRef : undefined}
                      href={`#/${locale}${link.path === '/' ? '' : link.path}`}
                      onClick={(e) => {
                        // Real anchor (middle/ctrl+click opens the hash URL);
                        // plain left clicks go through the client router.
                        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                        e.preventDefault()
                        navigate(link.path)
                        setMobileOpen(false)
                      }}
                      aria-current={isLinkActive(link.path) ? 'page' : undefined}
                      className={cn(
                        'block py-3 text-lg font-display no-underline',
                        isLinkActive(link.path) ? 'text-gold' : 'text-paper/70'
                      )}
                    >
                      {link.label}
                    </a>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: locale === 'ar' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: navLinks.length * 0.08 }}
                >
                  <a
                    href={`#/${locale}${brandCartHref === '/' ? '' : brandCartHref}`}
                    onClick={(e) => {
                      // Real anchor (middle/ctrl+click opens the hash URL);
                      // plain left clicks go through the client router.
                      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                      e.preventDefault()
                      navigate(brandCartHref)
                      setMobileOpen(false)
                    }}
                    className="flex items-center gap-3 py-3 text-lg font-display text-paper/70 no-underline"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {t('cart.title')}
                    {cartCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-gold text-ink text-xs font-bold flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </a>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
