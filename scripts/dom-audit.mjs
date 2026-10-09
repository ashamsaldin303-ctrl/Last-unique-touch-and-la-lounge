/**
 * TASK 40 — DOM-level precision audit across every route × language × viewport.
 * Complements the VLM visual audit with programmatic checks:
 *   1. horizontal overflow + elements poking out of the viewport
 *   2. broken images (naturalWidth === 0)
 *   3. missing alt attributes
 *   4. interactive targets < 44px (mobile)
 *   5. language mixing (latin text on ar pages, arabic on en pages)
 *   6. dir/lang attribute correctness
 *   7. empty interactive elements / aria issues
 * Run: node scripts/dom-audit.mjs  → agent-ctx/audit/dom-audit.jsonl
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const BASE = 'http://localhost:3000';
const ROOT = '/home/z/my-project';
const OUT = path.join(ROOT, 'agent-ctx/audit/dom-audit.jsonl');
const MANIFEST = path.join(ROOT, 'agent-ctx/audit/manifest.jsonl');

const STATIC_ROUTES = [
  '/', '/last-unique-touch', '/last-unique-touch/contact',
  '/la-lounge', '/la-lounge/products', '/la-lounge/custom-furniture',
  '/la-lounge/event-planning', '/la-lounge/ready-plans', '/la-lounge/contact',
  '/your-birthday', '/your-birthday/features', '/your-birthday/products',
  '/your-birthday/contact', '/products', '/cart', '/checkout',
  '/checkout/payment', '/checkout/success', '/about', '/contact',
  '/privacy', '/terms', '/refund', '/zz-404-audit-test',
];
const LANGS = ['ar', 'en'];
const VPS = {
  pc: { width: 1920, height: 1080, dsf: 1 },
  mobile: { width: 375, height: 812, dsf: 2 },
};
const PRODUCT_SLUGS = ['gold-floor-lamp', 'luxury-sofa-set', 'balloon-arch'];

const results = [];
const out = fs.createWriteStream(OUT, { flags: 'w' });

const IN_PAGE_AUDIT = (isMobile) => {
  const issues = [];
  const de = document.documentElement;
  const vw = de.clientWidth;

  /* 1 — horizontal overflow */
  const overflowX = de.scrollWidth - vw;
  if (overflowX > 1) {
    issues.push({ check: 'overflow-x', severity: overflowX > 24 ? 'major' : 'minor', desc: `page is ${overflowX}px wider than viewport (${vw}px)`, location: 'document' });
  }
  // elements poking outside horizontally (skip decorative/aria-hidden/marquee/fixed-position chrome)
  const offenders = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (offenders.length >= 12) return;
    if (el.closest('[aria-hidden="true"]')) return;
    const cls = String(el.className || '');
    if (/marquee|grain|watermark|cursor|noise/i.test(cls)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (r.right > vw + 10 && r.width < vw * 1.05) {
      offenders.push(`${el.tagName.toLowerCase()}.${cls.split(' ').slice(0, 2).join('.')} right=${Math.round(r.right)} (vw ${vw}) text="${(el.textContent || '').trim().slice(0, 40)}"`);
    }
  });
  if (offenders.length) {
    issues.push({ check: 'overflow-element', severity: 'major', desc: `${offenders.length}+ element(s) extend past the right viewport edge`, location: offenders.slice(0, 4).join(' | ') });
  }

  /* 2 — broken images */
  document.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:')) return;
    if (img.complete && img.naturalWidth === 0) {
      issues.push({ check: 'broken-image', severity: 'critical', desc: `image failed to load: ${src.slice(0, 110)}`, location: (img.alt || img.getAttribute('class') || 'img').toString().slice(0, 60) });
    }
  });

  /* 3 — missing alt on meaningful images */
  let altMiss = 0;
  document.querySelectorAll('img').forEach((img) => {
    const alt = img.getAttribute('alt');
    if (alt === null || alt === undefined) altMiss++;
  });
  if (altMiss > 0) {
    issues.push({ check: 'a11y-alt', severity: 'minor', desc: `${altMiss} <img> without alt attribute`, location: 'document' });
  }

  /* 4 — touch targets (mobile only) */
  if (isMobile) {
    const small = [];
    document.querySelectorAll('button, a[href], [role="button"], input, select, textarea, [role="tab"]').forEach((el) => {
      if (el.closest('[aria-hidden="true"]')) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32)) {
        small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 26)}" ${Math.round(r.width)}×${Math.round(r.height)}px`);
      }
      if (small.length >= 10) return;
    });
    if (small.length) {
      issues.push({ check: 'touch-target', severity: small.length > 5 ? 'major' : 'minor', desc: `${small.length} interactive element(s) smaller than 32px (44px recommended)`, location: small.slice(0, 5).join(' | ') });
    }
  }

  /* 5 — language mixing: latin words on arabic pages */
  const LATIN_OK = new Set(['KWD', 'LUT', 'LA', 'LOUNGE', 'YOUR', 'BIRTHDAY', 'LAST', 'UNIQUE', 'TOUCH', 'AND', 'THE', 'A', 'OF', 'Wh', 'LED', 'SSL', 'Visa', 'Mastercard', 'CVV', 'EN', 'AR', 'FAQ', 'WhatsApp', 'Instagram', '×', '✦']);
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      const tag = p.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return NodeFilter.FILTER_REJECT;
      if (p.closest('script, style, noscript, template, [aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walker.nextNode())) {
    const t = (n.textContent || '').trim();
    if (t.length > 2) textNodes.push({ t, el: n.parentElement });
  }
  const lang = document.documentElement.getAttribute('lang') || 'ar';
  if (lang === 'ar') {
    const latinHits = [];
    for (const { t, el } of textNodes) {
      // latin sequences of 3+ letters (not numbers, not allowed brands)
      const matches = t.match(/[A-Za-z]{3,}/g) || [];
      for (const m of matches) {
        if (LATIN_OK.has(m.toUpperCase())) continue;
        if (latinHits.length >= 8) break;
        latinHits.push(`"${m}" in "${t.slice(0, 50)}" <${el ? el.tagName.toLowerCase() : '?'}>`);
      }
    }
    if (latinHits.length) {
      issues.push({ check: 'i18n-mix', severity: 'minor', desc: `${latinHits.length} latin word(s) on an Arabic page`, location: latinHits.slice(0, 5).join(' | ') });
    }
  } else {
    const arabicHits = [];
    for (const { t, el } of textNodes) {
      const m = t.match(/[\u0600-\u06FF]{3,}/);
      if (m && arabicHits.length < 8) {
        arabicHits.push(`"${t.slice(0, 45)}" <${el ? el.tagName.toLowerCase() : '?'}>`);
      }
    }
    if (arabicHits.length) {
      issues.push({ check: 'i18n-mix', severity: 'minor', desc: `${arabicHits.length} Arabic word(s) on an English page`, location: arabicHits.slice(0, 5).join(' | ') });
    }
  }

  /* 6 — dir attribute */
  const dir = document.documentElement.getAttribute('dir');
  if (lang === 'ar' && dir !== 'rtl') issues.push({ check: 'dir', severity: 'critical', desc: `lang=ar but dir=${dir || 'none'}`, location: 'html' });
  if (lang === 'en' && dir !== 'ltr') issues.push({ check: 'dir', severity: 'critical', desc: `lang=en but dir=${dir || 'none'}`, location: 'html' });

  /* 7 — empty interactive elements */
  const emptyInteractive = [];
  document.querySelectorAll('a[href], button:not([aria-hidden="true"])').forEach((el) => {
    if (emptyInteractive.length >= 6) return;
    const label = (el.getAttribute('aria-label') || el.textContent || '').trim();
    const hasIcon = el.querySelector('svg, img');
    if (!label && !hasIcon) emptyInteractive.push(`<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 40)}">`);
  });
  if (emptyInteractive.length) {
    issues.push({ check: 'a11y-label', severity: 'major', desc: `${emptyInteractive.length} unlabeled interactive element(s)`, location: emptyInteractive.join(' | ') });
  }

  return { issues, stats: { imgs: document.images.length, links: document.querySelectorAll('a').length, buttons: document.querySelectorAll('button').length } };
};

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(500);
}

