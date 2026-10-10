#!/usr/bin/env node
/**
 * TASK 40 — Pixel-level forensics over every captured screenshot (no API).
 * Detects:
 *   1. blank / near-blank renders (mean luminance extremes, ultra-low variance)
 *   2. fully-black or fully-white images (rendering failures)
 *   3. suspicious tiny files (empty/failed writes)
 *   4. exact duplicate images across DIFFERENT shot ids (state failures —
 *      e.g. an interaction that had no visual effect)
 *   5. torn/truncated JPEGs
 * Output: agent-ctx/audit/pixel-forensics.json
 * Run: node scripts/pixel-forensics.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = '/home/z/my-project';
const AUD = path.join(ROOT, 'agent-ctx/audit');
const OUT = path.join(AUD, 'pixel-forensics.json');

const shots = [];
for (const line of fs.readFileSync(path.join(AUD, 'manifest.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { shots.push(JSON.parse(line)); } catch {}
}
console.log(`pixel forensics over ${shots.length} shots`);

const findings = [];
const hashGroups = new Map(); // fileHash → [shotIds]

for (let i = 0; i < shots.length; i++) {
  const s = shots[i];
  const stat = fs.statSync(s.file);
  const issues = [];

  // 3. tiny files
  if (stat.size < 8000) issues.push({ kind: 'tiny-file', detail: `${stat.size}B` });

  // 1/2. luminance stats via sharp (downscale for speed)
  let stats = null;
  try {
    stats = await sharp(s.file)
      .greyscale()
      .resize(64, 64, { fit: 'fill' })
      .stats();
  } catch (e) {
    issues.push({ kind: 'undecodable', detail: String(e.message || e).slice(0, 120) });
  }

  if (stats) {
    const { mean, stdev } = stats.channels[0];
    if (mean < 4 && stdev < 2) issues.push({ kind: 'black-frame', detail: `mean=${mean.toFixed(1)}` });
    else if (mean > 252 && stdev < 2) issues.push({ kind: 'white-frame', detail: `mean=${mean.toFixed(1)}` });
    else if (stdev < 3.5) issues.push({ kind: 'near-blank', detail: `stdev=${stdev.toFixed(1)} mean=${mean.toFixed(1)}` });
  }

  // 4. content hash for duplicate detection (raw pixels, ignores metadata)
  try {
    const raw = await sharp(s.file).greyscale().resize(96, 96, { fit: 'fill' }).raw().toBuffer();
    const h = crypto.createHash('md5').update(raw).digest('hex');
    if (!hashGroups.has(h)) hashGroups.set(h, []);
    hashGroups.get(h).push(s.id);
  } catch {
    /* undecodable already flagged */
  }

  if (issues.length) findings.push({ id: s.id, file: s.file, route: s.route, lang: s.lang, vp: s.vp, state: s.state || 'base', kind: s.kind, issues });
  if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${shots.length} processed`);
}

// duplicate groups = same pixels but different shot ids (exclude legit
// full-vs-full duplicates when route+state identical — those are resume dupes)
const duplicates = [];
for (const [h, ids] of hashGroups) {
  if (ids.length < 2) continue;
  const meta = ids.map((id) => shots.find((s) => s.id === id)).filter(Boolean);
  const keyOf = (s) => `${s.route}|${s.lang}|${s.vp}|${s.state || 'base'}|${s.kind}`;
  const keys = new Set(meta.map(keyOf));
  if (keys.size < 2) continue; // same logical shot captured twice → resume artifact
  duplicates.push({ hash: h.slice(0, 10), ids, distinctLogicalStates: keys.size });
}

fs.writeFileSync(OUT, JSON.stringify({
  total: shots.length,
  findings,
  duplicates,
  generatedAt: new Date().toISOString(),
}, null, 2));
console.log(`DONE: ${findings.length} flagged shots, ${duplicates.length} duplicate groups → ${OUT}`);
