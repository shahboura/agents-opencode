#!/usr/bin/env node
'use strict';

/**
 * Pre-Commit Review Gate check (invoked by the versioned .githooks/pre-commit).
 *
 * Allows the commit only when:
 *   - SKIP_GATE=1 (documented bootstrap/escape hatch), OR
 *   - .gate/pass.json exists, has a PASS/PASS-WITH-CAVEATS verdict, and its
 *     stagedHash matches the current index — then the marker is consumed.
 * Otherwise prints how to run the gate and exits 1.
 */

const lib = require('./lib.js');

function main() {
  const repoRoot = process.cwd();
  const env = process.env;

  if (lib.isSkipGate(env)) {
    console.log('⚠️  SKIP_GATE=1 — bypassing the Pre-Commit Review Gate (bootstrap only).');
    console.log('   Applies to this command only; never set SKIP_GATE in a shell profile or CI.');
    return 0;
  }

  let stagedHash;
  try {
    stagedHash = lib.computeStagedHash(repoRoot);
  } catch (err) {
    console.error('❌ Review Gate could not read the staged tree:', err.message);
    console.error('   Fix the git state (or set SKIP_GATE=1 for bootstrap) and retry.');
    return 1;
  }

  const markerPath = lib.passMarkerPath(repoRoot);
  const marker = lib.readJson(markerPath);
  const decision = lib.evaluateMarker(marker, stagedHash);

  if (!decision.allowed) {
    console.error('❌ Pre-Commit Review Gate has not passed for this staged change.');
    console.error(`   Reason: ${decision.reason}.`);
    console.error('   Run the gate, then record the pass before committing:');
    console.error('     npm run gate:freeze                      # freeze .gate/diff.patch + manifest');
    console.error('     # Tier 1 (npm run doctor) + Tier 2 lenses review the frozen diff');
    console.error('     npm run gate:pass -- --verdict PASS      # record .gate/pass.json');
    console.error('   Bootstrap/escape hatch: SKIP_GATE=1 git commit ...');
    return 1;
  }

  lib.consumeMarker(markerPath);
  console.log(`✅ Pre-Commit Review Gate passed (${marker.verdict}); marker consumed.`);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}
