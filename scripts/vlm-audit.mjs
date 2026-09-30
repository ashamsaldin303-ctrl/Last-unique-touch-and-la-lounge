/**
 * VLM page-by-page visual QA over captured viewport screenshots.
 * Usage: bun scripts/vlm-audit.mjs <pc|mobile> <output.md>
 */
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const dirName = process.argv[2] || 'pc'
const outPath = process.argv[3] || `/home/z/my-project/screenshots/${dirName}/audit.md`
const base = `/home/z/my-project/screenshots/${dirName}`

const CHUNK = 6
const CONCURRENCY = 2

const PAGE_CONTEXT = {
  'home': 'الصفحة الرئيسية: hero بخلفية جزيئات 3D ذهبية + إحصائيات + شريط علامات متحرك (marquee) + 3 بطاقات علامات + لماذا نحن + خطوات + شهادات + CTA',
  'lut': 'صفحة علامة Last Unique Touch (تأجير أثاث فاخر): hero + شريط منتجات أفقي قابل للسحب (8 منتجات) + مميزات + CTA',
  'lut-contact': 'صفحة تواصل Last Unique Touch: نموذج + بيانات',
  'la-lounge': 'صفحة علامة La Lounge (تخطيط فعاليات): hero داكن ماجنتا + خدمات + إحصائيات + شهادات + CTA',
  'la-lounge-custom': 'La Lounge أثاث مخصص: صفحة خدمة تفصيلية',
  'la-lounge-event': 'La Lounge تخطيط فعاليات: صفحة خدمة تفصيلية',
  'la-lounge-plans': 'La Lounge خطط جاهزة: صفحة باقات',
  'la-lounge-contact': 'صفحة تواصل La Lounge',
  'birthday': 'صفحة علامة Your Birthday: hero احتفالي ذهبي/بنفسجي + بطاقات tilt + شهادات + مودال حجز',
  'birthday-features': 'Your Birthday المميزات: صفحة مميزات تفصيلية',
  'birthday-products': 'Your Birthday المنتجات: شبكة منتجات',
  'birthday-contact': 'صفحة تواصل Your Birthday',
  'products': 'صفحة كل المنتجات مع فلاتر',
  'product-detail': 'صفحة تفاصيل منتج "مصباح أرضي ذهبي": صورة + سعر + توفر + إضافة للسلة + منتجات مشابهة',
  'cart': 'صفحة السلة — قد تكون فارغة (حالة فارغة مقصودة إن ظهرت رسالة سلة فارغة)',
  'checkout': 'صفحة إتمام الطلب — قد تظهر حالة سلة فارغة مقصودة',
  'payment': 'صفحة الدفع — قد تظهر حالة فارغة مقصودة',
  'checkout-success': 'صفحة نجاح الطلب — قد تظهر حالة فارغة مقصودة',
  'about': 'صفحة من نحن',
  'contact': 'صفحة تواصل عامة',
  'privacy': 'صفحة سياسة الخصوصية (نص قانوني طويل)',
  'terms': 'صفحة الشروط والأحكام (نص قانوني طويل)',
  'refund': 'صفحة سياسة الاسترجاع (نص قانوني طويل)',
}

function buildPrompt(page, count, chunkIdx, totalChunks, viewport) {
  return `You are a meticulous senior UI/UX QA reviewer inspecting an Arabic (RTL) luxury website for furniture & event rentals in Kuwait.

PAGE: "${page}" — ${PAGE_CONTEXT[page] || ''}
VIEWPORT: ${viewport === 'mobile' ? '375×812 (mobile)' : '1440×900 (desktop)'}
You are given ${count} sequential full-viewport screenshots (Image 1..${count}) scrolling from top to bottom of this page${totalChunks > 1 ? ` (chunk ${chunkIdx} of ${totalChunks} — this is a middle/bottom part of the page; the page header may not be visible)` : ''}. Consecutive screenshots overlap (~150px) so the same content may appear twice — that is NOT a duplication bug.

INTENTIONAL DESIGN ELEMENTS — DO NOT report these as defects:
- Fixed 3D particle/starfield/cosmic animated backgrounds (gold particles on dark, magenta glow, purple/gold) — by design
- Floating WhatsApp button in a corner; floating "back to top" button; thin gold scroll-progress bar at top
- Stat counters showing arbitrary mid-count numbers (they animate on scroll)
- Marquee/scrolling brand strips showing partially-cut words at edges
- Empty cart/checkout/payment states with a friendly message + button (no items were added)
- Legal pages are long text documents by design
- The site is dark-luxury themed: dark backgrounds with gold/magenta accents are intentional

YOUR TASK — inspect EVERY image in order (top→bottom), and report ONLY REAL DEFECTS:
1. Layout: overlapping elements, text clipping/overflow/truncation, misaligned or off-grid items, elements bleeding outside viewport edges, horizontal overflow, inconsistent paddings, broken image aspect ratios
2. Content: broken/missing images (broken-image icon, empty gray boxes), raw i18n keys (e.g. "home.hero.title", "whyUs.items.x"), placeholder/lorem text, English text in Arabic page (except brand names), doubled words, empty headings/labels
3. Typography/RTL: text rendered LTR when it should be RTL, punctuation on wrong side, ellipsis cutting critical info
4. Components: broken buttons (no label, clipped label), empty cards, missing icons, stuck spinners/loaders forever, unstyled HTML (raw default styles)
5. Contrast/readability: text unreadable against its background
6. Visible error states: error messages, stack traces, 404/NotFound content, hydration error overlays

OUTPUT FORMAT (markdown, be precise and terse):
### Image N — <section name>
- <defect> : <precise description + location>
(or "OK" if the image has no defects)

END with: "TOTAL DEFECTS: X" and a one-line summary.`
}

