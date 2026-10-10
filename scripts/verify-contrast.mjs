/**
 * TASK 40 — Deep-dive precision audit:
 *   A. WCAG contrast ratios (computed exactly, not eyeballed)
 *   B. Sticky-footer verification (short vs long pages)
 *   C. LUT product-rail clip diagnosis (intentional rail vs clipped card)
 *   D. Full touch-target inventory (mobile)
 * Run: node scripts/deep-audit.mjs → agent-ctx/audit/deep-audit.json
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const BASE = 'http://localhost:3000';

/* Precise contrast probe (Task 41): composites every translucent layer over
   the true opaque ancestor background — the generic auditor skips color()
   strings, which produced misleading ratios. */
const parseColor = (c) => {
  if (!c) return null;
  let m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  m = c.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\)/);
  if (m) return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a: m[4] === undefined ? 1 : +m[4] };
  return null;
};
const lum = ({ r, g, b }) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (top, base) => ({
  r: top.r * top.a + base.r * (1 - top.a),
  g: top.g * top.a + base.g * (1 - top.a),
  b: top.b * top.a + base.b * (1 - top.b),
});

const PROBE = () => {
  const out = [];
  const seen = new Set();
  const describe = (el, label) => {
    if (!el || seen.has(el)) return;
    seen.add(el);
    const stack = [];
    let node = el;
    for (let i = 0; i < 12 && node; i++) {
      const bg = getComputedStyle(node).backgroundColor;
      const p = bg.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      stack.push(bg);
      if (p && (p[4] === undefined ? 1 : +p[4]) > 0.85) break;
      node = node.parentElement;
    }
    const cs = getComputedStyle(el);
    out.push({ label, text: (el.textContent || '').trim().slice(0, 34), fg: cs.color, bgStack: stack, size: cs.fontSize, weight: cs.fontWeight });
  };
  document.querySelectorAll('span, button').forEach((el) => {
    const st = el.getAttribute('style') || '';
    if (st.includes('var(--tri-ink)')) {
      if (el.tagName === 'SPAN') describe(el, 'worlds-chip');
      else if (el.className.includes('group/dot')) describe(el, 'quick-link');
      else describe(el, 'worlds-cta');
    }
  });
  const h3 = document.querySelector('footer h3');
  if (h3) describe(h3, 'footer-h3');
  document.querySelectorAll('footer a[href^="tel:"], footer a[href^="mailto:"]').forEach((el) => describe(el, 'footer-contact'));
  return out;
};

const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'] });
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/#/ar', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(700);
  if (theme === 'dark') {
    await page.evaluate(() => { localStorage.setItem('theme', 'dark'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  const els = await page.evaluate(PROBE);
  console.log('===== THEME: ' + theme + ' ===== htmlClass=' + await page.evaluate(() => document.documentElement.className) + ' bodyBg=' + await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  for (const e of els) {
    const fg = parseColor(e.fg);
    if (!fg) { console.log('[----] ' + e.label + ' fg unparseable ' + e.fg); continue; }
    const parsed = e.bgStack.map(parseColor).filter(Boolean);
    let base = null, idx = -1;
    for (let i = 0; i < parsed.length; i++) {
      if (parsed[i].a > 0.85) { base = { r: parsed[i].r, g: parsed[i].g, b: parsed[i].b, a: 1 }; idx = i; break; }
    }
    if (!base) { base = { r: 255, g: 255, b: 255, a: 1 }; idx = parsed.length; }
    let eff = base;
    for (let i = idx - 1; i >= 0; i--) eff = over(parsed[i], eff);
    const r = ratio(fg, eff);
    const size = parseFloat(e.size), w = parseInt(e.weight) || 400;
    const large = size >= 24 || (size >= 18.66 && w >= 700);
    const need = large ? 3 : 4.5;
    const status = r >= need ? 'PASS' : 'FAIL';
    console.log('[' + status + '] ' + e.label.padEnd(14) + ' STACK=' + JSON.stringify(e.bgStack) + ' "' + e.text + '" ratio=' + r.toFixed(2) + ' (need ' + need + ') fg=' + e.fg + ' ' + e.size + '/' + e.weight + ' bg0=' + e.bgStack[0]);
  }
  await ctx.close();
}
await browser.close();
