#!/usr/bin/env node
'use strict';

/**
 * Pre-Commit Review Gate check (invoked by the versioned .githooks/pre-commit).
 *
 * Allows the commit only when:
 *   - the staged tree equals HEAD^{tree} (the empty tree for an unborn HEAD) —
 *     an empty commit changes nothing and needs no review. Tree equality, not
 *     the staged name list, is load-bearing (S1): `git diff --cached --name-only`
 *     can hide gitlink (submodule) changes that the commit itself includes, so
 *     an empty list is not proof of an empty commit, OR
 *   - SKIP_GATE=1 (documented bootstrap/escape hatch), OR
 *   - .gate/pass.json exists, has a PASS/PASS-WITH-CAVEATS verdict, and its
 *     stagedHash matches the current index; non-trivial diffs (recomputed from
 *     the staged tree via lib.classifyStagedDiff, including any staged gitlink)
 *     additionally require at least MIN_NON_TRIVIAL_LENSES recorded lenses.
 *
 * This check only VERIFIES the marker — it never consumes it. Consumption lives
 * in the versioned .githooks/post-commit hook, which deletes .gate/pass.json
 * once the commit object exists, so an aborted commit (GPG signing failure,
 * hook crash, editor abort) keeps the approval instead of burning it, and any
 * successful commit — including `--no-verify` and empty commits — consumes a
 * pending marker. Residual: if .githooks/post-commit is missing or inert, a
 * marker lingers; it binds the staged TREE (not the diff against a base), so
 * it could re-approve the SAME tree once HEAD has moved.
 * Otherwise prints how to run the gate and exits 1.
 */

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

function main() {
  const repoRoot = process.cwd();
  const env = process.env;

  if (lib.isSkipGate(env)) {
    console.log('⚠️  SKIP_GATE=1 — bypassing the Pre-Commit Review Gate (bootstrap only).');
    console.log('   Applies to this command only; never set SKIP_GATE in a shell profile or CI.');
    return 0;
  }

  // Decide the exemption on TREE EQUALITY, never on the staged name list:
  // `git diff --cached --name-only` can hide gitlink (submodule) changes
  // (`diff.ignoreSubmodules`/git defaults), while `git write-tree` and the
  // commit itself include them — so an empty list is not proof of an empty
  // commit (S1). Only a staged tree identical to HEAD^{tree} (the empty tree
  // for an unborn HEAD) changes nothing and needs no review (the
  // `git commit --allow-empty` path).
  let stagedHash;
  let headTree;
  try {
    stagedHash = lib.computeStagedHash(repoRoot);
    headTree = lib.computeHeadTree(repoRoot);
  } catch (err) {
    console.error('❌ Review Gate could not read the staged or HEAD tree:', err.message);
    console.error('   Fix the git state (or set SKIP_GATE=1 for bootstrap) and retry.');
    return 1;
  }

  if (stagedHash === headTree) {
    console.log('✅ Pre-Commit Review Gate: the staged tree matches HEAD — empty commit exempt, no review required.');
    return 0;
  }

  let stagedFiles;
  let gitlinkPaths;
  try {
    stagedFiles = lib.listStagedFiles(repoRoot);
    gitlinkPaths = lib.listStagedGitlinks(repoRoot);
  } catch (err) {
    console.error('❌ Review Gate could not read the staged file list:', err.message);
    console.error('   Fix the git state (or set SKIP_GATE=1 for bootstrap) and retry.');
    return 1;
  }

  const classification = lib.classifyStagedDiff(stagedFiles, { gitlinkPaths });
  const markerPath = lib.passMarkerPath(repoRoot);
  const marker = lib.readJson(markerPath);
  const decision = lib.evaluateMarker(marker, stagedHash, classification);

  if (!decision.allowed) {
    console.error('❌ Pre-Commit Review Gate has not passed for this staged change.');
    console.error(`   Reason: ${decision.reason}.`);
    if (classification.nonTrivial) {
      console.error('   Non-trivial because:');
      for (const reason of classification.reasons) {
        console.error(`     - ${reason}`);
      }
    }
    console.error('   Run the gate, then record the pass before committing:');
    console.error('     npm run gate:freeze                      # freeze .gate/diff.patch + manifest');
    console.error('     # Tier 1 (npm run doctor) + Tier 2 lenses review the frozen diff');
    console.error('     npm run gate:pass -- --verdict PASS --lenses <lens1,lens2>');
    if (!classification.nonTrivial) {
      console.error('   Trivial diff? `npm run gate:quick` chains freeze + Tier 1 + record in one step.');
    }
    console.error('   Bootstrap/escape hatch: SKIP_GATE=1 git commit ...');
    return 1;
  }

  // The marker can be hand-written, so the hook re-verifies the plan binding
  // rather than trusting `gate:pass` to have done it.
  if (classification.nonTrivial) {
    const manifest = lib.readJson(lib.manifestPath(repoRoot));
    let planHash = null;
    try {
      const planText = fs.readFileSync(path.join(lib.gateDir(repoRoot), 'plan.md'), 'utf8');
      planHash = lib.hashText(planText);
    } catch {
      planHash = null;
    }
    if (!manifest || manifest.stagedHash !== stagedHash || !manifest.planHash || planHash !== manifest.planHash) {
      console.error('❌ Pre-Commit Review Gate: .gate/plan.md is missing or does not match the frozen manifest.');
      console.error('   Re-run `npm run gate:freeze` with the approved plan, then review and record again.');
      return 1;
    }
  }

  console.log(`✅ Pre-Commit Review Gate passed (${marker.verdict}); the post-commit hook consumes the marker after the commit.`);
  if (typeof marker.skippedRequirements === 'string' && marker.skippedRequirements.trim()) {
    console.log(`   Requirements lens skipped: "${marker.skippedRequirements.trim()}"`);
  }
  return 0;
}

if (require.main === module) {
  process.exit(main());
}