const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage', '--disable-gpu', '--use-angle=swiftshader', '--no-sandbox'] });
let n = 0;
for (const vpName of ['pc', 'mobile']) {
  const cfg = VPS[vpName];
  const ctx = await browser.newContext({
    viewport: { width: cfg.width, height: cfg.height },
    deviceScaleFactor: cfg.dsf,
    isMobile: vpName === 'mobile',
    hasTouch: vpName === 'mobile',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  const routes = [...STATIC_ROUTES, ...PRODUCT_SLUGS.map((s) => `/products/${s}`), '/admin', '/admin/lut', '/admin/la-lounge', '/admin/birthday'];
  for (const lang of LANGS) {
    for (const route of routes) {
      try {
        await page.goto(`${BASE}/#/${lang}${route === '/' ? '' : route}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
        await settle(page);
        // scroll to bottom slowly to trigger lazy images, then audit
        await page.evaluate(async () => {
          const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
          for (let y = 0; y <= document.body.scrollHeight + step; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
        }).catch(() => {});
        await page.waitForTimeout(400);
        const res = await page.evaluate(IN_PAGE_AUDIT, vpName === 'mobile');
        const rec = { vp: vpName, lang, route, ...res };
        out.write(JSON.stringify(rec) + '\n');
        n++;
        if (res.issues.length) console.log(`[${vpName}/${lang}${route}] ${res.issues.length} issue(s): ${res.issues.map((i) => i.check).join(', ')}`);
      } catch (e) {
        console.log(`✗ ${vpName}/${lang}${route}: ${String(e).split('\n')[0].slice(0, 90)}`);
      }
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`DOM audit done: ${n} page-views audited → ${OUT}`);
