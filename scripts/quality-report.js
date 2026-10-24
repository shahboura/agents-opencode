#!/usr/bin/env node
'use strict';

/**
 * Read-only quality report: commit shape (medians, fix ratio) over the last
 * COMMIT_WINDOW commits, the last recorded gate pass with per-lens findings
 * (from .gate/lens-<name>.md, so missing evidence says so), freeze -> pass time.
 * Writes nothing, no deps, exits 0 when a source is missing (prints n/a).
 * Skip rate is not estimated: SKIP_GATE is not recorded anywhere yet.
 */

const { execFileSync } = require('child_process');
const lib = require('./gate/lib.js');

const USAGE = ['Usage: node scripts/quality-report.js [--json]'];

const COMMIT_WINDOW = 100;
const SKIP_RATE_NOTE = 'n/a (SKIP_GATE is not recorded) — needs gate instrumentation';

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function readHistory(repoRoot) {
  let out;
  try {
    out = execFileSync('git', ['log', `-${COMMIT_WINDOW}`, '--numstat', '--pretty=format:C %h %s'],
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null; // not a repo, or unborn/empty history
  }

  const commits = [];
  let current = null;
  for (const line of out.split('\n')) {
    const head = line.match(/^C ([0-9a-f]+) (.*)$/);
    if (head) {
      current = { subject: head[2], files: 0, churn: 0 };
      commits.push(current);
      continue;
    }
    const nums = line.match(/^(\d+|-)\t(\d+|-)\t/);
    if (nums && current) {
      current.files += 1;
      current.churn += (Number(nums[1]) || 0) + (Number(nums[2]) || 0); // '-' = binary
    }
  }
  if (commits.length === 0) return null;

  const fixCommits = commits.filter((c) => /^(fix|revert)/i.test(c.subject)).length;
  return {
    commits: commits.length,
    medianFiles: median(commits.map((c) => c.files)),
    medianChurn: median(commits.map((c) => c.churn)),
    fixCommits,
    fixRatio: Number((fixCommits / commits.length).toFixed(3)),
  };
}

function readGate(repoRoot) {
  const pass = lib.readJson(lib.passMarkerPath(repoRoot));
  if (!pass) return null;
  const manifest = lib.readJson(lib.manifestPath(repoRoot));
  const frozenAt = manifest ? Date.parse(manifest.createdAt) : NaN;
  const passedAt = Date.parse(pass.timestamp);
  const frozenPassed = Number.isFinite(frozenAt) && Number.isFinite(passedAt);
  const names = Array.isArray(pass.lenses) ? pass.lenses : [];
  const lenses = lib.collectLensEvidence(lib.gateDir(repoRoot), names, pass.stagedHash).entries.map((lens) => ({
    name: lens.name, verdict: lens.verdict || null, findings: Number.isFinite(lens.findings) ? lens.findings : null,
  }));
  const known = lenses.filter((lens) => lens.findings !== null);
  return {
    verdict: pass.verdict || null,
    stagedHash: pass.stagedHash || null,
    timestamp: pass.timestamp || null,
    lensCount: lenses.length,
    totalFindings: known.reduce((sum, lens) => sum + lens.findings, 0),
    zeroFindingLenses: known.filter((lens) => lens.findings === 0).length,
    zeroFindingPanels: known.length > 0 && known.length === lenses.length
      && known.every((lens) => lens.findings === 0) ? 1 : 0,
    lenses,
    freezeToPassSeconds: frozenPassed ? Math.round((passedAt - frozenAt) / 1000) : null,
  };
}

function render(report) {
  const lines = [];
  const n = (value, format = String) => (value === null ? 'n/a' : format(value));
  const row = (label, value) => lines.push(`  ${label.padEnd(24)} ${value}`);

  lines.push(`Change quality (last ${COMMIT_WINDOW} commits)`);
  const history = report.history;
  if (history) {
    row('commits analysed', history.commits);
    row('median files / commit', history.medianFiles);
    row('median churn / commit', history.medianChurn);
    row('fix ratio', `${(history.fixRatio * 100).toFixed(1)}% (${history.fixCommits}/${history.commits})`);
  } else {
    row('commits analysed', 'n/a (no git history)');
  }

  lines.push('', 'Review Gate (last recorded pass)');
  const gate = report.gate;
  if (gate) {
    row('verdict', n(gate.verdict));
    row('stagedHash', n(gate.stagedHash, (hash) => hash.slice(0, 8)));
    row('timestamp', n(gate.timestamp));
    row('lenses', `${gate.lensCount} (${gate.totalFindings} findings, ${gate.zeroFindingLenses} zero-finding)`);
    row('lens yield', gate.lensCount > 0 ? `${(gate.totalFindings / gate.lensCount).toFixed(1)} findings / lens` : 'n/a');
    row('zero-finding panels', String(gate.zeroFindingPanels));
    for (const lens of gate.lenses) {
      const findings = lens.findings === null ? 'no evidence' : `${lens.findings} findings`;
      lines.push(`  - ${lens.name.padEnd(16)} ${(lens.verdict || 'n/a').padEnd(18)} ${findings}`);
    }
  } else {
    row('verdict', 'n/a (no .gate/pass.json)');
  }

  lines.push('', 'Cost');
  row('freeze -> pass', n(gate && gate.freezeToPassSeconds, (s) => `${s}s`));
  row('skip rate', report.skipRateNote);

  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const unknown = argv.find((arg) => arg !== '--json');
  if (unknown) {
    console.error(`❌ quality-report: unknown argument '${unknown}'`);
    for (const line of USAGE) console.error(`   ${line}`);
    return 1;
  }

  const repoRoot = process.cwd();
  const report = {
    history: readHistory(repoRoot), gate: readGate(repoRoot), skipRate: null, skipRateNote: SKIP_RATE_NOTE,
  };
  console.log(argv.includes('--json') ? JSON.stringify(report, null, 2) : render(report));
  return 0;
}

if (require.main === module) {
  process.exit(main());
}
