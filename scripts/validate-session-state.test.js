#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'validate-session-state.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runValidator(filePath) {
  try {
    const output = execFileSync(process.execPath, [scriptPath, '--file', filePath], {
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
  }
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function testValidStatePasses(tmpRoot) {
  const filePath = path.join(tmpRoot, 'valid.json');
  writeJson(filePath, {
    goal: 'Ship validated changes safely.',
    current_phase: 'execution',
    decisions: ['Use CI gates for contract checks.'],
    open_risks: ['None currently.'],
    blocked_by: [],
    next_actions: ['Continue implementation.'],
    artifacts: ['README.md'],
    last_updated: '2026-04-25T00:00:00Z',
  });

  const result = runValidator(filePath);
  assert(result.status === 0, 'Expected valid session state to pass');
}

function testMissingFieldFails(tmpRoot) {
  const filePath = path.join(tmpRoot, 'missing-field.json');
  writeJson(filePath, {
    goal: 'Ship validated changes safely.',
    decisions: [],
    open_risks: [],
    blocked_by: [],
    next_actions: [],
    artifacts: [],
    last_updated: '2026-04-25T00:00:00Z',
  });

  const result = runValidator(filePath);
  assert(result.status !== 0, 'Expected missing current_phase to fail');
  assert(result.output.includes('current_phase'), 'Expected missing field error output');
}

function testInvalidTimestampFails(tmpRoot) {
  const filePath = path.join(tmpRoot, 'invalid-timestamp.json');
  writeJson(filePath, {
    goal: 'Ship validated changes safely.',
    current_phase: 'execution',
    decisions: [],
    open_risks: [],
    blocked_by: [],
    next_actions: [],
    artifacts: [],
    last_updated: 'not-a-date',
  });

  const result = runValidator(filePath);
  assert(result.status !== 0, 'Expected invalid timestamp to fail');
  assert(result.output.includes('ISO-8601'), 'Expected timestamp validation message');
}

function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-session-state-'));

  try {
    console.log('Running session-state validator tests...');
    testValidStatePasses(tmpRoot);
    testMissingFieldFails(tmpRoot);
    testInvalidTimestampFails(tmpRoot);
    console.log('✅ Session-state validator tests passed');
  } catch (err) {
    console.error('❌ Session-state validator tests failed');
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
