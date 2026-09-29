#!/usr/bin/env node
'use strict';

/**
 * Install the versioned Pre-Commit Review Gate hook.
 *
 * Makes the hook runnable AND points `core.hooksPath` at `.githooks`. POSIX git
 * only runs a hook when the worktree file carries +x, so we record the
 * executable bit in the git index (`git update-index --chmod=+x`) and, on
 * POSIX, set the on-disk bit with fs.chmodSync and confirm it with X_OK. The
 * mode is repaired and verified BEFORE core.hooksPath is (re)pointed at the
 * hook, so a failure can never leave the gate aimed at an inert file. An
 * existing core.hooksPath (Husky/lefthook/…) is never clobbered without
 * `--force`.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');

const HOOK = '.githooks/pre-commit';
const HOOKS_PATH = '.githooks';

function git(args) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trim();
}

// Returns the current core.hooksPath, or '' when unset.
function readHooksPath() {
  try {
    return git(['config', '--get', 'core.hooksPath']);
  } catch {
    return '';
  }
}

// Record and confirm the hook's executable bit. Returns true only when the hook
// is confirmed runnable on this platform (win32 has no on-disk exec bit).
function repairAndVerifyExecutable() {
  try {
    git(['update-index', '--chmod=+x', HOOK]);
  } catch (err) {
    console.error(`❌ Could not mark ${HOOK} executable in the index: ${err.message}`);
    return false;
  }

  let listing;
  try {
    listing = git(['ls-files', '-s', HOOK]);
  } catch (err) {
    console.error(`❌ Could not verify ${HOOK}: ${err.message}`);
    return false;
  }

  const mode = (listing.split(/\s+/)[0] || '(unknown)');
  console.log(`   ${HOOK} index mode: ${mode}`);

  if (mode !== '100755') {
    console.error(`❌ Expected index mode 100755 for ${HOOK}, got ${mode}.`);
    console.error('   On POSIX the hook will not run — check core.fileMode and retry.');
    return false;
  }

  // `update-index --chmod=+x` only changes the index; the worktree file keeps
  // its old bit. Set it explicitly on POSIX and confirm it is executable.
  if (process.platform === 'win32') {
    return true;
  }

  try {
    fs.chmodSync(HOOK, 0o755);
    fs.accessSync(HOOK, fs.constants.X_OK);
    return true;
  } catch (err) {
    console.warn(`⚠️  Could not confirm the executable bit on ${HOOK}: ${err.message}`);
    console.warn('   The hook may be inert on POSIX — verify with `test -x .githooks/pre-commit`.');
    return false;
  }
}

function main() {
  const force = process.argv.slice(2).includes('--force');

  // S-9: never silently overwrite another hook manager's core.hooksPath.
  const previous = readHooksPath();
  if (previous) {
    console.log(`   core.hooksPath (previous): ${previous}`);
  }
  if (previous && previous !== HOOKS_PATH && !force) {
    console.error(`❌ core.hooksPath is already set to '${previous}' — refusing to overwrite it.`);
    console.error('   Re-run with --force to replace it, or unset it first:');
    console.error('     git config --unset core.hooksPath');
    return 1;
  }

  // C2: repair + verify the mode BEFORE core.hooksPath can point at the hook,
  // so a failure cannot leave the gate aimed at an inert file.
  if (!repairAndVerifyExecutable()) {
    console.error('❌ Refusing to set core.hooksPath: the hook is not confirmed executable.');
    return 1;
  }

  try {
    git(['config', 'core.hooksPath', HOOKS_PATH]);
    const suffix = previous && previous !== HOOKS_PATH ? ` (was '${previous}')` : '';
    console.log(`✅ core.hooksPath = ${HOOKS_PATH}${suffix}`);
  } catch (err) {
    console.error(`❌ Could not set core.hooksPath: ${err.message}`);
    return 1;
  }

  console.log('✅ Pre-Commit Review Gate hook installed and executable.');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}
