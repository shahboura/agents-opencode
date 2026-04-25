#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'validate-agents.js');
const fixturesRoot = path.join(repoRoot, 'scripts', 'fixtures', 'validate-agents');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runValidator(cwd) {
  try {
    const output = execFileSync(process.execPath, [scriptPath], {
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
  const result = runValidator(fixture);
  assert(result.status === 0, 'Expected valid fixture to pass agent validation');
}

function testUnknownSkillFails(tmpRoot) {
  const fixture = path.join(tmpRoot, 'unknown-skill');
  copyDirectory(path.join(fixturesRoot, 'unknown-skill'), fixture);

  const result = runValidator(fixture);
  assert(result.status !== 0, 'Expected unknown skill allow entry to fail validation');
  assert(result.output.includes('does not match any .opencode/skills'), 'Expected unknown skill error in output');
}

function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-validate-agents-'));

  try {
    console.log('Running agent validator tests...');
    testValidFixturePasses(tmpRoot);
    testUnknownSkillFails(tmpRoot);
    console.log('✅ Agent validator tests passed');
  } catch (err) {
    console.error('❌ Agent validator tests failed');
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
