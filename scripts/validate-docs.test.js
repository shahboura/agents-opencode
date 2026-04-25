#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'validate-docs.js');
const fixturesRoot = path.join(repoRoot, 'scripts', 'fixtures', 'validate-docs');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runValidator(cwd, args = []) {
  try {
    const output = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd,
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
  }
}

function copyDirectory(sourceDir, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function testRelativeAndExtensionlessLinks(tmpRoot) {
  const testDir = path.join(tmpRoot, 'internal-links');
  copyDirectory(path.join(fixturesRoot, 'valid'), testDir);

  const result = runValidator(testDir);
  assert(result.status === 0, 'Expected internal links validation to pass');
}

function testBrokenInternalLinkFails(tmpRoot) {
  const testDir = path.join(tmpRoot, 'broken-links');
  copyDirectory(path.join(fixturesRoot, 'broken'), testDir);

  const result = runValidator(testDir);
  assert(result.status !== 0, 'Expected broken internal links to fail validation');
  assert(result.output.includes('Broken'), 'Expected output to mention broken links');
}

function testInvalidArgsFailFast(tmpRoot) {
  const testDir = path.join(tmpRoot, 'invalid-args');
  copyDirectory(path.join(fixturesRoot, 'valid'), testDir);

  const result = runValidator(testDir, ['--timeout-ms=0']);
  assert(result.status !== 0, 'Expected invalid timeout argument to fail');
  assert(result.output.includes('Invalid --timeout-ms'), 'Expected invalid timeout message');
}

function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-validate-docs-'));

  try {
    console.log('Running docs validator tests...');
    testRelativeAndExtensionlessLinks(tmpRoot);
    testBrokenInternalLinkFails(tmpRoot);
    testInvalidArgsFailFast(tmpRoot);
    console.log('✅ Docs validator tests passed');
  } catch (err) {
    console.error('❌ Docs validator tests failed');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

main();
