import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage','--disable-gpu','--no-sandbox'] });
for (const [vp, w, h] of [['pc', 1920, 1080], ['mobile', 375, 812]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  for (const route of ['/en/last-unique-touch', '/ar/last-unique-touch', '/en', '/ar']) {
    await page.goto('http://localhost:3000/#' + route, { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => ({
      pageOverflowX: document.scrollingElement.scrollWidth - document.documentElement.clientWidth,
      bodyScrollable: !!document.scrollingElement.scrollWidth,
      railCount: document.querySelectorAll('[class*="rail"], [class*="marquee"]').length,
    }));
    console.log(vp, route, '→ pageOverflowX:', r.pageOverflowX + 'px');
  }
  await page.close();
}
await browser.close();
