#!/usr/bin/env node
'use strict';

/**
 * Freeze the current staged diff for the Review Gate.
 *
 * Writes .gate/diff.patch (exact staged changes) and .gate/manifest.json
 * (base/head SHA + staged-tree hash). Lenses are handed the .gate/diff.patch
 * path; they cannot run git, so the snapshot must be complete on disk.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function tryGit(args, cwd) {
  try {
    return git(args, cwd);
  } catch {
    return '';
  }
}

// True when the index differs from HEAD. `git diff --cached --quiet` exits 0
// for no differences and 1 for differences; anything else is a real error.
// `--ignore-submodules=none` (S1) keeps gitlink changes visible, matching the
// main diff below and `lib.listStagedFiles`.
function hasStagedChanges(cwd) {
  try {
    execFileSync('git', ['diff', '--cached', '--quiet', '--ignore-submodules=none'], { cwd });
    return false;
  } catch (err) {
    if (err.status === 1) {
      return true;
    }
    throw err;
  }
}

function resolveBase(cwd, head) {
  const upstreamMergeBase = tryGit(['merge-base', 'HEAD', '@{upstream}'], cwd);
  if (upstreamMergeBase) {
    return upstreamMergeBase;
  }
  for (const ref of ['main', 'master']) {
    const mergeBase = tryGit(['merge-base', 'HEAD', ref], cwd);
    if (mergeBase) {
      return mergeBase;
    }
  }
  return tryGit(['rev-parse', 'HEAD^'], cwd) || head;
}

function main() {
  const repoRoot = process.cwd();

  const head = tryGit(['rev-parse', 'HEAD'], repoRoot);
  const base = resolveBase(repoRoot, head);

  // Resolve the staged hash BEFORE creating .gate/ so a git failure cannot
  // leave a half-written snapshot directory behind (C-8).
  let stagedHash;
  try {
    stagedHash = lib.computeStagedHash(repoRoot);
  } catch (err) {
    console.error(`❌ gate:freeze could not read the staged tree: ${err.message}`);
    process.exit(1);
  }

  // Fail closed: a git error, or an index with changes that yields an empty
  // diff, must never be written as a valid snapshot (C-3). The step must also
  // be COMPLETE: `--ignore-submodules=none` is load-bearing (S1), or a user's
  // `diff.ignoreSubmodules` config would render a gitlink-only change as an
  // empty diff while the commit still moves the submodule pointer.
  let diff;
  try {
    diff = git(['diff', '--cached', '--no-color', '--ignore-submodules=none'], repoRoot);
  } catch (err) {
    console.error(`❌ gate:freeze could not read the staged diff: ${err.message}`);
    process.exit(1);
  }

  if (!diff.trim()) {
    let staged;
    try {
      staged = hasStagedChanges(repoRoot);
    } catch (err) {
      console.error(`❌ gate:freeze could not inspect the index: ${err.message}`);
      process.exit(1);
    }
    if (staged) {
      console.error('❌ gate:freeze refusing to freeze: the index has changes but the diff is empty.');
      process.exit(1);
    }
  }

  let classification;
  try {
    classification = lib.classifyStagedDiff(lib.listStagedFiles(repoRoot), {
      gitlinkPaths: lib.listStagedGitlinks(repoRoot),
    });
  } catch (err) {
    console.error(`❌ gate:freeze could not classify the staged diff: ${err.message}`);
    process.exit(1);
  }

  // A non-trivial diff needs an approved plan with executable checks. The hash
  // binds the snapshot to that plan, so a later pass cannot cite a different one.
  const planPath = path.join(lib.gateDir(repoRoot), 'plan.md');
  let planHash = null;
  if (fs.existsSync(planPath)) {
    let planText;
    try {
      if (fs.lstatSync(planPath).isSymbolicLink()) {
        console.error('❌ gate:freeze refusing: .gate/plan.md is a symlink.');
        process.exit(1);
      }
      planText = fs.readFileSync(planPath, 'utf8');
    } catch (err) {
      console.error(`❌ gate:freeze could not read .gate/plan.md: ${err.message}`);
      process.exit(1);
    }
    const plan = lib.validatePlan(planText);
    if (!plan.ok) {
      if (classification.nonTrivial) {
        console.error(`❌ gate:freeze refusing: .gate/plan.md is not executable (${plan.reason}).`);
        console.error('   Add a "## Checks" section with "- run:" and "- expect:" pairs.');
        process.exit(1);
      }
      console.warn(`⚠️  .gate/plan.md is not executable (${plan.reason}); trivial diff, continuing.`);
    } else {
      planHash = lib.hashText(planText);
    }
  } else if (classification.nonTrivial) {
    console.error('❌ gate:freeze refusing: a non-trivial diff requires .gate/plan.md.');
    console.error('   Write the approved plan with a "## Checks" section (- run: / - expect:), then re-freeze.');
    process.exit(1);
  }

  const gate = lib.gateDir(repoRoot);
  fs.mkdirSync(gate, { recursive: true });

  fs.writeFileSync(lib.diffPath(repoRoot), diff ? `${diff}\n` : '');
  fs.writeFileSync(
    lib.manifestPath(repoRoot),
    `${JSON.stringify({ schemaVersion: 1, base, head, stagedHash, planHash, createdAt: new Date().toISOString() }, null, 2)}\n`
  );

  const lines = diff ? diff.split('\n').length : 0;
  console.log('❄️  Gate snapshot frozen');
  console.log(`   Diff:      ${lib.diffPath(repoRoot)} (${lines} line(s))`);
  console.log(`   Manifest:  ${lib.manifestPath(repoRoot)}`);
  console.log(`   Base:      ${base || '(none)'}`);
  console.log(`   Head:      ${head || '(none)'}`);
  console.log(`   Staged:    ${stagedHash}`);
  console.log(`   Plan:      ${planHash ? planHash.slice(0, 12) : '(none)'}`);
  console.log('   Next: review the diff, then record `npm run gate:pass -- --verdict PASS` after a PASS');
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`❌ gate:freeze failed: ${err.message}`);
    process.exit(1);
  }
}
