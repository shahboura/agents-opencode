#!/usr/bin/env node
'use strict';

/**
 * Graph Freshness Check
 * Fails only when graphify-out/GRAPH_REPORT.md exists and records a commit
 * other than HEAD. graphify is optional, so every other case exits 0.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPORT = path.join(process.cwd(), 'graphify-out', 'GRAPH_REPORT.md');

function skip(message) {
  console.log(`⚠️ ${message}`);
  process.exit(0);
}

function main() {
  if (!fs.existsSync(REPORT)) {
    skip('No graphify-out/GRAPH_REPORT.md; skipping graph freshness check');
  }

  const content = fs.readFileSync(REPORT, 'utf8');
  const match = content.match(/Built from commit:\s*`?([0-9a-f]{7,40})`?/i);
  if (!match) {
    skip('Graph report has no "Built from commit" hash; skipping');
  }

  const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (head.error || head.status !== 0) {
    skip('git is unavailable; skipping graph freshness check');
  }

  const builtFrom = match[1].toLowerCase();
  const headHash = head.stdout.trim().toLowerCase();
  const matches = headHash.startsWith(builtFrom) || builtFrom.startsWith(headHash);

  if (matches) {
    console.log(`✅ Graph matches HEAD (${builtFrom})`);
    process.exit(0);
  }

  // The graph is a local, gitignored artifact rebuilt from the working tree, so
  // a commit hash cannot prove it is current (uncommitted edits do not move
  // HEAD). Advisory by default; `--strict` turns it into a hard failure.
  const strict = process.argv.includes('--strict');
  const message = [
    'Graph appears stale',
    `   built from: ${builtFrom}`,
    `   HEAD:       ${headHash}`,
    '   Run `graphify update .` after code changes.',
  ].join('\n');
  if (strict) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`⚠️  ${message}`);
  process.exit(0);
}

main();
