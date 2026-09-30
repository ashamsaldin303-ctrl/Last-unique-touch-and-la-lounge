'use client'

/**
 * ABOUT — /about (hash route #/{locale}/about)
 *
 * Structure: PageHeader → dark cinematic hero band (orbs + gold particles +
 * brand statement + floating gold-framed image) → values (4 glass lux cards) →
 * markdown story document card (from /api/content?doc=about) → dark stats band
 * with animated count-up → CTA to /products.
 *
 * All copy via t() from messages/{ar,en}.json. RTL-aware (logical props).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { Award, Scale, Zap, Crown, ArrowLeft, ArrowRight, AlertCircle, RotateCw } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { Reveal } from '@/components/shared/reveal'
import { PageHeader } from '@/components/shared/page-header'
import { MarkdownCode } from '@/components/shared/markdown-code'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Particles } from '@/components/shared/particles'


/* ============================================================
   Animated count-up number (starts when scrolled into view)
   ============================================================ */

function CountUp({ target, prefix = '' }: { target: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      // async flip via rAF — no sync setState, no hydration mismatch
      const raf = requestAnimationFrame(() => setDisplay(target))
      return () => cancelAnimationFrame(raf)
    }

    const DURATION = 1600
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true
            const start = performance.now()
            const tick = (now: number) => {
              const progress = Math.min(1, (now - start) / DURATION)
              const eased = 1 - Math.pow(1 - progress, 3)
              setDisplay(Math.round(eased * target))
              if (progress < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref} dir="ltr">
      {prefix}
      {display}
    </span>
  )
}

/* ============================================================
   Markdown rendering (no typography plugin — styled by hand)
   ============================================================ */

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="sr-only">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="font-display text-2xl sm:text-3xl text-primary mt-8 mb-3">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-sm sm:text-base leading-8 text-foreground/80 mb-4">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ps-6 space-y-1 mb-4">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ps-6 space-y-1 mb-4">{children}</ol>,
  li: ({ children }) => <li className="text-sm sm:text-base leading-7 text-foreground/80">{children}</li>,
  strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} className="text-primary underline underline-offset-4 hover:opacity-80 transition-opacity">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-lg border border-border my-6">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-4 py-2.5 text-start font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-border/60 px-4 py-2.5 text-start text-foreground/80">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="border-s-4 border-primary ps-4 py-1 my-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <div className="gold-divider my-8" />,
  code: ({ children }) => <MarkdownCode>{children}</MarkdownCode>,
}

/** Shimmer skeleton mimicking a document layout while markdown loads. */
function DocumentSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="loading">
      <Skeleton className="shimmer h-8 w-2/5" />
      <Skeleton className="shimmer h-4 w-full" />
      <Skeleton className="shimmer h-4 w-11/12" />
      <Skeleton className="shimmer h-4 w-4/5" />
      <Skeleton className="shimmer h-6 w-1/3 mt-8" />
      <Skeleton className="shimmer h-4 w-full" />
      <Skeleton className="shimmer h-4 w-10/12" />
      <Skeleton className="shimmer h-8 w-1/4 mt-8" />
      <Skeleton className="shimmer h-4 w-full" />
      <Skeleton className="shimmer h-4 w-3/4" />
    </div>
  )
}

/** Gold top accent used on document cards. */
function GoldTopAccent() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent"
    />
  )
}

/* ============================================================
   Page
   ============================================================ */

type ContentState = 'loading' | 'error' | 'done'

