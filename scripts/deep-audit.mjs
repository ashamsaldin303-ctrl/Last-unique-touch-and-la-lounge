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
const OUT = '/home/z/my-project/agent-ctx/audit/deep-audit.json';

const report = { contrast: [], footer: {}, rail: {}, touch: [] };

/* ---------- helpers ---------- */
const parseRGB = (c) => {
  const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
};
const lum = ({ r, g, b }) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

const CONTRAST_AUDIT = () => {
  const parseRGB = (c) => {
    const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  };
  const out = [];
  const els = [...document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label, li, td, th, dt, dd, blockquote')];
  let checked = 0;
  for (const el of els) {
    if (checked > 250) break;
    if (el.closest('[aria-hidden="true"], script, style')) continue;
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ');
    if (txt.length < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const fg = parseRGB(cs.color);
    if (!fg || fg.a === 0) continue;
    // walk ancestors for an opaque-enough background
    let bg = null, node = el;
    for (let i = 0; i < 12 && node; i++) {
      const c = parseRGB(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.85) { bg = c; break; }
      if (c && c.a > 0) { bg = c; /* keep looking for more opaque */ }
      node = node.parentElement;
    }
    if (!bg) bg = { r: 255, g: 255, b: 255, a: 1 }; // assume white for transparent-on-body
    // effective blend of fg alpha over bg
    const fge = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg;
    const r = ratio(fge, bg);
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (r < need - 0.02) {
      out.push({ text: txt.slice(0, 60), ratio: Math.round(r * 100) / 100, need, size: Math.round(size), weight, tag: el.tagName.toLowerCase(), fg: cs.color, bg: getComputedStyle(el).backgroundColor });
    }
    checked++;
  }
  return { checked, violations: out.slice(0, 40) };
};

const FOOTER_CHECK = () => {
  const f = document.querySelector('footer');
  if (!f) return { found: false };
  const r = f.getBoundingClientRect();
  const docH = document.documentElement.scrollHeight;
  const vh = window.innerHeight;
  return {
    found: true,
    docH, vh,
    footerTop: Math.round(r.top + window.scrollY),
    footerBottom: Math.round(r.bottom + window.scrollY),
    // healthy: short page → footerBottom ≈ vh (sticky to bottom);
    // long page → footerBottom ≈ docH (pushed down naturally)
    stickyOk: docH <= vh + 40 ? Math.abs(r.bottom - vh) < 40 : Math.abs(r.bottom - docH) < 60,
  };
};

const RAIL_CHECK = () => {
  // find any element that extends beyond the right viewport edge
  const parseNone = null;
  const vw = document.documentElement.clientWidth;
  const offenders = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (offenders.length >= 6) return;
    if (el.closest('[aria-hidden="true"]')) return;
    const cls = String(el.className || '');
    if (/marquee|grain|watermark|cursor|noise|hero-orb/i.test(cls)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 40) return;
    if (r.right > vw + 10) {
      // find nearest scrollable/clip ancestor
      let scrollable = null, clipper = null, node = el.parentElement;
      for (let i = 0; i < 10 && node; i++) {
        const cs = getComputedStyle(node);
        if (!scrollable && /(auto|scroll)/.test(cs.overflowX) && node.scrollWidth > node.clientWidth + 4) scrollable = node;
        if (!clipper && /(hidden|clip)/.test(cs.overflowX)) clipper = node;
        node = node.parentElement;
      }
      offenders.push({
        tag: el.tagName.toLowerCase(), cls: cls.slice(0, 80), right: Math.round(r.right), vw,
        inScrollableRail: !!scrollable, railCls: scrollable ? String(scrollable.className).slice(0, 80) : null,
        clippedBy: clipper ? String(clipper.className).slice(0, 80) : null,
        text: (el.textContent || '').trim().slice(0, 50),
      });
    }
  });
  return offenders;
};

const TOUCH_INV = () => {
  const small = [];
  document.querySelectorAll('button, a[href], [role="button"], [role="tab"], input, select, textarea').forEach((el) => {
    if (el.closest('[aria-hidden="true"]')) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32)) {
      small.push({ tag: el.tagName.toLowerCase(), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 36), w: Math.round(r.width), h: Math.round(r.height) });
    }
  });
  return small;
};

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(500);
}

const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'] });

/* ---------- A: contrast on key pages (PC) ---------- */
const pc = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
let page = await pc.newPage();
for (const [lang, route] of [['ar', '/'], ['en', '/'], ['ar', '/products'], ['ar', '/products/gold-floor-lamp'], ['ar', '/cart'], ['ar', '/admin'], ['ar', '/contact']]) {
  await page.goto(`${BASE}/#/${lang}${route === '/' ? '' : route}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  const res = await page.evaluate(CONTRAST_AUDIT);
  if (res.violations.length) {
    report.contrast.push({ page: `${lang}${route}`, checked: res.checked, violations: res.violations });
    console.log(`[contrast] ${lang}${route}: ${res.violations.length} violations of ${res.checked} checked`);
  } else console.log(`[contrast] ${lang}${route}: clean (${res.checked} checked)`);
}

/* ---------- B: footer sticky on short + long pages ---------- */
for (const [vp, cfg] of [['pc', { width: 1920, height: 1080 }], ['mobile', { width: 375, height: 812 }]]) {
  const ctx = await browser.newContext({ viewport: cfg, isMobile: vp === 'mobile', hasTouch: vp === 'mobile', reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  report.footer[vp] = {};
  for (const [lang, route] of [['ar', '/zz-404-audit-test'], ['en', '/zz-404-audit-test'], ['ar', '/cart'], ['en', '/privacy']]) {
    await p.goto(`${BASE}/#/${lang}${route}`, { waitUntil: 'domcontentloaded' });
    await settle(p);
    const f = await p.evaluate(FOOTER_CHECK);
    report.footer[vp][`${lang}${route}`] = f;
    console.log(`[footer:${vp}] ${lang}${route}: stickyOk=${f.stickyOk} (docH ${f.docH} vs vh ${f.vh})`);
  }
  await ctx.close();
}

/* ---------- C: rail clip diagnosis (PC EN LUT brand page) ---------- */
await page.goto(`${BASE}/#/en/last-unique-touch`, { waitUntil: 'domcontentloaded' });
await settle(page);
report.rail['en/last-unique-touch'] = await page.evaluate(RAIL_CHECK);
await page.goto(`${BASE}/#/ar`, { waitUntil: 'domcontentloaded' });
await settle(page);
report.rail['ar/home'] = await page.evaluate(RAIL_CHECK);
console.log(`[rail] offenders: ${JSON.stringify(report.rail['en/last-unique-touch'].map((o) => ({ tag: o.tag, rail: o.inScrollableRail, clip: o.clippedBy?.slice(0, 40) })))}`);

/* ---------- D: touch inventory (mobile, key pages) ---------- */
const mob = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
page = await mob.newPage();
for (const [lang, route] of [['ar', '/'], ['ar', '/last-unique-touch'], ['ar', '/products'], ['ar', '/products/gold-floor-lamp'], ['ar', '/cart'], ['ar', '/checkout'], ['ar', '/admin']]) {
  await page.goto(`${BASE}/#/${lang}${route === '/' ? '' : route}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  const inv = await page.evaluate(TOUCH_INV);
  if (inv.length) report.touch.push({ page: `${lang}${route}`, items: inv });
  console.log(`[touch] ${lang}${route}: ${inv.length} small targets`);
}

await browser.close();
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log('deep-audit written →', OUT);
