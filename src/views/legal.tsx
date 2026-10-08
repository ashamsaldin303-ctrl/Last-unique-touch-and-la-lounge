'use client'

/**
 * LEGAL — /privacy, /terms, /refund (hash routes #/{locale}/{doc})
 *
 * Rendered by the shell as <LegalPage doc="privacy" /> etc. Picks the
 * doc-specific title/subtitle/lastUpdated from messages, fetches the raw
 * markdown from /api/content?doc={doc}&locale={locale} and renders it inside
 * a gold-accented document card. Loading shimmer, error + retry, back link.
 */

import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { ArrowLeft, ArrowRight, AlertCircle, RotateCw, House } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'
import { Reveal } from '@/components/shared/reveal'
import { PageHeader } from '@/components/shared/page-header'
import { MarkdownCode } from '@/components/shared/markdown-code'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/* ============================================================
   Markdown rendering — same hand-styled overrides as /about
   (no typography plugin available).
   ============================================================ */

const markdownComponents: Components = {
  // The markdown document's leading `# Title` duplicates the PageHeader's
  // visible h1 — drop it instead of rendering a second (sr-only) h1.
  h1: () => null,
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

/** Shimmer skeleton mimicking a legal document while markdown loads. */
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
      <Skeleton className="shimmer h-4 w-full" />
      <Skeleton className="shimmer h-8 w-1/4 mt-8" />
      <Skeleton className="shimmer h-4 w-full" />
      <Skeleton className="shimmer h-4 w-3/4" />
    </div>
  )
}

/* ============================================================
   Doc configuration (typed — no template-literal keys)
   ============================================================ */

type LegalDoc = 'privacy' | 'terms' | 'refund'

const DOC_CONFIG: Record<LegalDoc, { titleKey: string; subtitleKey: string; updatedKey: string }> = {
  privacy: {
    titleKey: 'privacy.title',
    subtitleKey: 'privacy.subtitle',
    updatedKey: 'privacy.lastUpdated',
  },
  terms: {
    titleKey: 'terms.title',
    subtitleKey: 'terms.subtitle',
    updatedKey: 'terms.lastUpdated',
  },
  refund: {
    titleKey: 'refund.title',
    subtitleKey: 'refund.subtitle',
    updatedKey: 'refund.lastUpdated',
  },
}

type ContentState = 'loading' | 'error' | 'done'

export default function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t, locale } = useI18n()
  const { href } = useRouter()
  const cfg = DOC_CONFIG[doc] ?? DOC_CONFIG.privacy

  /* Forward arrow = back-to-home affordance (mirrors reading direction) */
  const BackIcon = locale === 'ar' ? ArrowRight : ArrowLeft

  /* ---- markdown content ---- */
  const [content, setContent] = useState('')
  const [state, setState] = useState<ContentState>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    // AbortSignal.timeout: a hung request (offline/proxy stall) surfaces the
    // error state instead of an eternal shimmer; AbortError lands in catch.
    fetch(`/api/content?doc=${doc}&locale=${locale}`, { signal: AbortSignal.timeout(8000) })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ content: string }>
      })
      .then((data) => {
        if (cancelled) return
        // Shape guard: a non-string body (proxy/error payload) is an error,
        // not an empty document.
        if (typeof data?.content !== 'string') throw new Error('bad content payload')
        setContent(data.content)
        setState('done')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [doc, locale, reloadKey])

  const retryLoad = useCallback(() => {
    setState('loading')
    setReloadKey((k) => k + 1)
  }, [])

  return (
    <div className="bg-background">
      {/* ============ Page header ============ */}
      <PageHeader
        eyebrow={t('brand.lut')}
        title={t(cfg.titleKey)}
        subtitle={t(cfg.subtitleKey)}
        className="pt-14 sm:pt-20"
      />

      {/* ============ Document card ============ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        {/* Last-updated chip */}
        <Reveal className="flex justify-center mb-6">
          <span className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {t(cfg.updatedKey)}
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <article className="glass-card relative rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden">
            {/* Gold top border accent */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />

            {state === 'loading' && <DocumentSkeleton />}

            {state === 'error' && (
              <div className="text-center py-12" role="alert">
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
          </article>
        </Reveal>

        {/* Back to home */}
        <Reveal delay={0.2} className="flex justify-center mt-8">
          <a
            href={href('/')}
            className="inline-flex items-center gap-2 min-h-11 px-5 py-3 rounded-full border border-border bg-card text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors no-underline"
          >
            <BackIcon className="size-4" aria-hidden="true" />
            <House className="size-4" aria-hidden="true" />
            {t('nav.home')}
          </a>
        </Reveal>
      </div>
    </div>
  )
}
