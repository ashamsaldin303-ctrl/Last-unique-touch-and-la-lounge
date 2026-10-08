'use client'

/**
 * THE APP — single Next.js route hosting the original site's multi-page
 * structure via the hash router. Shell = navbar + page + footer + whatsapp.
 */

import { I18nProvider } from '@/lib/i18n'
import { RouterProvider, useRouter } from '@/lib/router'
import { ThemeProvider } from 'next-themes'
import { BrandThemeSetter } from '@/components/providers/brand-theme-setter'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { FloatingWhatsApp } from '@/components/layout/floating-whatsapp'
import { ScrollProgress, BackToTop } from '@/components/shared/upgrade'
import { CursorGlow } from '@/components/shared/cursor-glow'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { useCart } from '@/lib/cart-store'

import HomePage from '@/views/home'
import LutPage from '@/views/lut'
import LutContactPage from '@/views/lut-contact'
import LaLoungePage from '@/views/la-lounge'
import LaLoungeProductsPage from '@/views/la-lounge-products'
import LaLoungeCustomFurniturePage from '@/views/la-lounge-custom-furniture'
import LaLoungeEventPlanningPage from '@/views/la-lounge-event-planning'
import LaLoungeReadyPlansPage from '@/views/la-lounge-ready-plans'
import LaLoungeContactPage from '@/views/la-lounge-contact'
import BirthdayPage from '@/views/birthday'
import BirthdayFeaturesPage from '@/views/birthday-features'
import BirthdayProductsPage from '@/views/birthday-products'
import BirthdayContactPage from '@/views/birthday-contact'
import ProductsPage from '@/views/products'
import ProductDetailPage from '@/views/product-detail'
import CartPage from '@/views/cart'
import CheckoutPage from '@/views/checkout'
import PaymentPage from '@/views/payment'
import CheckoutSuccessPage from '@/views/checkout-success'
import AdminPage from '@/views/admin'
import AboutPage from '@/views/about'
import ContactPage from '@/views/contact'
import LegalPage from '@/views/legal'
import NotFoundPage from '@/views/not-found'

/** Route table — path → page component (mirrors src/app/[locale]/ of the repo). */
function PageForPath({ path, slug }: { path: string; slug?: string }) {
  switch (path) {
    case '/':
      return <HomePage />
    case '/last-unique-touch':
      return <LutPage />
    case '/last-unique-touch/contact':
      return <LutContactPage />
    case '/la-lounge':
      return <LaLoungePage />
    case '/la-lounge/products':
      return <LaLoungeProductsPage />
    case '/la-lounge/custom-furniture':
      return <LaLoungeCustomFurniturePage />
    case '/la-lounge/event-planning':
      return <LaLoungeEventPlanningPage />
    case '/la-lounge/ready-plans':
      return <LaLoungeReadyPlansPage />
    case '/la-lounge/contact':
      return <LaLoungeContactPage />
    case '/your-birthday':
      return <BirthdayPage />
    case '/your-birthday/features':
      return <BirthdayFeaturesPage />
    case '/your-birthday/products':
      return <BirthdayProductsPage />
    case '/your-birthday/contact':
      return <BirthdayContactPage />
    case '/products':
      return <ProductsPage />
    case '/cart':
      return <CartPage />
    case '/checkout':
      return <CheckoutPage />
    case '/checkout/payment':
      return <PaymentPage />
    case '/checkout/success':
      return <CheckoutSuccessPage />
    case '/admin':
      return <AdminPage />
    case '/about':
      return <AboutPage />
    case '/contact':
      return <ContactPage />
    case '/privacy':
      return <LegalPage doc="privacy" />
    case '/terms':
      return <LegalPage doc="terms" />
    case '/refund':
      return <LegalPage doc="refund" />
    default: {
      if (path.startsWith('/products/')) {
        return <ProductDetailPage slug={decodeURIComponent(path.replace('/products/', ''))} />
      }
      return <NotFoundPage />
    }
  }
}

/* SSR-safe layout effect: useEffect on the server, useLayoutEffect on the
   client — flips post-hydration state synchronously BEFORE the first paint
   (no flash of the SSR shell, no useLayoutEffect SSR warning). */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

