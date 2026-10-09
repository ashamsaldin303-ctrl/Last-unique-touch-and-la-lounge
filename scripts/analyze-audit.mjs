/**
 * TASK 40 — Per-image VLM analysis of every captured screenshot.
 * Run: bun scripts/analyze-audit.mjs
 * Resumable: skips ids already present in agent-ctx/audit/analysis.jsonl
 */
import fs from 'node:fs';
import path from 'node:path';
import ZAI from 'z-ai-web-dev-sdk';

const ROOT = '/home/z/my-project';
const MANIFEST = path.join(ROOT, 'agent-ctx/audit/manifest.jsonl');
const OUT = path.join(ROOT, 'agent-ctx/audit/analysis.jsonl');

const CONCURRENCY = 2;
const MAX_RETRIES = 8;
const INTER_CALL_DELAY_MS = 600; // gentle pacing between calls per worker

const shots = [];
for (const line of fs.readFileSync(MANIFEST, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { shots.push(JSON.parse(line)); } catch {}
}

const doneIds = new Set();
if (fs.existsSync(OUT)) {
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { doneIds.add(JSON.parse(line).id); } catch {}
  }
}
const queue = shots.filter((s) => !doneIds.has(s.id));
console.log(`Shots: ${shots.length} | already analyzed: ${doneIds.size} | to analyze: ${queue.length}`);

const out = fs.createWriteStream(OUT, { flags: 'a' });

const PAGE_HINT = {
  '/': 'home page (brand selector / hero / marquee / worlds / testimonials / CTA / footer)',
  '/products': 'products catalog (search, category pills, brand filter, product grid, pagination)',
  '/cart': 'shopping cart page',
  '/checkout': 'checkout form page',
  '/checkout/payment': 'payment display page',
  '/checkout/success': 'order success page',
  '/admin': 'admin control center (KPIs, brand cards, tabs) — or the login gate if a password card is shown',
  '/about': 'about page', '/contact': 'contact page',
};

function pageHint(route, lang, vp, kind, state) {
  let h = PAGE_HINT[route] || `${route} page`;
  if (route.startsWith('/products/')) h = `product detail page (${route.split('/').pop()}) — gallery, price, rental picker, trust badges`;
  if (route.startsWith('/last-unique-touch')) h = 'LUT (Last Unique Touch) luxury furniture brand page' + (route.endsWith('/contact') ? ' — contact section' : '');
  if (route.startsWith('/la-lounge')) h = 'La Lounge event/interior brand page' + (route !== '/la-lounge' ? ` (${route.replace('/la-lounge/', '')})` : '');
  if (route.startsWith('/your-birthday')) h = 'Your Birthday party brand page' + (route !== '/your-birthday' ? ` (${route.replace('/your-birthday/', '')})` : '');
  if (route.includes('404')) h = '404 not-found page';
  if (route.startsWith('/admin/')) h = `admin management page for the ${route.split('/')[2]} brand (hero, KPIs, tabs)`;
  const extra = [];
  extra.push(lang === 'ar' ? 'language: Arabic (RTL layout — text must flow right-to-left)' : 'language: English (LTR)');
  extra.push(vp === 'mobile' ? 'viewport: mobile 375px wide' : 'viewport: PC desktop 1920px wide');
  if (kind === 'full') extra.push('capture: FULL PAGE stitch (fixed navbar appears once; this is normal)');
  if (kind === 'segment') extra.push('capture: mid-scroll viewport segment');
  if (kind === 'viewport') extra.push('capture: single viewport (above the fold or current scroll)');
  if (state && state !== 'base' && state !== 'top') extra.push(`UI state: ${state}`);
  return h + '. ' + extra.join(' · ') + '.';
}

