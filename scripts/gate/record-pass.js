#!/usr/bin/env node
'use strict';

/**
 * Record a passing Review Gate verdict for the frozen staged tree.
 *
 * Requires an explicit `--verdict PASS|PASS-WITH-CAVEATS` — there is no
 * default, so a swallowed flag (e.g. `npm run gate:pass --verdict PASS` without
 * the `--`) fails with a usage error instead of silently recording a verdict.
 * Requires .gate/manifest.json (written by `gate:freeze`) and refuses unless the
 * current staged tree still matches manifest.stagedHash, so a pass can only bind
 * to the snapshot the lenses actually reviewed. Non-trivial diffs (see
 * lib.classifyStagedDiff) additionally require a Tier 2 panel of at least
 * MIN_NON_TRIVIAL_LENSES lenses; the decision is evaluated through the same
 * lib.evaluateMarker the hook uses, so `gate:pass` and the hook cannot diverge.
 * Writes .gate/pass.json ({ verdict, stagedHash, timestamp, lenses }).
 * `precommit-check.js` verifies the marker; the versioned post-commit hook
 * consumes it after a successful commit.
 */

const fs = require('fs');
const lib = require('./lib.js');

const USAGE = [
  'Usage: npm run gate:pass -- --verdict PASS|PASS-WITH-CAVEATS [--lenses <lens1,lens2,...>]',
  'Keep the `--` before the flags: without it npm swallows --verdict.',
];

function parseArgs(argv) {
  const options = { verdict: null, lenses: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--verdict') {
      const value = argv[i + 1];
      options.verdict = value && !value.startsWith('--') ? value : null;
      i += 1;
    } else if (arg.startsWith('--verdict=')) {
      options.verdict = arg.slice('--verdict='.length) || null;
    } else if (arg === '--lenses') {
      options.lenses = String(argv[i + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
      i += 1;
    } else if (arg.startsWith('--lenses=')) {
      options.lenses = arg.slice('--lenses='.length).split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return options;
}

function main() {
  const repoRoot = process.cwd();
  const options = parseArgs(process.argv.slice(2));

  if (options.verdict === null) {
    console.error('❌ gate:pass requires an explicit --verdict (no default).');
    for (const line of USAGE) {
      console.error(`   ${line}`);
    }
    return 1;
  }

  if (!lib.isPassVerdict(options.verdict)) {
    console.error(`❌ gate:pass refuses verdict '${options.verdict}' — expected PASS or PASS-WITH-CAVEATS.`);
    return 1;
  }

  const manifest = lib.readJson(lib.manifestPath(repoRoot));
  if (!manifest || !manifest.stagedHash) {
    console.error('❌ gate:pass requires .gate/manifest.json — run `npm run gate:freeze` first.');
    return 1;
  }

  let stagedHash;
  try {
    stagedHash = lib.computeStagedHash(repoRoot);
  } catch (err) {
    console.error(`❌ gate:pass could not read the staged tree: ${err.message}`);
    return 1;
  }

  if (stagedHash !== manifest.stagedHash) {
    console.error('❌ gate:pass refusing: the staged tree changed after the snapshot was frozen.');
    console.error(`   Frozen:  ${manifest.stagedHash}`);
    console.error(`   Current: ${stagedHash}`);
    console.error('   Re-run `npm run gate:freeze` and review the new diff.');
    return 1;
  }

  let stagedFiles;
  let gitlinkPaths;
  try {
    stagedFiles = lib.listStagedFiles(repoRoot);
    gitlinkPaths = lib.listStagedGitlinks(repoRoot);
  } catch (err) {
    console.error(`❌ gate:pass could not read the staged file list: ${err.message}`);
    return 1;
  }

  const classification = lib.classifyStagedDiff(stagedFiles, { gitlinkPaths });
  const decision = lib.evaluateMarker(
    { verdict: options.verdict, stagedHash, lenses: options.lenses },
    stagedHash,
    classification
  );

  if (!decision.allowed) {
    console.error(`❌ gate:pass refusing: ${decision.reason}.`);
    if (classification.nonTrivial) {
      console.error('   Non-trivial because:');
      for (const reason of classification.reasons) {
        console.error(`     - ${reason}`);
      }
    }
    const distinctLenses = lib.markerLensCount({ lenses: options.lenses });
    if (options.lenses.length > distinctLenses) {
      console.error(`   Note: ${options.lenses.length} lens argument(s) collapse to ${distinctLenses} distinct name(s); duplicates count once.`);
    }
    console.error('   This needs the Tier 2 flow: a concurrent lens panel on the frozen diff.');
    console.error('   (The trivial `npm run gate:quick` path records no lenses and cannot approve this diff.)');
    console.error('   After the panel passes, record it with:');
    console.error('     npm run gate:pass -- --verdict PASS --lenses <lens1,lens2>');
    return 1;
  }

  fs.mkdirSync(lib.gateDir(repoRoot), { recursive: true });
  fs.writeFileSync(
    lib.passMarkerPath(repoRoot),
    `${JSON.stringify({
      verdict: options.verdict,
      stagedHash,
      timestamp: new Date().toISOString(),
      lenses: options.lenses,
    }, null, 2)}\n`
  );

  const tier = classification.nonTrivial
    ? `non-trivial (Tier 2 panel: ${lib.markerLensCount({ lenses: options.lenses })} distinct lenses)`
    : 'trivial (Tier 1 suffices)';
  console.log(`✅ Gate pass recorded: ${options.verdict} (staged ${stagedHash})`);
  console.log(`   Tier:   ${tier} — ${classification.fileCount} staged file(s)`);
  console.log(`   Marker: ${lib.passMarkerPath(repoRoot)}`);
  console.log('   Commit now — the post-commit hook consumes the marker once the commit exists.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}
