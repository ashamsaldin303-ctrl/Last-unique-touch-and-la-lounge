'use client'

/**
 * MarkdownCode — inline `code` renderer for the markdown-driven pages
 * (about / legal). Site paths like `/contact` or `/refund` that appear in the
 * docs as code spans are rendered as real internal links (locale-aware,
 * LTR-isolated so the bidi run never scrambles the slashes). Everything else
 * renders as the regular monospace chip.
 */

import type { ReactNode } from 'react'
import { useI18n } from '@/lib/i18n'
import { useRouter } from '@/lib/router'

const SITE_PATH_RE = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/i

export function MarkdownCode({ children }: { children?: ReactNode }) {
  const { locale } = useI18n()
  const { href } = useRouter()

  const text = typeof children === 'string' ? children : undefined

  if (text && SITE_PATH_RE.test(text.trim())) {
    const target = text.trim()
    return (
      <a
        href={href(target)}
        dir="ltr"
        className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-sm text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:bg-primary/10 hover:text-primary"
      >
        {target}
      </a>
    )
  }

  return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">{children}</code>
}