function buildPrompt(shot) {
  return `You are an elite senior UI/UX QA auditor examining ONE screenshot of a Kuwaiti luxury rental website (LUT / La Lounge / Your Birthday brands, prices in KWD).

${pageHint(shot.route, shot.lang, shot.vp, shot.kind, shot.state)}

Inspect with extreme precision, region by region (top navbar, body sections, cards, forms, footers, corners, edges):
1. Layout breakage: overlapping elements, cut-off content, unexpected horizontal scroll clues, broken grids, misaligned columns.
2. RTL correctness (Arabic pages): punctuation/numerals placed on wrong side, mirrored icons that should not be mirrored, LTR-stuck components.
3. Typography: overflow, truncation with ellipsis on important text, cramped line-height, mixed fonts, text collisions.
4. Broken or missing images: empty gray boxes, alt-text showing, half-loaded images, stretched/distorted images.
5. Contrast & readability: text too faint on background, disabled-looking body text, illegible overlays.
6. Spacing & alignment: inconsistent paddings, elements touching edges, ragged card alignment.
7. Functional UI hints: buttons that look disabled but should be enabled, loading spinners stuck, empty states with dead text, double scrollbars.
8. Language mix: English text on an Arabic page or Arabic on English page, missing translations, obvious typos in visible text.
9. Rendering artifacts: FOUC/unstyled content, black boxes, WebGL canvas not rendering (solid black/blank where a 3D object should be), z-index bugs.
10. Footer position: floating oddly, overlapping content, or cut off.

Do NOT report intentional design choices (dark luxury palette, gold accents, editorial typography, film grain overlay, custom cursor, watermarks, lowercase latin logotypes) as errors.
3D particle/cake scenes are DISABLED under reduced-motion in this audit environment: dark sections with subtle gradients or plain solid backgrounds where a 3D scene would sit are NOT errors — do not report missing 3D/particles as issues.
Do NOT invent issues: report only what is actually visible in THIS image.

Respond with STRICT JSON only, no markdown fences:
{"errors":[{"severity":"critical|major|minor","type":"layout|rtl|typography|image|contrast|spacing|functional|i18n|rendering|footer","desc":"precise description of what is wrong and where","location":"where on the page (e.g. 'top navbar right side')"}],"pass":true|false,"summary":"one short sentence overall"}
If nothing is wrong: {"errors":[],"pass":true,"summary":"clean"}`;
}

function extractJson(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  t = t.slice(start, end + 1);
  try { return JSON.parse(t); } catch { return null; }
}

async function analyzeOne(zai, shot) {
  const b64 = fs.readFileSync(shot.file).toString('base64');
  const prompt = buildPrompt(shot);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await zai.chat.completions.createVision({
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
          ],
        }],
        thinking: { type: 'disabled' },
      });
      const content = response.choices[0]?.message?.content;
      const parsed = extractJson(content);
      if (parsed && Array.isArray(parsed.errors)) {
        return { id: shot.id, file: shot.file, ok: true, pass: !!parsed.pass, errors: parsed.errors, summary: parsed.summary || '', diag: shot.diag?.length || 0 };
      }
    } catch (e) {
      const msg = String(e);
      const is429 = msg.includes('429') || /Too many/i.test(msg);
      if (attempt === MAX_RETRIES) {
        return { id: shot.id, file: shot.file, ok: false, pass: false, errors: [], summary: 'ANALYSIS_FAILED: ' + msg.split('\n')[0].slice(0, 140), diag: shot.diag?.length || 0 };
      }
      // 429 → long exponential backoff (60s, 120s, 240s…); other errors → short
      const wait = is429 ? Math.min(480000, 60000 * attempt) : 1500 * attempt;
      console.log(`  [429/backoff] ${shot.id} attempt ${attempt}: waiting ${Math.round(wait / 1000)}s`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
  }
  return { id: shot.id, file: shot.file, ok: false, pass: false, errors: [], summary: 'ANALYSIS_FAILED: invalid model response', diag: shot.diag?.length || 0 };
}

let completed = 0;
async function worker(zai, items, wid) {
  for (const shot of items) {
    const res = await analyzeOne(zai, shot);
    out.write(JSON.stringify(res) + '\n');
    completed++;
    if (completed % 10 === 0) console.log(`[analyze] ${completed}/${queue.length} done (worker ${wid})`);
    await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
  }
}

const zai = await ZAI.create();
const chunks = Array.from({ length: CONCURRENCY }, (_, i) => queue.filter((_, j) => j % CONCURRENCY === i));
await Promise.all(chunks.map((c, i) => (c.length ? worker(zai, c, i + 1) : Promise.resolve())));
console.log(`ANALYSIS DONE — ${completed} analyzed this run, total ${doneIds.size + completed}.`);
