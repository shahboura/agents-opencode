#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'validate-changelog-labels.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runValidator(changelogContent) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-changelog-'));
  const changelogPath = path.join(tmpDir, 'CHANGELOG.md');
  fs.writeFileSync(changelogPath, changelogContent, 'utf8');

  try {
    const output = execFileSync(process.execPath, [scriptPath, '--changelog', changelogPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return {
      status: 0,
      output,
    };
  } catch (err) {
    return {
      status: err.status ?? 1,
      output: `${err.stdout || ''}${err.stderr || ''}`,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failure
    }
  }
}

function testPassesWhenUnreleasedItemsLabeled() {
  const result = runValidator(`# Changelog

## [Unreleased]

### Features

* [capability:validation] Add new CI gate
* [capability:docs] Improve docs clarity

## [1.0.0](https://example.com) (2026-01-01)

### Features

* Existing released item
`);

  assert(result.status === 0, 'Expected labeled Unreleased bullets to pass validation');
}

function testFailsWhenUnreleasedItemMissingLabel() {
  const result = runValidator(`# Changelog

## [Unreleased]

### Bug Fixes

* Fix flaky test

## [1.0.0](https://example.com) (2026-01-01)
`);

  assert(result.status !== 0, 'Expected missing capability label to fail validation');
  assert(result.output.includes('missing required [capability:<label>] prefix'), 'Expected missing label error');
}

function testIgnoresReleasedSections() {
  const result = runValidator(`# Changelog

## [Unreleased]

### Features

* [capability:ci] Add workflow rule

## [1.2.3](https://example.com) (2026-01-01)

### Features

* Older item without capability label
`);

  assert(result.status === 0, 'Expected validator to ignore released section bullets');
}

function main() {
  try {
    console.log('Running changelog label validator tests...');
    testPassesWhenUnreleasedItemsLabeled();
    testFailsWhenUnreleasedItemMissingLabel();
    testIgnoresReleasedSections();
    console.log('✅ Changelog label validator tests passed');
  } catch (err) {
    console.error('❌ Changelog label validator tests failed');
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
