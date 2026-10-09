/**
 * TASK 40 — Aggregate per-image VLM analysis + capture diagnostics into the
 * final error report (ERROR-REPORT.md + errors.json).
 * Run: bun scripts/aggregate-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/z/my-project';
const AUD = path.join(ROOT, 'agent-ctx/audit');

const shots = [];
for (const line of fs.readFileSync(path.join(AUD, 'manifest.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { shots.push(JSON.parse(line)); } catch {}
}
const analyses = {};
for (const line of fs.readFileSync(path.join(AUD, 'analysis.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { const a = JSON.parse(line); analyses[a.id] = a; } catch {}
}

/* ---------- console / network diagnostics ---------- */
const diagMap = new Map(); // diagString -> {count, pages:Set}
for (const s of shots) {
  for (const d of s.diag || []) {
    if (!diagMap.has(d)) diagMap.set(d, { count: 0, pages: new Set(), langs: new Set() });
    const e = diagMap.get(d);
    e.count++;
    e.pages.add(s.route);
    e.langs.add(s.lang);
  }
}

/* ---------- issue aggregation with fuzzy dedup ---------- */
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF ]/g, ' ').replace(/\s+/g, ' ').trim();
const issues = [];
let passCount = 0, failCount = 0, failedAnalysis = 0;

for (const s of shots) {
  const a = analyses[s.id];
  if (!a) continue;
  if (!a.ok) { failedAnalysis++; continue; }
  if (a.pass && (!a.errors || a.errors.length === 0)) { passCount++; continue; }
  failCount++;
  for (const err of a.errors || []) {
    const sev = ['critical', 'major', 'minor'].includes(err.severity) ? err.severity : 'minor';
    issues.push({
      sev, type: err.type || 'other', desc: err.desc || '', location: err.location || '',
      shot: s.id, file: s.file, route: s.route, lang: s.lang, vp: s.vp, kind: s.kind, state: s.state || 'base',
    });
  }
}

// group similar issues: same severity + type + normalized desc similarity
const groups = [];
for (const iss of issues) {
  const key = `${iss.sev}|${iss.type}|${norm(iss.desc).slice(0, 70)}`;
  const g = groups.find((x) => x.key === key || (x.sev === iss.sev && x.type === iss.type && norm(x.desc).slice(0, 70) === norm(iss.desc).slice(0, 70)));
  if (g) { g.occurrences.push(iss); } else { groups.push({ key: `${iss.sev}|${iss.type}`, sev: iss.sev, type: iss.type, desc: iss.desc, occurrences: [iss] }); }
}
groups.sort((a, b) => {
  const w = { critical: 0, major: 1, minor: 2 };
  return w[a.sev] - w[b.sev] || b.occurrences.length - a.occurrences.length;
});

/* ---------- coverage matrix ---------- */
const routes = [...new Set(shots.map((s) => s.route))].sort();
const cov = routes.map((r) => {
  const rs = shots.filter((s) => s.route === r);
  return {
    route: r,
    pc: rs.filter((s) => s.vp === 'pc').length,
    mobile: rs.filter((s) => s.vp === 'mobile').length,
    ar: rs.filter((s) => s.lang === 'ar').length,
    en: rs.filter((s) => s.lang === 'en').length,
    states: [...new Set(rs.map((s) => s.state).filter(Boolean))],
  };
});

const total = shots.length;
const analyzed = Object.keys(analyses).length;
const sevCount = { critical: 0, major: 0, minor: 0 };
for (const g of groups) sevCount[g.sev]++;

const fmtList = (arr, max = 12) => arr.slice(0, max).map((x) => `- ${x}`).join('\n') + (arr.length > max ? `\n- … +${arr.length - max} more` : '');

/* ---------- markdown report ---------- */
const md = [];
md.push('# 🔍 LUT Luxury — Full-Site Visual Audit Report (Task 40)');
md.push(`\n**Generated:** ${new Date().toISOString()}`);
md.push(`\n## Executive Summary`);
md.push(`- Screenshots captured: **${total}** (PC: ${shots.filter((s) => s.vp === 'pc').length} · Mobile: ${shots.filter((s) => s.vp === 'mobile').length}) across **${routes.length} routes** × 2 languages (ar/en) × multiple states`);
md.push(`- Analyzed by VLM image-by-image: **${analyzed}/${total}** — clean: **${passCount}**, with findings: **${failCount}**${failedAnalysis ? `, analysis-failed: ${failedAnalysis}` : ''}`);
md.push(`- Unique issue groups: **${groups.length}** — 🔴 critical: ${sevCount.critical} · 🟠 major: ${sevCount.major} · 🟡 minor: ${sevCount.minor}`);
md.push(`- Browser diagnostics (console/network errors observed during capture): **${diagMap.size}** unique entries`);

for (const sev of ['critical', 'major', 'minor']) {
  const gs = groups.filter((g) => g.sev === sev);
  if (!gs.length) { md.push(`\n## ${sev === 'critical' ? '🔴' : sev === 'major' ? '🟠' : '🟡'} ${sev.toUpperCase()} issues\n\nNone. ✅`); continue; }
  md.push(`\n## ${sev === 'critical' ? '🔴' : sev === 'major' ? '🟠' : '🟡'} ${sev.toUpperCase()} issues (${gs.length})`);
  gs.forEach((g, i) => {
    const occ = g.occurrences;
    const pages = [...new Set(occ.map((o) => `${o.route} [${o.vp}/${o.lang}${o.state && o.state !== 'base' && o.state !== 'top' ? `, ${o.state}` : ''}]`))];
    md.push(`\n### ${sev.toUpperCase()}-${i + 1} · ${g.type} — ×${occ.length} occurrence${occ.length > 1 ? 's' : ''}`);
    md.push(`**Description:** ${g.desc}`);
    if (g.occurrences[0].location) md.push(`**Location:** ${g.occurrences[0].location}`);
    md.push(`**Affected:**\n${fmtList(pages)}`);
    md.push(`**Example screenshots:**\n${fmtList(occ.map((o) => `${o.file}`), 4)}`);
  });
}

if (diagMap.size) {
  md.push(`\n## 🖥️ Browser Console / Network Errors (live capture)`);
  for (const [d, e] of [...diagMap.entries()].sort((a, b) => b[1].count - a[1].count)) {
    md.push(`- \`${d}\` — ×${e.count} (routes: ${[...e.pages].slice(0, 5).join(', ')}${e.pages.size > 5 ? '…' : ''})`);
  }
}

md.push(`\n## 📊 Coverage Matrix`);
md.push(`\n| Route | PC | Mobile | ar | en | States |\n|---|---|---|---|---|---|`);
for (const c of cov) md.push(`| ${c.route} | ${c.pc} | ${c.mobile} | ${c.ar} | ${c.en} | ${c.states.slice(0, 6).join(', ')}${c.states.length > 6 ? '…' : ''} |`);

fs.writeFileSync(path.join(AUD, 'ERROR-REPORT.md'), md.join('\n'));
fs.writeFileSync(path.join(AUD, 'errors.json'), JSON.stringify({ total, analyzed, passCount, failCount, failedAnalysis, sevCount, groups, diag: [...diagMap.entries()].map(([d, e]) => ({ msg: d, count: e.count, pages: [...e.pages] })), coverage: cov }, null, 2));
console.log(`Report written: ${total} shots, ${analyzed} analyzed, ${groups.length} issue groups (c:${sevCount.critical} m:${sevCount.major} n:${sevCount.minor}), ${diagMap.size} diag entries.`);
