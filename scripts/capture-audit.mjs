#!/usr/bin/env node
/**
 * TASK 40 — Site-wide visual audit capture.
 * Produces 300+ screenshots (Mobile 375×812 + PC 1920×1080) across every
 * route × language × state, plus per-shot console/network diagnostics.
 *
 * Resumable: manifest JSONL records every completed shot id; re-running
 * skips anything already captured.
 *
 * Run: node scripts/capture-audit.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const BASE = 'http://localhost:3000';
const ROOT = '/home/z/my-project';
const OUT = path.join(ROOT, 'agent-ctx/audit/screenshots');
const MANIFEST = path.join(ROOT, 'agent-ctx/audit/manifest.jsonl');
const ADMIN_PW = 'Maison-Admin-2025!';

for (const d of ['pc', 'mobile', 'states']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

/* ---------------- resume support ---------------- */
const done = new Set();
if (fs.existsSync(MANIFEST)) {
  for (const line of fs.readFileSync(MANIFEST, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { done.add(JSON.parse(line).id); } catch { /* partial line after kill */ }
  }
}
const manifest = fs.createWriteStream(MANIFEST, { flags: 'a' });
const log = (obj) => manifest.write(JSON.stringify(obj) + '\n');
let captured = 0, skipped = 0;

/* ---------------- config ---------------- */
const STATIC_ROUTES = [
  '/', '/last-unique-touch', '/last-unique-touch/contact',
  '/la-lounge', '/la-lounge/products', '/la-lounge/custom-furniture',
  '/la-lounge/event-planning', '/la-lounge/ready-plans', '/la-lounge/contact',
  '/your-birthday', '/your-birthday/features', '/your-birthday/products',
  '/your-birthday/contact', '/products', '/cart', '/checkout',
  '/checkout/payment', '/checkout/success', '/admin', '/admin/lut',
  '/admin/la-lounge', '/admin/birthday', '/about', '/contact',
  '/privacy', '/terms', '/refund', '/zz-404-audit-test',
];
const LANGS = ['ar', 'en'];
const VPS = {
  pc: { width: 1920, height: 1080, dsf: 1 },
  mobile: { width: 375, height: 812, dsf: 2 },
};
const SEGMENT_ROUTES = new Set([
  '/', '/products', '/cart', '/checkout', '/admin', '/admin/lut',
  '/admin/la-lounge', '/admin/birthday', '/la-lounge', '/your-birthday',
  '/contact', '/about',
]);
const SEGMENT_PRODUCT_SLUGS = ['gold-floor-lamp', 'luxury-sofa-set', 'balloon-arch'];
const MAX_SEGMENTS = 6;

const T = {
  menu: { ar: 'القائمة', en: 'Menu' },
  theme: { ar: 'تبديل المظهر', en: 'Toggle theme' },
  login: { ar: 'تسجيل الدخول', en: 'Sign in' },
  newProduct: { ar: 'منتج جديد', en: 'New product' },
  addToCart: { ar: 'أضف للسلة', en: 'Add to Cart' },
  preset3: { ar: '3 أيام', en: '3 Days' },
  confirmOrder: { ar: 'تأكيد الطلب', en: 'Confirm Order' },
  send: { ar: 'إرسال', en: 'Send' },
  lighting: { ar: 'إضاءة', en: 'Lighting' },
  pay: { ar: 'ادفع', en: 'Pay ' },
};
const slugify = (p) => (String(p).replace(/^\//, '').replace(/\//g, '-').replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, '') || 'home');

/* ---------------- diagnostics ---------------- */
function attachDiag(page, bucket) {
  page.on('console', (m) => {
    if (m.type() === 'error') bucket.push('[console] ' + m.text().slice(0, 260));
  });
  page.on('pageerror', (e) => bucket.push('[pageerror] ' + String(e).split('\n')[0].slice(0, 260)));
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (u.startsWith(BASE)) bucket.push('[net] ' + (r.failure()?.errorText || 'fail') + ' ' + u.slice(BASE.length, BASE.length + 140));
  });
}

async function settle(page, ms = 650) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(ms);
}

