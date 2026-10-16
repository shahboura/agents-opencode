#!/usr/bin/env node
'use strict';

/**
 * Install the versioned Pre-Commit Review Gate hooks.
 *
 * Makes the hooks runnable AND points `core.hooksPath` at `.githooks`. POSIX git
 * only runs a hook when the worktree file carries +x, so for EACH hook
 * (pre-commit verifies the marker, post-commit consumes it) we record the
 * executable bit in the git index (`git update-index --chmod=+x`) and, on
 * POSIX, set the on-disk bit with fs.chmodSync and confirm it with X_OK. Every
 * hook's mode is repaired and verified BEFORE core.hooksPath is (re)pointed, so
 * a failure can never leave the gate aimed at an inert (or half-installed) hook
 * set. An existing core.hooksPath (Husky/lefthook/…) is never clobbered without
 * `--force`.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');

const HOOKS = ['.githooks/pre-commit', '.githooks/post-commit'];
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

// Record and confirm one hook's executable bit. Returns true only when the hook
// is confirmed runnable on this platform (win32 has no on-disk exec bit).
function repairAndVerifyExecutable(hook) {
  try {
    git(['update-index', '--chmod=+x', hook]);
  } catch (err) {
    console.error(`❌ Could not mark ${hook} executable in the index: ${err.message}`);
    console.error(`   Is ${hook} tracked? A new hook must be added to the index before its mode can be fixed.`);
    return false;
  }

  let listing;
  try {
    listing = git(['ls-files', '-s', hook]);
  } catch (err) {
    console.error(`❌ Could not verify ${hook}: ${err.message}`);
    return false;
  }

  const mode = (listing.split(/\s+/)[0] || '(unknown)');
  console.log(`   ${hook} index mode: ${mode}`);

  if (mode !== '100755') {
    console.error(`❌ Expected index mode 100755 for ${hook}, got ${mode}.`);
    console.error('   On POSIX the hook will not run — check core.fileMode and retry.');
    return false;
  }

  // `update-index --chmod=+x` only changes the index; the worktree file keeps
  // its old bit. Set it explicitly on POSIX and confirm it is executable.
  if (process.platform === 'win32') {
    return true;
  }

  try {
    fs.chmodSync(hook, 0o755);
    fs.accessSync(hook, fs.constants.X_OK);
    return true;
  } catch (err) {
    console.warn(`⚠️  Could not confirm the executable bit on ${hook}: ${err.message}`);
    console.warn(`   The hook may be inert on POSIX — verify with \`test -x ${hook}\`.`);
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

  // C2: repair + verify every hook's mode BEFORE core.hooksPath can point at
  // them, so a failure cannot leave the gate aimed at an inert hook set.
  for (const hook of HOOKS) {
    if (!repairAndVerifyExecutable(hook)) {
      console.error(`❌ Refusing to set core.hooksPath: ${hook} is not confirmed executable.`);
      return 1;
    }
  }

  try {
    git(['config', 'core.hooksPath', HOOKS_PATH]);
    const suffix = previous && previous !== HOOKS_PATH ? ` (was '${previous}')` : '';
    console.log(`✅ core.hooksPath = ${HOOKS_PATH}${suffix}`);
  } catch (err) {
    console.error(`❌ Could not set core.hooksPath: ${err.message}`);
    return 1;
  }

  console.log(`✅ Pre-Commit Review Gate hooks installed and executable: ${HOOKS.join(', ')}`);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}
