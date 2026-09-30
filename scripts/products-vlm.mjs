/**
 * Focused VLM design critique for products + product-detail pages.
 * Usage: bun scripts/products-vlm.mjs <before|after>
 */
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const stage = process.argv[2] || 'before'
const base = `/home/z/my-project/screenshots/products-focus/${stage}`
const CHUNK = 6

const PAGE_CONTEXT = {
  'products': 'صفحة كتالوج منتجات LUT: ترويسة + شريط بحث/ترتيب + حبوب تصنيفات + شبكة بطاقات منتجات (8 لكل صفحة) + ترقيم صفحات',
  'product-gold-floor-lamp': 'صفحة تفاصيل منتج "مصباح أرضي ذهبي": مسار تنقل + معرض صور + معلومات (سعر يومي + تأمين) + وصف + منتقي إيجار (تواريخ/توفر/كمية/ملخص سعر/إضافة للسلة) + شارات ثقة + منتجات مشابهة',
  'product-crystal-chandelier': 'صفحة تفاصيل منتج "ثريا كريستال" — نفس بنية صفحة التفاصيل',
}

function buildPrompt(page, count) {
  const key = page.includes('/') ? page.split('/').pop() : page
  const frame = page.startsWith('mobile') ? 'Mobile 375×812' : 'Desktop 1440×900'
  return `You are a world-class senior product designer (Awwwards jury level) reviewing an Arabic RTL luxury furniture-rental catalog (Kuwait, gold/ivory/dark theme, NO blue allowed).

PAGE: "${key}" — ${PAGE_CONTEXT[key] || ''} · FRAME: ${frame}
You are given ${count} sequential full-viewport screenshots (Image 1..${count}) scrolling top→bottom. Consecutive screenshots overlap (~120px) — that is NOT duplication.

The site already works; this is a DESIGN-CRITIQUE pass to elevate the pages to "legendary" quality.

YOUR TASK — for EVERY image, in order, output:
### Image N — <section>
1. STATE: one-line of what is visible
2. WEAKNESSES: precise, actionable UI/UX issues: flat/boring areas, missed luxury cues (no depth/layering/texture), weak hierarchy, cramped or airy spacing, generic components that look "default shadcn", missing micro-interaction affordances, hover states that clearly do nothing special, cards that feel like e-commerce template, empty dead space, alignment/consistency issues
3. OPPORTUNITIES: 1-3 concrete "legendary upgrade" ideas for THIS specific area (be specific: exact visual treatment, motion, layout change — always respecting: gold LUT palette #E62129 red accents NO, brand = dark luxury ivory/gold, RTL Arabic, keep all existing functions)

END with:
- TOP 5 PRIORITIES: the highest-impact upgrades for this page overall
- VERDICT: current level score /10 and what /10 is achievable`
}

async function main() {
  const groups = {}
  const prefixDir = process.argv[3] // 'pc' | 'mobile' | undefined (both)
  const dirs = prefixDir ? [prefixDir] : ['pc', 'mobile']
  for (const d of dirs) {
    const dir = path.join(base, d)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
      const page = f.replace(/-\d+\.png$/, '')
      ;(groups[`${d}/${page}`] ||= []).push(path.join(d, f))
    }
  }
  for (const k of Object.keys(groups)) groups[k].sort()
  fs.mkdirSync(path.join(base, 'results'), { recursive: true })

  const zai = await ZAI.create()
  for (const [page, files] of Object.entries(groups)) {
    const out = []
    for (let i = 0; i < files.length; i += CHUNK) {
      const chunk = files.slice(i, i + CHUNK)
      const content = [{ type: 'text', text: buildPrompt(page, chunk.length) }]
      for (const f of chunk) {
        const buf = fs.readFileSync(path.join(base, f))
        content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${buf.toString('base64')}` } })
      }
      let text = ''
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const res = await zai.chat.completions.createVision({
            messages: [{ role: 'user', content }],
            thinking: { type: 'disabled' },
            temperature: 0.2,
          })
          text = res.choices[0]?.message?.content || '(empty)'
          break
        } catch (e) {
          console.log(`  retry ${page} chunk ${i / CHUNK + 1}: ${e.message}`)
          await new Promise((r) => setTimeout(r, 4000 * attempt))
        }
      }
      out.push(text)
    }
    fs.writeFileSync(path.join(base, 'results', `${page.replace('/', '__')}.md`), out.join('\n\n---\n\n'))
    console.log(`✓ ${page} analyzed`)
  }
  console.log(`Report → ${base}/results/`)
}

main().catch((e) => { console.error(e); process.exit(1) })
