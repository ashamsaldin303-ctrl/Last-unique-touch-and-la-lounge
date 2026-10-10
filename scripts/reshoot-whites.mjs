import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const sharp = require('sharp');

const AUD = '/home/z/my-project/agent-ctx/audit';
const shots = fs.readFileSync(AUD + '/manifest.jsonl', 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean);
const forensics = JSON.parse(fs.readFileSync(AUD + '/pixel-forensics.json', 'utf8'));
const targets = forensics.findings.filter(f => f.issues.some(i => i.kind === 'white-frame' || i.kind === 'tiny-file'));
console.log('reshooting', targets.length, 'blank shots');

const VPS = { pc: { width: 1920, height: 1080, dsf: 1 }, mobile: { width: 375, height: 812, dsf: 2 } };
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage','--disable-gpu','--no-sandbox','--js-flags=--max-old-space-size=768'] });
let fixed = 0;
for (const t of targets) {
  const s = shots.find(x => x.id === t.id);
  if (!s) continue;
  const vp = VPS[s.vp];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dsf, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    const hash = `#/${s.lang}${s.route === '/' ? '' : s.route}`;
    await page.goto('http://localhost:3000/' + hash, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    // scroll to the segment offset if a segment shot
    if (s.kind === 'segment') {
      const segIndex = parseInt((s.id.match(/seg(\d+)/) || [])[1] || '1', 10);
      await page.evaluate((i) => window.scrollTo(0, (i - 1) * window.innerHeight * 0.85), segIndex);
      await page.waitForTimeout(1500);
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: s.file, type: 'jpeg', quality: s.vp === 'mobile' ? 78 : 82 });
    const stats = await sharp(s.file).greyscale().resize(64, 64, { fit: 'fill' }).stats();
    const mean = stats.channels[0].mean, stdev = stats.channels[0].stdev;
    if (mean > 250 && stdev < 3) console.log('  STILL WHITE:', s.id);
    else { fixed++; console.log('  fixed', s.id, `mean=${mean.toFixed(0)} stdev=${stdev.toFixed(0)}`); }
  } catch (e) { console.log('  FAIL', s.id, String(e).split('\n')[0].slice(0, 80)); }
  await ctx.close();
}
await browser.close();
console.log('RESHOOT DONE — fixed', fixed, '/', targets.length);
