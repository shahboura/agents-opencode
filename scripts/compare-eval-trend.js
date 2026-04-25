#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const options = {
    current: path.join(process.cwd(), 'evals', 'reports', 'latest.json'),
    baseline: path.join(process.cwd(), 'evals', 'fixtures', 'eval-trend-baseline.json'),
    out: path.join(process.cwd(), 'evals', 'reports', 'trend-summary.md'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--current') {
      options.current = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--baseline') {
      options.baseline = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--out') {
      options.out = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label} file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function formatDelta(current, baseline) {
  const delta = current - baseline;
  if (delta === 0) {
    return '0';
  }
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function buildSummary(currentReport, baselineReport) {
  const current = {
    rules: safeNumber(currentReport?.summary?.rules),
    issues: safeNumber(currentReport?.summary?.issues),
    errors: safeNumber(currentReport?.summary?.errors),
  };

  const baseline = {
    rules: safeNumber(baselineReport?.summary?.rules),
    issues: safeNumber(baselineReport?.summary?.issues),
    errors: safeNumber(baselineReport?.summary?.errors),
  };

  return {
    current,
    baseline,
    delta: {
      rules: current.rules - baseline.rules,
      issues: current.issues - baseline.issues,
      errors: current.errors - baseline.errors,
    },
  };
}

function renderMarkdown(summary) {
  const status = summary.current.errors === 0 ? '✅ Stable' : '❌ Regressed';
  return `# Agent Eval Trend Snapshot

Status: ${status}

| Metric | Baseline | Current | Delta |
|---|---:|---:|---:|
| Rules | ${summary.baseline.rules} | ${summary.current.rules} | ${formatDelta(summary.current.rules, summary.baseline.rules)} |
| Issues | ${summary.baseline.issues} | ${summary.current.issues} | ${formatDelta(summary.current.issues, summary.baseline.issues)} |
| Errors | ${summary.baseline.errors} | ${summary.current.errors} | ${formatDelta(summary.current.errors, summary.baseline.errors)} |
`;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
    return;
  }

  try {
    const currentReport = readJson(options.current, 'current eval report');
    const baselineReport = readJson(options.baseline, 'baseline eval report');

    const summary = buildSummary(currentReport, baselineReport);

    fs.mkdirSync(path.dirname(options.out), { recursive: true });
    fs.writeFileSync(options.out, renderMarkdown(summary), 'utf8');

    console.log('✅ Eval trend summary generated');
    console.log(`- Current: ${options.current}`);
    console.log(`- Baseline: ${options.baseline}`);
    console.log(`- Output: ${options.out}`);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
}

main();
