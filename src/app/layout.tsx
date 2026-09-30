import type { Metadata, Viewport } from 'next'
import { Amiri, Tajawal, Cormorant_Garamond, Lalezar, Baloo_2 } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

/* Amiri — elegant Naskh serif for Arabic display (LUT / La Lounge) */
const amiri = Amiri({
  variable: '--font-amiri',
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
})

/* Tajawal — clean modern Arabic/Latin body (all brands) */
const tajawal = Tajawal({
  variable: '--font-tajawal',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  display: 'swap',
})

/* Cormorant Garamond — couture Latin display (LUT / La Lounge) */
const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

/* Lalezar — playful Arabic display (Your Birthday) */
const lalezar = Lalezar({
  variable: '--font-lalezar',
  subsets: ['arabic', 'latin'],
  weight: '400',
  display: 'swap',
})

/* Baloo 2 — rounded playful Latin display (Your Birthday) */
const baloo = Baloo_2({
  variable: '--font-baloo',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Last Unique Touch — اللمسة الأخيرة الفريدة | تأجير أثاث فاخر ومعدات فعاليات',
  description:
    'منصة كويتية فاخرة لتأجير الأثاث ومعدات الفعاليات. ثلاث علامات تجارية — Last Unique Touch وLa Lounge وYour Birthday — لخدمة أرقى المناسبات والفعاليات.',
  keywords: [
    'تأجير أثاث',
    'أثاث فاخر',
    'فعاليات',
    'أعراس',
    'الكويت',
    'furniture rental Kuwait',
    'luxury events',
  ],
  openGraph: {
    title: 'Last Unique Touch — منصة تأجير فاخرة',
    description: 'ثلاث علامات · رحلة واحدة — تأجير أثاث فاخر وتجهيز فعاليات وأعياد ميلاد',
    images: ['/og-default.png'],
    locale: 'ar_KW',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf6ef' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" data-brand="lut" suppressHydrationWarning>
      <body
        className={`${amiri.variable} ${tajawal.variable} ${cormorant.variable} ${lalezar.variable} ${baloo.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}
