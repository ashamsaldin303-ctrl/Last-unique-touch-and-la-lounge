import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent, requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/upload — multipart image upload for the product editor
 * (protected). Field name: `files`, 1..6 files, each ≤5MB (400
 * `{ error:'file_too_large' }`), declared total body ≤32MB (413). Content is
 * validated by MAGIC NUMBERS only (JPEG/PNG/WEBP/GIF) — the declared
 * Content-Type and the client filename are ignored, so SVG/HTML/active
 * content can never land in `public/` under this route. Files are stored
 * under a server-generated name `img-<uuid>.<sniffed-ext>` inside
 * `public/uploads/` (with a resolved-path containment check) and the
 * response returns relative URLs only: 201 `{ urls: ['/uploads/…', …] }`.
 */

const MAX_TOTAL_BYTES = 32 * 1024 * 1024
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_FILES = 6
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

type SniffedImageType = 'jpg' | 'png' | 'webp' | 'gif'

/** Magic-number sniffing — the ONLY source of truth for the file type. */
function sniffImageType(bytes: Buffer): SniffedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg' // JPEG: FF D8 FF
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png' // PNG: 89 50 4E 47
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp' // WEBP: "RIFF" + size + "WEBP"
  }
  if (bytes.length >= 4 && bytes.toString('ascii', 0, 4) === 'GIF8') {
    return 'gif' // GIF: GIF8…
  }
  return null
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  // Multipart bodies dwarf the JSON 256KB guard — use a dedicated 32MB cap on
  // the declared Content-Length. Audit r2 NEW-3: a finite, numeric
  // Content-Length is REQUIRED (mirrors guardBodySize): a chunked or
  // length-less multipart would otherwise skip this pre-check and let
  // req.formData() buffer the whole body in memory before the per-file caps
  // run. Status 411 Length Required (authenticated, self-DoS only).
  const rawLength = req.headers.get('content-length')
  const chunked = (req.headers.get('transfer-encoding') ?? '').toLowerCase().includes('chunked')
  const declared = rawLength === null ? Number.NaN : Number(rawLength)
  if (chunked || !Number.isFinite(declared) || declared < 0) {
    logSecurityEvent('oversized_body_rejected', req, {
      reason: chunked ? 'chunked' : 'invalid_content_length',
    })
    return NextResponse.json({ error: 'invalid_input' }, { status: 411 })
  }
  if (declared > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 })
  }

  try {
    const form = await req.formData()
    const files = form.getAll('files').filter((entry): entry is File => entry instanceof File)
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'validation', details: { files: 'required' } },
        { status: 400 },
      )
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: 'validation', details: { files: 'max' } }, { status: 400 })
    }

    // Validate every file BEFORE writing any of them (no orphan files on a
    // late rejection). At most 6 × 5MB is buffered — acceptable in memory.
    const validated: Array<{ bytes: Buffer; ext: SniffedImageType }> = []
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
      }
      const bytes = Buffer.from(await file.arrayBuffer())
      if (bytes.byteLength > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
      }
      const ext = sniffImageType(bytes)
      if (ext === null) {
        return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
      }
      validated.push({ bytes, ext })
    }

    mkdirSync(UPLOADS_DIR, { recursive: true })
    const uploadsRoot = path.resolve(UPLOADS_DIR)
    const urls: string[] = []
    for (const { bytes, ext } of validated) {
      // Server-generated name only — the client filename is never used.
      const filename = `img-${randomUUID()}.${ext}`
      const target = path.resolve(UPLOADS_DIR, filename)
      if (!target.startsWith(uploadsRoot + path.sep)) {
        return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
      }
      writeFileSync(target, bytes)
      urls.push(`/uploads/${filename}`)
    }

    logSecurityEvent('admin_upload', req, { count: urls.length })
    return NextResponse.json({ urls }, { status: 201 })
  } catch (error) {
    console.error('[api/admin/upload] POST error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