export default function AboutPage() {
  const { t, locale } = useI18n()
  const { href } = useRouter()
  const ArrowIcon = locale === 'ar' ? ArrowLeft : ArrowRight

  /* ---- markdown content (about story) ---- */
  const [content, setContent] = useState('')
  const [state, setState] = useState<ContentState>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/content?doc=about&locale=${locale}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ content: string }>
      })
      .then((data) => {
        if (cancelled) return
        setContent(data.content)
        setState('done')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [locale, reloadKey])

  const retryLoad = useCallback(() => {
    setState('loading')
    setReloadKey((k) => k + 1)
  }, [])

  /* ---- values ---- */
  const values = [
    { icon: Award, title: t('about.values.quality.title'), desc: t('about.values.quality.desc') },
    { icon: Scale, title: t('about.values.transparency.title'), desc: t('about.values.transparency.desc') },
    { icon: Zap, title: t('about.values.speed.title'), desc: t('about.values.speed.desc') },
    { icon: Crown, title: t('about.values.luxury.title'), desc: t('about.values.luxury.desc') },
  ]

  /* ---- stats: parse "+500 منتج فاخر" → prefix/target/label ---- */
  const stats = ['products', 'clients', 'events', 'years'].map((key) => {
    const label = t(`about.stats.${key}`)
    const match = label.match(/^([+]?)(\d+)\s*(.*)$/)
    if (match) {
      return { prefix: match[1], target: parseInt(match[2], 10), label: match[3], full: label }
    }
    return { prefix: '', target: 0, label: '', full: label }
  })

  return (
    <div className="bg-background">
      {/* ============ Page header ============ */}
      <PageHeader eyebrow={t('brand.lut')} title={t('about.title')} subtitle={t('about.subtitle')} className="pt-14 sm:pt-20" />

      {/* ============ Dark hero band — brand statement + framed image ============ */}
      <section className="hero-bg-gradient relative overflow-hidden" aria-label={t('about.title')}>
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />
        <div className="hero-orb hero-orb-3" aria-hidden="true" />
        <Particles />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Text side */}
          <div className="text-center lg:text-start">
            <div className="animate-hero-down flex items-center justify-center lg:justify-start gap-3 mb-5">
              <span className="h-px w-8 bg-primary/60" aria-hidden="true" />
              <span className="eyebrow text-gold/90">{t('brand.kuwait')}</span>
              <span className="h-px w-8 bg-primary/60 lg:hidden" aria-hidden="true" />
            </div>
            <h2 className="animate-hero-up font-display text-4xl sm:text-6xl lg:text-7xl leading-tight tracking-wide text-gold pb-2">
              {t('brand.lut')}
            </h2>
            <div className="gold-divider w-48 mx-auto lg:mx-0 mt-6 animate-hero-in" aria-hidden="true" />
          </div>

          {/* Image side — gold-framed floating card */}
          <Reveal className="relative max-w-xl w-full mx-auto" delay={0.15}>
            <div
              aria-hidden="true"
              className="absolute -inset-8 rounded-full bg-[radial-gradient(closest-side,rgba(139,107,61,0.28),transparent)] blur-2xl"
            />
            <div className="relative animate-float-soft rounded-[1.75rem] border border-primary/45 bg-card/10 p-2.5 sm:p-3 backdrop-blur-sm shadow-2xl">
              <div className="relative aspect-[5/4] rounded-[1.35rem] overflow-hidden">
                <Image
                  src="/products/lut_heritage.webp"
                  alt={`${t('brand.lut')} — ${t('brand.kuwait')}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent"
                />
              </div>
              {/* gold corner diamonds echoing the gold-divider ornament */}
              <span aria-hidden="true" className="absolute -top-1.5 -start-1.5 size-3 rotate-45 bg-primary shadow-[0_0_10px_rgba(139,107,61,0.7)]" />
              <span aria-hidden="true" className="absolute -bottom-1.5 -end-1.5 size-3 rotate-45 bg-primary shadow-[0_0_10px_rgba(139,107,61,0.7)]" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ Values — 4 glass lux cards ============ */}
      <section className="py-16 sm:py-24" aria-labelledby="about-values-title">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10 sm:mb-14">
            <span className="eyebrow text-primary/80">{t('brand.lutShort')}</span>
            <h2 id="about-values-title" className="font-display text-3xl sm:text-4xl text-foreground mt-3 mb-2">
              {t('about.values.title')}
            </h2>
            <div className="gold-divider w-40 mx-auto mt-5" aria-hidden="true" />
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {values.map((value, idx) => {
              const Icon = value.icon
              return (
                <Reveal key={value.title} delay={idx * 0.1}>
                  <article className="glass-card lux-card rounded-2xl p-6 h-full">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]">
                      <Icon className="size-6 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1.5">{value.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{value.desc}</p>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============ Markdown story — document card ============ */}
      <section className="pb-16 sm:pb-24" aria-label={t('about.title')}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="glass-card relative rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl overflow-hidden">
              <GoldTopAccent />
              {state === 'loading' && <DocumentSkeleton />}
              {state === 'error' && (
                <div className="text-center py-10" role="alert">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <AlertCircle className="size-7 text-primary" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">{t('common.error')}</p>
                  <Button
                    variant="outline"
                    onClick={retryLoad}
                    className="h-11 px-6 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <RotateCw className="size-4 me-2" aria-hidden="true" />
                    {t('common.retry')}
                  </Button>
                </div>
              )}
              {state === 'done' && (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {content}
                </ReactMarkdown>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ Stats band — dark + count-up ============ */}
      <section className="relative overflow-hidden bg-ink py-16 sm:py-24" aria-labelledby="about-stats-title">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,rgba(139,107,61,0.22),transparent_65%)]"
        />
        <Particles count={14} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10 sm:mb-14">
            <h2 id="about-stats-title" className="font-display text-3xl sm:text-4xl text-white/95 tracking-wide">
              {t('about.stats.title')}
            </h2>
            <div className="gold-divider w-40 mx-auto mt-5" aria-hidden="true" />
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, idx) => (
              <Reveal key={stat.full} delay={idx * 0.1}>
                <div className="lux-card rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 text-center h-full">
                  {stat.target > 0 ? (
                    <>
                      <p className="font-display text-4xl sm:text-5xl font-bold text-gold leading-tight pb-1 tabular-nums">
                        <CountUp target={stat.target} prefix={stat.prefix} />
                      </p>
                      <p className="text-sm text-white/55 mt-2">{stat.label}</p>
                    </>
                  ) : (
                    <p className="font-display text-2xl text-gold leading-snug">{stat.full}</p>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA — to products ============ */}
      <section className="relative py-16 sm:py-24 bg-gradient-to-b from-background to-secondary/70" aria-labelledby="about-cta-title">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <span className="eyebrow text-primary/80">{t('cta.eyebrow')}</span>
            <h2 id="about-cta-title" className="font-display text-3xl sm:text-4xl md:text-5xl text-foreground mt-3 mb-6 leading-tight">
              {t('about.cta.title')}
            </h2>
            <div className="gold-divider w-40 mx-auto mb-9" aria-hidden="true" />
            <Button
              asChild
              className="btn-lux h-12 px-8 sm:px-10 text-base rounded-full font-semibold"
            >
              <a href={href('/products')}>
                {t('about.cta.button')}
                <ArrowIcon className="size-4 ms-1.5" aria-hidden="true" />
              </a>
            </Button>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