function AppShell() {
  const { path: routerPath } = useRouter()
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)

  /* Visually-hidden live region — its textContent is set imperatively on
     navigation (never through React state) so it announces exactly once per
     route swap, after the new view is mounted. */
  const liveRegionRef = useRef<HTMLDivElement | null>(null)
  /* Latest route path (synced post-commit) — lets the lut:navigate listener
     distinguish a real route change from a same-path emit (locale switch,
     re-click on the current link) so focus is never stolen needlessly. */
  const pathRef = useRef<string>('/')
  useEffect(() => {
    pathRef.current = routerPath
  }, [routerPath])

  // SPA navigation a11y (WCAG 2.4.3 / 4.1.3): on a route CHANGE, move focus
  // to the main landmark without scrolling and announce the new page via
  // the live region above. With AnimatePresence mode="wait" the trigger
  // element unmounts with the exiting page (focus would fall to <body> and
  // screen readers would hear nothing) — this restores a usable focus
  // position and a spoken page-change cue, like a full page load would.
  useEffect(() => {
    let timer: number | null = null
    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ path: string }>).detail
      if (!detail || detail.path === pathRef.current) return
      pathRef.current = detail.path
      if (timer !== null) window.clearTimeout(timer)
      // Wait out the 0.45s exit transition (mode="wait") plus slack so the
      // outgoing view is unmounted and the new one — including its h1 — is
      // committed (a bare 460ms tick can still catch the exiting page's h1).
      timer = window.setTimeout(() => {
        timer = null
        const main = document.getElementById('main-content')
        if (!main) return
        // Never steal focus from a field the user is typing in (the delay
        // between the click and the swap makes this a real possibility).
        const active = document.activeElement as HTMLElement | null
        const typing =
          !!active &&
          (active.isContentEditable ||
            active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.tagName === 'SELECT')
        if (!typing) main.focus({ preventScroll: true })
        // Announce the new page by its heading (every view renders exactly
        // one h1 — MaskedTitle h1s carry the accessible copy in their
        // sr-only span); fall back to the document title. Two rAFs put the
        // read safely past the swap commit.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const heading = main.querySelector('h1')
            const label = (
              heading?.querySelector('.sr-only')?.textContent ?? heading?.textContent ?? ''
            )
              .replace(/\s+/g, ' ')
              .trim()
            if (liveRegionRef.current) {
              liveRegionRef.current.textContent = label || document.title
            }
          })
        })
      }, 550)
    }
    window.addEventListener('lut:navigate', onNavigate)
    return () => {
      window.removeEventListener('lut:navigate', onNavigate)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    setMounted(true)
  }, [])

  // HYDRATION-SAFE PATH (same rationale as the Navbar): the hash router
  // parses window.location.hash in its initial state on the client while SSR
  // always renders the '/' shell, so a deep link (e.g. #/ar/products) would
  // render a different page tree during hydration (mismatch → React discards
  // the server DOM). Render the '/' shell on the first client render to
  // match SSR exactly, then apply the real hash route before first paint.
  const path = mounted ? routerPath : '/'

  // Rehydrate the persisted cart AFTER mount (skipHydration: true) so the
  // first client render matches the SSR markup.
  useEffect(() => {
    useCart.persist.rehydrate()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <a
        href="#main-content"
        onClick={(e) => {
          // Never let the fragment reach the hash router (a #main-content
          // hash would parse as a path and 404 + reset the locale) — focus
          // the main landmark directly instead. Keyboard activation (Enter)
          // also fires click, so this covers both input paths.
          e.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md no-underline"
      >
        {t('a11y.skipToContent')}
      </a>

      {/* Route-change announcements for screen readers (see the
          lut:navigate effect above) — visually hidden, polite. */}
      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />

      <BrandThemeSetter />
      <ScrollProgress />
      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col outline-none">
        <AnimatePresence mode="wait">
          {/* NOTE: no `filter` in this transition — a lingering blur(0px)
              creates a containing block that breaks `position: fixed` for
              the full-screen 3D brand backgrounds (they would scroll away
              with the page instead of staying pinned to the viewport). */}
          <motion.div
            key={path}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col"
          >
            <PageForPath path={path} />
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <FloatingWhatsApp />
      <BackToTop />
      <CursorGlow />
    </div>
  )
}

export default function Page() {
  return (
    // reducedMotion="user": honors prefers-reduced-motion globally — framer-motion
    // disables transform/layout animations for those users (opacity still animates).
    <MotionConfig reducedMotion="user">
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <I18nProvider>
          <RouterProvider>
            <AppShell />
          </RouterProvider>
        </I18nProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}

/* rebuild-marker: views-move-r1 */
