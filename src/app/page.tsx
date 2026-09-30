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
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useCart } from '@/lib/cart-store'

import HomePage from '@/pages/home'
import LutPage from '@/pages/lut'
import LutContactPage from '@/pages/lut-contact'
import LaLoungePage from '@/pages/la-lounge'
import LaLoungeCustomFurniturePage from '@/pages/la-lounge-custom-furniture'
import LaLoungeEventPlanningPage from '@/pages/la-lounge-event-planning'
import LaLoungeReadyPlansPage from '@/pages/la-lounge-ready-plans'
import LaLoungeContactPage from '@/pages/la-lounge-contact'
import BirthdayPage from '@/pages/birthday'
import BirthdayFeaturesPage from '@/pages/birthday-features'
import BirthdayProductsPage from '@/pages/birthday-products'
import BirthdayContactPage from '@/pages/birthday-contact'
import ProductsPage from '@/pages/products'
import ProductDetailPage from '@/pages/product-detail'
import CartPage from '@/pages/cart'
import CheckoutPage from '@/pages/checkout'
import PaymentPage from '@/pages/payment'
import CheckoutSuccessPage from '@/pages/checkout-success'
import AboutPage from '@/pages/about'
import ContactPage from '@/pages/contact'
import LegalPage from '@/pages/legal'
import NotFoundPage from '@/pages/not-found'

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

function AppShell() {
  const { path } = useRouter()

  // Rehydrate the persisted cart AFTER mount (skipHydration: true) so the
  // first client render matches the SSR markup.
  useEffect(() => {
    useCart.persist.rehydrate()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md no-underline"
      >
        تخطّي إلى المحتوى الرئيسي
      </a>

      <BrandThemeSetter />
      <ScrollProgress />
      <Navbar />

      <main id="main-content" className="flex-1 flex flex-col">
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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <I18nProvider>
        <RouterProvider>
          <AppShell />
        </RouterProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