async function main() {
  const groups = {}
  for (const f of fs.readdirSync(base).filter((f) => f.endsWith('.png'))) {
    const page = f.replace(/-\d+\.png$/, '')
    ;(groups[page] ||= []).push(f)
  }
  for (const k of Object.keys(groups)) groups[k].sort()

  // Build chunk jobs
  const jobs = []
  for (const [page, files] of Object.entries(groups)) {
    for (let i = 0; i < files.length; i += CHUNK) {
      jobs.push({ page, files: files.slice(i, i + CHUNK), chunkIdx: Math.floor(i / CHUNK) + 1, totalChunks: Math.ceil(files.length / CHUNK) })
    }
  }
  console.log(`[${dirName}] ${Object.keys(groups).length} pages → ${jobs.length} chunk jobs`)

  // Resume support: per-chunk result files; skip chunks already done successfully
  const resDir = path.join(base, 'results')
  fs.mkdirSync(resDir, { recursive: true })
  const pending = jobs.filter((j) => {
    const rf = path.join(resDir, `${j.page}__${j.chunkIdx}.json`)
    if (!fs.existsSync(rf)) return true
    try { return JSON.parse(fs.readFileSync(rf, 'utf8')).error } catch { return true }
  })
  console.log(`Resuming: ${jobs.length - pending.length} done, ${pending.length} pending`)

  const zai = await ZAI.create()
  const results = {}

  async function runJob(job) {
    const key = `${job.page}__${job.chunkIdx}`
    const content = [{ type: 'text', text: buildPrompt(job.page, job.files.length, job.chunkIdx, job.totalChunks, dirName) }]
    for (const f of job.files) {
      const buf = fs.readFileSync(path.join(base, f))
      content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${buf.toString('base64')}` } })
    }
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const res = await zai.chat.completions.createVision({
          messages: [{ role: 'user', content }],
          thinking: { type: 'disabled' },
          temperature: 0.1,
        })
        const text = res.choices[0]?.message?.content || '(empty response)'
        fs.writeFileSync(path.join(resDir, `${key}.json`), JSON.stringify({ page: job.page, chunkIdx: job.chunkIdx, totalChunks: job.totalChunks, files: job.files, text }))
        console.log(`✓ ${key} done (${text.length} chars)`)
        return
      } catch (err) {
        console.log(`✗ ${key} attempt ${attempt} failed: ${err.message}`)
        await new Promise((r) => setTimeout(r, 5000 * attempt))
      }
    }
    fs.writeFileSync(path.join(resDir, `${key}.json`), JSON.stringify({ page: job.page, chunkIdx: job.chunkIdx, totalChunks: job.totalChunks, files: job.files, error: 'failed after retries' }))
    console.log(`✗✗ ${key} FAILED permanently`)
  }

  // Process with limited concurrency
  let idx = 0
  async function worker() {
    while (idx < pending.length) {
      const job = pending[idx++]
      await runJob(job)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  // Rebuild report from all result files
  const all = fs.readdirSync(resDir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return JSON.parse(fs.readFileSync(path.join(resDir, f), 'utf8')) } catch { return null }
  }).filter(Boolean)
  all.sort((a, b) => (a.page !== b.page ? a.page.localeCompare(b.page) : a.chunkIdx - b.chunkIdx))
  const report = `# VLM Visual Audit — ${dirName.toUpperCase()} (${dirName === 'mobile' ? '375×812' : '1440×900'})\n\nPages: ${Object.keys(groups).length} · Screenshots: ${Object.values(groups).flat().length} · Chunks: ${all.length}\n\n---\n\n` + all.map((r) => `## [${r.page}] part ${r.chunkIdx}/${r.totalChunks} (${r.files.join(', ')})\n\n${r.error ? `ERROR: analysis failed — ${r.error}` : r.text}`).join('\n\n---\n\n')
  fs.writeFileSync(outPath, report)
  console.log(`\nReport written → ${outPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
