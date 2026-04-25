#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const harnessPath = path.join(repoRoot, 'evals', 'harness', 'run-evals.js');
const fixturesRoot = path.join(repoRoot, 'scripts', 'fixtures', 'eval-harness');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runHarness(cwd, args = []) {
  try {
    const output = execFileSync(process.execPath, [harnessPath, ...args], {
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

function testValidFixturePasses(tmpRoot) {
  const fixture = path.join(tmpRoot, 'valid');
  copyDirectory(path.join(fixturesRoot, 'valid'), fixture);

  const result = runHarness(repoRoot, ['--root', fixture]);
  assert(result.status === 0, 'Expected valid eval fixture to pass');
}

function testNegativeFixtureFails(tmpRoot) {
  const fixture = path.join(tmpRoot, 'negative');
  copyDirectory(path.join(fixturesRoot, 'negative'), fixture);

  const result = runHarness(repoRoot, ['--root', fixture]);
  assert(result.status !== 0, 'Expected negative eval fixture to fail');
  assert(result.output.includes('planner-read-only'), 'Expected planner rule failure in output');
  assert(result.output.includes('command-routing-metadata'), 'Expected command routing rule failure in output');
}

function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-eval-harness-'));

  try {
    console.log('Running agent eval harness tests...');
    testValidFixturePasses(tmpRoot);
    testNegativeFixtureFails(tmpRoot);
    console.log('✅ Agent eval harness tests passed');
  } catch (err) {
    console.error('❌ Agent eval harness tests failed');
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
