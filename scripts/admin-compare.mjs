import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage','--disable-gpu','--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
// login first
await page.goto('http://localhost:3000/#/ar/admin', { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
await page.fill('input[type="password"]', 'Maison-Admin-2025!', { timeout: 10000 }).catch(()=>{});
await page.click('button[type="submit"]', { timeout: 8000 }).catch(()=>{});
await page.waitForTimeout(3000);
const extract = async (route) => {
  await page.goto('http://localhost:3000/#/ar' + route, { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
  await page.waitForTimeout(3500);
  return {
    docH: await page.evaluate(() => document.documentElement.scrollHeight),
    h1: await page.locator('h1').first().textContent().catch(() => null),
    kpis: await page.evaluate(() => {
      const els = [...document.querySelectorAll('h2,h3,[class*="kpi"],[class*="stat"],[class*="card"]')];
      return els.slice(0, 18).map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)).filter(Boolean);
    }),
    tabs: await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t => (t.textContent||'').trim())),
    title: await page.title(),
  };
};
for (const r of ['/admin', '/admin/lut', '/admin/la-lounge', '/admin/birthday']) {
  const d = await extract(r);
  console.log('=== ' + r + ' (docH=' + d.docH + ')');
  console.log('  h1:', JSON.stringify(d.h1));
  console.log('  tabs:', JSON.stringify(d.tabs));
  console.log('  kpi-samples:', JSON.stringify(d.kpis.slice(0, 10)));
}
await browser.close();
