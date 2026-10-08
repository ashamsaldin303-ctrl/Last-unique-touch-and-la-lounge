import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

/**
 * GET /api/content?doc=about|privacy|terms|refund&locale=ar|en
 *
 * Serves the raw markdown content files from /content/{locale}/{doc}.md.
 * Mirrors the original repo's src/lib/content.ts (fs read + in-memory
 * cache keyed by locale/doc) — returns `{ content: string }`.
 */

export const dynamic = 'force-dynamic'

const VALID_DOCS = ['about', 'privacy', 'terms', 'refund'] as const
const VALID_LOCALES = ['ar', 'en'] as const

type Doc = (typeof VALID_DOCS)[number]
type Locale = (typeof VALID_LOCALES)[number]

/** In-memory cache — markdown rarely changes; survives for the process lifetime. */
const cache = new Map<string, string>() // cache-reset-36

export async function GET(req: NextRequest) {
  try {
    const doc = req.nextUrl.searchParams.get('doc')
    const locale = req.nextUrl.searchParams.get('locale')

    if (!doc || !VALID_DOCS.includes(doc as Doc)) {
      return NextResponse.json({ error: 'invalid_doc' }, { status: 400 })
    }
    if (!locale || !VALID_LOCALES.includes(locale as Locale)) {
      return NextResponse.json({ error: 'invalid_locale' }, { status: 400 })
    }

    const cacheKey = `${locale}/${doc}`
    const cached = cache.get(cacheKey)
    if (cached !== undefined) {
      return NextResponse.json({ content: cached }, { headers: { 'Cache-Control': 'no-store' } })
    }

    // doc & locale are whitelist-validated → no path traversal possible
    const filePath = path.join(process.cwd(), 'content', locale, `${doc}.md`)

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      cache.set(cacheKey, content)
      // no-store: the browser would otherwise heuristic-cache stale markdown
      // across content edits (observed live during Task 36 audit)
      return NextResponse.json({ content }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (fileError) {
      const code = (fileError as NodeJS.ErrnoException)?.code
      if (code === 'ENOENT' || code === 'EISDIR') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      throw fileError
    }
  } catch (error) {
    console.error('[api/content] GET error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
