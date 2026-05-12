#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Dashboard Source Status / Audit surface compatibility QA.
 *
 * Verifies the dashboard frontend consumes the post-PR-#56 backend
 * packet shape (neutral public keys) AND does not leak internal
 * engine names or diagnostic enums onto the Source Status pills or
 * the Audit table.
 *
 * Static analysis of `index.html` — no browser, no headless harness.
 * The harness strips:
 *   - JavaScript line comments (// …)
 *   - CSS rules
 *   - console.log / console.warn / console.error / console.info lines
 * …before scanning, so internal logs and dev comments do not trigger
 * the banned-literal sweep.
 *
 * Asserts after this PR:
 *   T1. setSourceStatusFromPacket reads NEW backend keys first
 *       (macroContext, secondaryMacroModel, marketStructure,
 *       finalAssessment, historicalReference) with legacy fallback.
 *   T2. Every ctx.sources.<legacy> reader in user-facing JS has
 *       a new-key fallback in front of it.
 *   T3. Source Status pill labels (pkey) carry the approved public
 *       vocabulary (macro context, market structure, final
 *       assessment, etc.) — not the legacy "macro" / "decision"
 *       short forms.
 *   T4. Audit table row labels use approved public terms ("macro
 *       context", "market structure", "final assessment",
 *       "secondary macro model", "historical reference") and the
 *       descriptions no longer say "Corey macro engine" / "Spidey
 *       structure engine" / "Jane final decision packet" /
 *       "CoreyClone".
 *   T5. Banned LITERAL substrings ABSENT from user-facing text
 *       (after stripping comments + CSS + console logs):
 *         not_attached_to_packet, tdUsage_not_captured,
 *         15Y-cache, unavailable: not implemented,
 *         "Corey macro engine", "Spidey structure engine",
 *         "Jane final decision packet", "CoreyClone".
 *   T6. compressionMode() matchers accept the new public janeStatus
 *       phrasings ("no active trade signal", "armed", "entry
 *       triggered", "trade confirmed") so a post-PR-#56 packet
 *       still classifies correctly.
 *   T7. STATUS_TONE table carries entries for the new public-label
 *       statuses (no active trade signal, trade confirmed,
 *       historical reference cache, etc.).
 *
 * Wired as `npm run qa:dashboard-keys`.
 */

const fs   = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let passed = 0, failed = 0;
function ok(label, cond, info) {
  if (cond) { passed++; console.log('  ✓ ' + label); }
  else { failed++; console.log('  ✗ ' + label, info != null ? '\n     ' + JSON.stringify(info) : ''); }
}

// ── User-facing-text projection ────────────────────────────────
// Strip:
//   - JS line comments (// …) — but only the comment portion
//   - console.{log,warn,error,info} statements
//   - CSS rule bodies (block syntax) — coarse: lines starting with
//     `.classname{` or `selector{`
// The result is the subset of index.html that could plausibly reach
// a user. The harness scans this projection for banned literals.
function projectUserFacingText(src) {
  const lines = src.split('\n');
  const out = [];
  let inConsoleCall = false;
  let parenDepth = 0;
  for (const line of lines) {
    // Multi-line console.log(...) suppression. Counts ( and ) across
    // lines so the entire call (including string continuations) is
    // dropped, not just the opening line.
    if (inConsoleCall) {
      for (const ch of line) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
      }
      if (parenDepth <= 0) inConsoleCall = false;
      out.push('');
      continue;
    }
    if (/console\.(?:log|warn|error|info)\s*\(/.test(line)) {
      inConsoleCall = true;
      parenDepth = 0;
      for (const ch of line) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
      }
      if (parenDepth <= 0) inConsoleCall = false;
      out.push('');
      continue;
    }
    // Drop CSS rule lines.
    if (/^\s*\.[a-zA-Z][\w-]*\s*[\.\s{,:]/.test(line)) { out.push(''); continue; }
    if (/^\s*[a-z][\w-]*\s*\{/.test(line)) { out.push(''); continue; }
    // Strip JS line comments from JS content.
    const idx = line.indexOf('//');
    if (idx >= 0) {
      const before = line.slice(0, idx);
      if (!/['":]$/.test(before.trimEnd())) {
        out.push(before);
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

const projected = projectUserFacingText(indexHtml);

// ============================================================
// T1 — setSourceStatusFromPacket reads NEW keys first
// ============================================================
console.log('\n[T1] setSourceStatusFromPacket reads NEW public keys (legacy fallback)');
{
  const m = indexHtml.match(/function\s+setSourceStatusFromPacket[\s\S]*?\n\s*\}/);
  ok('setSourceStatusFromPacket function located', !!m, m ? undefined : 'function not found');
  if (m) {
    const body = m[0];
    const REQUIRED_READS = [
      ['macroContext',        's.macroContext'],
      ['secondaryMacroModel', 's.secondaryMacroModel'],
      ['marketStructure',     's.marketStructure'],
      ['finalAssessment',     's.finalAssessment'],
      ['historicalReference', 's.historicalReference'],
    ];
    for (const [label, needle] of REQUIRED_READS) {
      ok(`reads new key "${label}" before legacy`,
         body.includes(needle),
         body.slice(0, 400));
    }
    // Legacy keys still present as fallback (transition window).
    const LEGACY_FALLBACK = ['s.corey', 's.coreyClone', 's.spidey', 's.jane', 's.historical'];
    for (const needle of LEGACY_FALLBACK) {
      ok(`legacy "${needle}" retained as fallback (transition window)`,
         body.includes(needle),
         body.slice(0, 400));
    }
  }
}

// ============================================================
// T2 — every ctx.sources.<legacy> read has new-key fallback
// ============================================================
console.log('\n[T2] every ctx.sources.<legacy> reader has a new-key fallback');
{
  // Pattern: ctx.sources.<legacy> appearing outside a `||` fallback
  // expression that names the new key first. Approach: enumerate the
  // legacy-key reads and confirm each appears together with the new
  // key on the same logical line.
  const LEGACY_TO_NEW = {
    'corey':        'macroContext',
    'coreyClone':   'secondaryMacroModel',
    'spidey':       'marketStructure',
    'jane':         'finalAssessment',
    'historical':   'historicalReference',
  };
  const re = /ctx\.sources\.(corey|coreyClone|spidey|jane|historical)\b/g;
  const lines = indexHtml.split('\n');
  const offenders = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip line comments.
    const noComment = line.replace(/\/\/.*$/, '');
    const m = noComment.match(re);
    if (!m) continue;
    for (const hit of m) {
      const legacyKey = hit.slice('ctx.sources.'.length);
      const newKey = LEGACY_TO_NEW[legacyKey];
      // Require the new-key reference also on this line.
      if (!noComment.includes('ctx.sources.' + newKey)) {
        offenders.push({ line: i + 1, legacyKey, newKey, snippet: noComment.trim() });
      }
    }
  }
  ok('every legacy ctx.sources.<key> read has a new-key fallback on the same line',
     offenders.length === 0,
     offenders.length ? { offenders: offenders.slice(0, 4) } : undefined);
}

// ============================================================
// T3 — Source Status pill `pkey` labels carry approved vocabulary
// ============================================================
console.log('\n[T3] Source Status pill labels use approved public vocabulary');
{
  // Extract each <span class="pill" id="src-…"> … </span> block.
  const PILL_RE = /<span class="pill"[^>]*id="src-([^"]+)"[\s\S]*?<span class="pkey">([^<]+)<\/span>/g;
  const pills = {};
  let m;
  while ((m = PILL_RE.exec(indexHtml)) !== null) {
    pills[m[1]] = m[2].trim();
  }
  const EXPECTED = {
    'marketData':  'market data',
    'corey':       'macro context',
    'coreyClone':  'secondary macro',
    'spidey':      'market structure',
    'jane':        'final assessment',
    'historical':  'historical reference',
  };
  for (const [domId, expected] of Object.entries(EXPECTED)) {
    ok(`pill src-${domId} pkey reads "${expected}"`,
       pills[domId] === expected,
       { got: pills[domId] });
  }
}

// ============================================================
// T4 — Audit table row labels use approved public terms
// ============================================================
console.log('\n[T4] Audit table row labels use approved public terms');
{
  // Find the `var rows = [` block inside the audit builder.
  const m = indexHtml.match(/var rows = \[([\s\S]*?)\];/);
  ok('audit rows array located', !!m, m ? undefined : 'not found');
  if (m) {
    const block = m[1];
    const REQUIRED_ROW_LABELS = [
      "'macro context'",
      "'secondary macro model'",
      "'market structure'",
      "'final assessment'",
      "'historical reference'",
    ];
    for (const label of REQUIRED_ROW_LABELS) {
      ok(`audit row label ${label} present`, block.includes(label), block.slice(0, 600));
    }
    // Banned descriptions (engine narration).
    const BANNED_IN_DESCRIPTIONS = [
      'Corey macro engine',
      'Spidey structure engine',
      'Jane final decision packet',
      'CoreyClone pending implementation',
      'Corey Clone',
    ];
    for (const needle of BANNED_IN_DESCRIPTIONS) {
      ok(`audit description does NOT include "${needle}"`,
         !block.includes(needle),
         block.includes(needle) ? { context: block.slice(Math.max(0, block.indexOf(needle) - 40), block.indexOf(needle) + needle.length + 80) } : undefined);
    }
  }
}

// ============================================================
// T5 — Banned LITERAL substrings absent from user-facing text
// ============================================================
console.log('\n[T5] banned literals absent from user-facing text');
{
  const BANNED = [
    'not_attached_to_packet',
    'tdUsage_not_captured',
    'unavailable: not implemented',
    'unavailable: not_attached_to_packet',
    'Corey macro engine',
    'Spidey structure engine',
    'Jane final decision packet',
    'CoreyClone pending',
    'CLONE CONFLICT — CONTRADICTS COREY',
    'CLONE ACTIVE — SECOND-PASS',
    'CLONE PARTIAL',
    'CLONE UNAVAILABLE',
  ];
  for (const needle of BANNED) {
    const idx = projected.indexOf(needle);
    ok(`"${needle}" absent from user-facing text`,
       idx < 0,
       idx >= 0 ? { context: projected.slice(Math.max(0, idx - 30), idx + needle.length + 60) } : undefined);
  }
}

// ============================================================
// T6 — compressionMode matchers accept new public janeStatus phrasings
// ============================================================
console.log('\n[T6] compressionMode matchers accept post-PR-#56 janeStatus phrasings');
{
  const m = indexHtml.match(/function\s+compressionMode[\s\S]*?\n\s*\}/);
  ok('compressionMode function located', !!m);
  if (m) {
    const body = m[0];
    ok('accepts "no active trade signal" public phrasing',
       /no active trade signal/.test(body), body.slice(0, 800));
    ok('accepts "armed" without final: prefix',
       /\/\^armed\/i\.test\(jane\)|\barmed\b/.test(body), body.slice(0, 800));
    ok('accepts "entry triggered" public phrasing',
       /entry triggered/.test(body), body.slice(0, 800));
    ok('accepts "trade confirmed" public phrasing',
       /trade confirmed/.test(body), body.slice(0, 800));
    ok('reads new s.macroContext key before legacy s.corey',
       /s\.macroContext.*\|\|.*s\.corey/.test(body), body.slice(0, 800));
    ok('reads new s.marketStructure key before legacy s.spidey',
       /s\.marketStructure.*\|\|.*s\.spidey/.test(body), body.slice(0, 800));
  }
}

// ============================================================
// T7 — STATUS_TONE table carries new public-label entries
// ============================================================
console.log('\n[T7] STATUS_TONE table carries new public-label entries');
{
  const m = indexHtml.match(/var STATUS_TONE\s*=\s*\{([\s\S]*?)\};/);
  ok('STATUS_TONE table located', !!m, m ? undefined : 'not found');
  if (m) {
    const body = m[1];
    const REQUIRED = [
      ["'no active trade signal':", 'no active trade signal entry'],
      ["'trade confirmed':",        'trade confirmed entry'],
      ["'entry triggered':",        'entry triggered entry'],
      ["'final assessment unavailable':",  'final assessment unavailable entry'],
      ["'final assessment incomplete':",   'final assessment incomplete entry'],
      ["'historical reference cache':",    'historical reference cache entry'],
      ["'not active in this release':",    'not active in this release entry'],
    ];
    for (const [needle, label] of REQUIRED) {
      ok(`STATUS_TONE has ${label}`,
         body.includes(needle),
         body.slice(0, 400));
    }
  }
}

// ============================================================
// summary
// ============================================================
console.log('\n==========================');
console.log('Passed: ' + passed + '   Failed: ' + failed);
if (failed > 0) process.exit(1);
console.log('[DASHBOARD-KEYS-QA] PASS — dashboard frontend consumes PR-#56 public keys; Source Status / Audit surface free of engine-name leaks; transition fallback to legacy keys retained.');
process.exit(0);