/** Downward sweep — all scroll-reveal animations use viewport={{once:true}}. */
async function sweep(page) {
  await page.evaluate(async () => {
    const step = Math.max(320, Math.floor(window.innerHeight * 0.8));
    const max = document.body.scrollHeight;
    for (let y = 0; y <= max + step; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
  }).catch(() => {});
  await page.waitForTimeout(350);
}

async function go(page, lang, p) {
  const hash = `#/${lang}${p === '/' ? '' : p}`;
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await settle(page);
}

/* ---------------- worker ---------------- */
async function runWorker(browser, vpName, products) {
  return runWorkerInner(browser, vpName, products).catch((e) => {
    console.log(`  ✗✗ worker ${vpName} aborted: ${String(e).split('\n')[0].slice(0, 160)}`);
  });
}

async function runWorkerInner(browser, vpName, products) {
  const cfg = VPS[vpName];
  const ctx = await browser.newContext({
    viewport: { width: cfg.width, height: cfg.height },
    deviceScaleFactor: cfg.dsf,
    isMobile: vpName === 'mobile',
    hasTouch: vpName === 'mobile',
    locale: 'en-US',
    // No GPU in this container: swiftshader software-GL on the 3D scenes
    // (birthday 3-tier cake etc.) exhausts RAM and crashes the browser.
    // The site gates every 3D background on prefers-reduced-motion → clean
    // static-gradient fallbacks. (Noted as audit-env limitation in report.)
    reducedMotion: 'reduce',
  });
  let page = await ctx.newPage();
  const diag = [];
  const attach = (p) => attachDiag(p, diag);
  attach(page);
  let sinceRecycle = 0;
  /** Recycle the renderer page every 20 shots — releases WebGL/framer
   *  memory that accumulates on the 3D brand pages (container has 4GB RAM). */
  const recycleIfNeeded = async () => {
    sinceRecycle++;
    if (sinceRecycle < 20) return;
    sinceRecycle = 0;
    try { await page.close(); } catch {}
    try { page = await ctx.newPage(); attach(page); } catch {}
  };
  const diagSnapshot = () => { const d = diag.splice(0, diag.length); return d; };

  const shoot = async (id, route, kind, opts = {}) => {
    if (done.has(id)) { skipped++; return false; }
    const file = path.join(OUT, vpName, `${id}.jpg`);
    try {
      await page.screenshot({ path: file, type: 'jpeg', quality: 80, ...(opts.screenshot || {}) });
    } catch (e) {
      console.log(`  ✗ ${id}: shot failed ${String(e).split('\n')[0]}`);
      return false;
    }
    log({ id, vp: vpName, file, route, kind, state: opts.state || '', lang: opts.lang || '', url: page.url(), diag: diagSnapshot(), ts: Date.now() });
    done.add(id); // live-resume: a browser relaunch must skip what this process already shot
    captured++;
    await recycleIfNeeded();
    if (captured % 25 === 0) console.log(`  [${vpName}] ${captured} captured (+${skipped} skipped)`);
    return true;
  };

  /* ============ PHASE 1 — base captures (unauthenticated) ============ */
  for (const lang of LANGS) {
    for (const route of STATIC_ROUTES) {
      try {
        const pre = `${vpName}-${lang}-${slugify(route)}`;
        if (done.has(`${pre}-full`) && done.has(`${pre}-top`)) { skipped += 2; continue; } // whole route done
        diagSnapshot();
        await go(page, lang, route);
        const base = `${vpName}-${lang}-${slugify(route)}`;

        // full page
        await sweep(page);
        await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
        await page.waitForTimeout(250);
        await shoot(`${base}-full`, route, 'full', { lang, state: 'base' });

        // above-the-fold viewport
        await shoot(`${base}-top`, route, 'viewport', { lang, state: 'top', screenshot: vpName === 'mobile' ? { scale: 'device' } : {} });

        // segmented scroll shots for key routes
        if (SEGMENT_ROUTES.has(route)) {
          const info = await page.evaluate(() => ({ h: document.body.scrollHeight, vh: window.innerHeight }));
          const n = Math.min(MAX_SEGMENTS, Math.max(0, Math.ceil(info.h / (info.vh * 0.85)) - 1));
          for (let i = 1; i <= n; i++) {
            const y = Math.floor(i * info.vh * 0.85);
            await page.evaluate((yy) => window.scrollTo(0, yy), y).catch(() => {});
            await page.waitForTimeout(450);
            await shoot(`${base}-seg${i}`, route, 'segment', { lang, state: `scroll-${y}px`, screenshot: vpName === 'mobile' ? { scale: 'device' } : {} });
          }
          await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
        }
      } catch (e) {
        console.log(`  ✗ ${vpName}/${lang}${route}: ${String(e).split('\n')[0].slice(0, 120)}`);
      }
    }
  }

  // product detail pages
  for (const lang of LANGS) {
    for (const p of products) {
      try {
        const pre = `${vpName}-${lang}-p-${p.slug}`;
        if (done.has(`${pre}-full`)) { skipped++; continue; }
        diagSnapshot();
        await go(page, lang, `/products/${p.slug}`);
        const base = `${vpName}-${lang}-p-${p.slug}`;
        await sweep(page);
        await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
        await page.waitForTimeout(250);
        await shoot(`${base}-full`, `/products/${p.slug}`, 'full', { lang, state: 'base' });

        if (SEGMENT_PRODUCT_SLUGS.includes(p.slug)) {
          const info = await page.evaluate(() => ({ h: document.body.scrollHeight, vh: window.innerHeight }));
          const n = Math.min(MAX_SEGMENTS, Math.max(0, Math.ceil(info.h / (info.vh * 0.85)) - 1));
          for (let i = 1; i <= n; i++) {
            const y = Math.floor(i * info.vh * 0.85);
            await page.evaluate((yy) => window.scrollTo(0, yy), y).catch(() => {});
            await page.waitForTimeout(450);
            await shoot(`${base}-seg${i}`, `/products/${p.slug}`, 'segment', { lang, state: `scroll-${y}px`, screenshot: vpName === 'mobile' ? { scale: 'device' } : {} });
          }
          await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
        }
      } catch (e) {
        console.log(`  ✗ ${vpName}/${lang}/products/${p.slug}: ${String(e).split('\n')[0].slice(0, 120)}`);
      }
    }
  }

  /* ============ PHASE 2 — interactive states (light) ============ */
  for (const lang of LANGS) {
    const S = (k) => T[k][lang];

    // --- mobile menu open ---
    if (vpName === 'mobile') {
      try {
        diagSnapshot();
        await go(page, lang, '/');
        await page.click(`button[aria-label="${S('menu')}"]`, { timeout: 5000 });
        await page.waitForTimeout(800);
        await shoot(`${vpName}-${lang}-home-menustate`, '/', 'viewport', { lang, state: 'mobile-menu-open', screenshot: { scale: 'device' } });
        await page.click(`button[aria-label="${S('menu')}"]`, { timeout: 3000 }).catch(() => {});
        await page.keyboard.press('Escape').catch(() => {});
      } catch (e) { console.log(`  ✗ menustate ${lang}: ${String(e).split('\n')[0]}`); }
    }

    // --- language dropdown open (Globe) ---
    try {
      diagSnapshot();
      await go(page, lang, '/');
      await page.click('button:has(svg.lucide-globe)', { timeout: 5000 });
      await page.waitForTimeout(700);
      await shoot(`${vpName}-${lang}-home-langswitch`, '/', 'viewport', { lang, state: 'language-dropdown-open', screenshot: vpName === 'mobile' ? { scale: 'device' } : {} });
      await page.keyboard.press('Escape').catch(() => {});
    } catch (e) { console.log(`  ✗ langswitch ${lang}: ${String(e).split('\n')[0]}`); }

    // --- navbar scrolled state ---
    try {
      diagSnapshot();
      await go(page, lang, '/');
      await page.evaluate(() => window.scrollTo(0, 700));
      await page.waitForTimeout(500);
      await shoot(`${vpName}-${lang}-home-navscrolled`, '/', 'viewport', { lang, state: 'navbar-scrolled-700px', screenshot: vpName === 'mobile' ? { scale: 'device' } : {} });
    } catch (e) { console.log(`  ✗ navscrolled ${lang}: ${String(e).split('\n')[0]}`); }

    // --- footer bottom state ---
    try {
      diagSnapshot();
      await go(page, lang, '/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600);
      await shoot(`${vpName}-${lang}-home-footer`, '/', 'viewport', { lang, state: 'footer-bottom', screenshot: vpName === 'mobile' ? { scale: 'device' } : {} });
    } catch (e) { console.log(`  ✗ footer ${lang}: ${String(e).split('\n')[0]}`); }

    // --- products: category filter ---
    try {
      diagSnapshot();
      await go(page, lang, '/products');
      await page.click(`button:has-text("${S('lighting')}")`, { timeout: 5000 });
      await settle(page, 900);
      await shoot(`${vpName}-${lang}-products-filter-lighting`, '/products', 'full', { lang, state: 'filter-lighting' });
    } catch (e) { console.log(`  ✗ filter ${lang}: ${String(e).split('\n')[0]}`); }

    // --- products: search ---
    try {
      diagSnapshot();
      await go(page, lang, '/products');
      const ph = lang === 'ar' ? 'input[placeholder*="ابحث"]' : 'input[placeholder*="Search"]';
      await page.fill(ph, lang === 'ar' ? 'طاولة' : 'table', { timeout: 5000 });
      await settle(page, 1100);
      await shoot(`${vpName}-${lang}-products-search`, '/products', 'full', { lang, state: 'search-term' });
    } catch (e) { console.log(`  ✗ search ${lang}: ${String(e).split('\n')[0]}`); }

    // --- product: rental preset + add to cart + toast + badge ---
    try {
      diagSnapshot();
      await go(page, lang, '/products/gold-floor-lamp');
      await page.click(`button:has-text("${S('preset3')}")`, { timeout: 6000 });
      await page.waitForTimeout(1800); // availability check
      await shoot(`${vpName}-${lang}-product-preset3`, '/products/gold-floor-lamp', 'viewport', { lang, state: 'rental-preset-3days', screenshot: vpName === 'mobile' ? { scale: 'device' } : {} });
      await page.click(`button:has-text("${S('addToCart')}")`, { timeout: 6000 });
      await page.waitForTimeout(700); // toast
      await shoot(`${vpName}-${lang}-product-toast`, '/products/gold-floor-lamp', 'viewport', { lang, state: 'add-to-cart-toast', screenshot: vpName === 'mobile' ? { scale: 'device' } : {} });
      // cart filled (store is live — no reload needed)
      await go(page, lang, '/cart');
      await sweep(page);
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      await page.waitForTimeout(250);
      await shoot(`${vpName}-${lang}-cart-filled`, '/cart', 'full', { lang, state: 'cart-with-1-item' });
    } catch (e) { console.log(`  ✗ add2cart ${lang}: ${String(e).split('\n')[0]}`); }

    // --- checkout: validation errors (submit empty with item in cart) ---
    try {
      diagSnapshot();
      await go(page, lang, '/checkout');
      await page.click(`button:has-text("${S('confirmOrder')}")`, { timeout: 6000 });
      await page.waitForTimeout(900);
      await shoot(`${vpName}-${lang}-checkout-validation`, '/checkout', 'full', { lang, state: 'checkout-validation-errors' });
    } catch (e) { console.log(`  ✗ checkout-val ${lang}: ${String(e).split('\n')[0]}`); }

    // --- checkout: filled form ---
    try {
      diagSnapshot();
      await go(page, lang, '/checkout');
      const fillSafe = async (patterns, value) => {
        for (const sel of patterns) {
          try { await page.fill(sel, value, { timeout: 2500 }); return; } catch {}
        }
      };
      await fillSafe(
        ['input[placeholder*="الاسم الكامل"]', 'input[placeholder*="Full Name"]', 'input[name="name"]'],
        lang === 'ar' ? 'عبدالله الأحمد' : 'Abdullah Alahmad'
      );
      await fillSafe(['input[placeholder*="الهاتف"]', 'input[placeholder*="Phone"]', 'input[name="phone"]', 'input[type="tel"]'], '+965 99887766');
      await fillSafe(['input[placeholder*="البريد"]', 'input[placeholder*="Email"]', 'input[type="email"]'], 'audit@example.com');
      await fillSafe(['input[placeholder*="العنوان"]', 'input[placeholder*="Address"]', 'input[name="address"]'], lang === 'ar' ? 'السالمية، شارع 5' : 'Salmiya, Block 5');
      await fillSafe(['input[placeholder*="المدينة"]', 'input[placeholder*="City"]', 'input[name="city"]'], lang === 'ar' ? 'الكويت' : 'Kuwait City');
      await page.waitForTimeout(400);
      await shoot(`${vpName}-${lang}-checkout-filled`, '/checkout', 'full', { lang, state: 'checkout-form-filled' });
    } catch (e) { console.log(`  ✗ checkout-fill ${lang}: ${String(e).split('\n')[0]}`); }

    // --- contact: validation + filled ---
    try {
      diagSnapshot();
      await go(page, lang, '/contact');
      await page.click(`button:has-text("${S('send')}")`, { timeout: 5000 });
      await page.waitForTimeout(800);
      await shoot(`${vpName}-${lang}-contact-validation`, '/contact', 'full', { lang, state: 'contact-validation-errors' });
    } catch (e) { console.log(`  ✗ contact-val ${lang}: ${String(e).split('\n')[0]}`); }
    try {
      diagSnapshot();
      await go(page, lang, '/contact');
      const fillAll = async (value) => {
        const inputs = await page.locator('input:not([type="checkbox"]):not([type="radio"])').all();
        for (const inp of inputs) {
          try {
            const t = await inp.getAttribute('type');
            const v = t === 'email' ? 'audit@example.com' : t === 'tel' ? '+965 99887766' : value;
            await inp.fill(v, { timeout: 2500 });
          } catch {}
        }
        const tas = await page.locator('textarea').all();
        for (const ta of tas) { try { await ta.fill(lang === 'ar' ? 'هذه رسالة تجريبية طويلة بما يكفي لتجاوز الحد الأدنى المطلوب للتحقق من صحة النموذج.' : 'This is a long enough test message to pass the minimum length validation of the form.', { timeout: 2500 }); } catch {} }
      };
      await fillAll(lang === 'ar' ? 'اختبار' : 'Audit Test');
      await page.waitForTimeout(400);
      await shoot(`${vpName}-${lang}-contact-filled`, '/contact', 'full', { lang, state: 'contact-form-filled' });
    } catch (e) { console.log(`  ✗ contact-fill ${lang}: ${String(e).split('\n')[0]}`); }

    // --- payment: validation (pay button without card data, if reachable) ---
    try {
      diagSnapshot();
      await go(page, lang, '/checkout/payment');
      const btn = page.locator('button[type="submit"]').first();
      await btn.click({ timeout: 4000 });
      await page.waitForTimeout(700);
      await shoot(`${vpName}-${lang}-payment-validation`, '/checkout/payment', 'full', { lang, state: 'payment-validation' });
    } catch (e) { console.log(`  ✗ payment ${lang}: ${String(e).split('\n')[0].slice(0, 90)}`); }
  }

  // --- hover states (PC only) ---
  if (vpName === 'pc') {
    for (const lang of LANGS) {
      try {
        diagSnapshot();
        await go(page, lang, '/products');
        await page.waitForTimeout(600);
        const card = page.locator('a[href*="#/ar/products/"], a[href*="#/en/products/"]').first();
        await card.hover({ timeout: 5000 });
        await page.waitForTimeout(600);
        await shoot(`pc-${lang}-products-hover-card`, '/products', 'viewport', { lang, state: 'hover-product-card' });
      } catch (e) { console.log(`  ✗ hover ${lang}: ${String(e).split('\n')[0]}`); }
    }
  }

  // --- dark mode (PC + mobile) ---
  for (const lang of LANGS) {
    try {
      diagSnapshot();
      await go(page, lang, '/');
      await page.click(`button[aria-label="${T.theme[lang]}"]`, { timeout: 5000 });
      await page.waitForTimeout(900);
      for (const route of ['/', '/products', '/cart', '/admin']) {
        try {
          await go(page, lang, route);
          await sweep(page);
          await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
          await page.waitForTimeout(250);
          await shoot(`${vpName}-${lang}-${slugify(route)}-dark`, route, 'full', { lang, state: 'dark-mode' });
        } catch (e) { console.log(`  ✗ dark ${route}: ${String(e).split('\n')[0].slice(0, 90)}`); }
      }
      // back to light
      await go(page, lang, '/');
      await page.click(`button[aria-label="${T.theme[lang]}"]`, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
    } catch (e) { console.log(`  ✗ dark ${lang}: ${String(e).split('\n')[0]}`); }
  }

  /* ============ PHASE 3 — admin (gate error → login → authed states) ============ */
  // gate error — only PC to avoid tripping the login rate-limiter
  if (vpName === 'pc') {
    for (const lang of LANGS) {
      try {
        diagSnapshot();
        await go(page, lang, '/admin');
        await page.fill('input[type="password"]', 'definitely-wrong-pw', { timeout: 6000 });
        await page.click(`button:has-text("${T.login[lang]}")`, { timeout: 5000 });
        await page.waitForTimeout(1400);
        await shoot(`pc-${lang}-admin-gate-error`, '/admin', 'full', { lang, state: 'admin-gate-wrong-password' });
      } catch (e) { console.log(`  ✗ gate-error ${lang}: ${String(e).split('\n')[0]}`); }
    }
  }

  // login (sets cookie in this context)
  try {
    diagSnapshot();
    await go(page, 'ar', '/');
    const status = await page.evaluate(async (pw) => {
      const r = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      return r.status;
    }, ADMIN_PW);
    console.log(`  [${vpName}] admin login → ${status}`);
    if (status !== 200) throw new Error('admin login failed');
  } catch (e) { console.log(`  ✗ admin login: ${String(e).split('\n')[0]}`); }

  for (const lang of LANGS) {
    // admin overview + tab states
    try {
      diagSnapshot();
      await go(page, lang, '/admin');
      await page.waitForTimeout(1600); // stats + panels fetch
      await sweep(page);
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      await page.waitForTimeout(300);
      await shoot(`${vpName}-${lang}-admin-authed`, '/admin', 'full', { lang, state: 'admin-authed-overview' });
      // tabs
      const tabTexts = lang === 'ar'
        ? ['الطلبات والحجوزات', 'الرسائل', 'المنتجات']
        : ['Orders & Bookings', 'Messages', 'Products'];
      for (const tt of tabTexts) {
        try {
          await page.click(`[role="tab"]:has-text("${tt}")`, { timeout: 5000 });
          await settle(page, 1300);
          await shoot(`${vpName}-${lang}-admin-tab-${slugify(tt)}`, '/admin', 'full', { lang, state: `admin-tab-${tt}` });
        } catch (e) { console.log(`  ✗ tab ${tt}: ${String(e).split('\n')[0].slice(0, 80)}`); }
      }
    } catch (e) { console.log(`  ✗ admin ${lang}: ${String(e).split('\n')[0]}`); }

    // brand admin pages + their tabs
    for (const [route, name] of [['/admin/lut', 'lut'], ['/admin/la-lounge', 'lalounge'], ['/admin/birthday', 'birthday']]) {
      try {
        diagSnapshot();
        await go(page, lang, route);
        await page.waitForTimeout(1600);
        await sweep(page);
        await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
        await page.waitForTimeout(300);
        await shoot(`${vpName}-${lang}-admin-${name}-authed`, route, 'full', { lang, state: `admin-${name}-authed` });
        const tabs = await page.locator('[role="tab"]').all();
        let ti = 0;
        for (const tab of tabs) {
          ti++;
          try {
            await tab.click({ timeout: 4000 });
            await settle(page, 1300);
            await shoot(`${vpName}-${lang}-admin-${name}-tab${ti}`, route, 'full', { lang, state: `admin-${name}-tab-${ti}` });
          } catch {}
        }
      } catch (e) { console.log(`  ✗ brand ${name} ${lang}: ${String(e).split('\n')[0].slice(0, 90)}`); }
    }

    // new-product dialog (open then close — no save)
    try {
      diagSnapshot();
      await go(page, lang, '/admin');
      await page.click(`[role="tab"]:has-text("${lang === 'ar' ? 'المنتجات' : 'Products'}")`, { timeout: 6000 });
      await page.waitForTimeout(1300);
      await page.click(`button:has-text("${T.newProduct[lang]}")`, { timeout: 6000 });
      await page.waitForTimeout(1400);
      await shoot(`${vpName}-${lang}-admin-newproduct-dialog`, '/admin', 'viewport', { lang, state: 'admin-new-product-dialog-open' });
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(600);
    } catch (e) { console.log(`  ✗ dialog ${lang}: ${String(e).split('\n')[0]}`); }
  }

  await ctx.close();
}

/* ---------------- main ---------------- */
(async () => {
  const products = (await (await fetch(`${BASE}/api/products?limit=100`)).json()).products.map((p) => ({ slug: p.slug, brand: p.brand }));
  console.log(`Products: ${products.length} | already done: ${done.size}`);

  const LAUNCH_ARGS = [
    '--disable-dev-shm-usage', // 64MB /dev/shm in this container — mandatory
    '--disable-gpu',
    '--use-angle=swiftshader', // software WebGL for the 3D scenes
    '--no-sandbox',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--force-color-profile=srgb',
    '--js-flags=--max-old-space-size=768',
    '--disable-features=CalculateNativeWinOcclusion',
  ];

  // Sequential per-viewport with self-relaunching resilience (RAM is tight).
  for (const vpName of ['pc', 'mobile']) {
    for (let attempt = 1; attempt <= 12; attempt++) {
      const before = captured;
      const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
      try {
        await runWorker(browser, vpName, products);
      } finally {
        await browser.close().catch(() => {});
      }
      const advanced = captured - before;
      console.log(`[${vpName}] attempt ${attempt}: +${advanced} shots`);
      if (advanced === 0) break; // queue exhausted for this viewport
    }
  }
  console.log(`DONE — captured: ${captured}, skipped(resume): ${skipped}, total new+old: ${done.size + captured}`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
