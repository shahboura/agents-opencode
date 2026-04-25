#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'generate-handoff.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function testGenerateHandoff(tmpRoot) {
  const statePath = path.join(tmpRoot, 'state', 'session-state.json');
  const outPath = path.join(tmpRoot, 'handoff', 'latest.md');

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(
    statePath,
    JSON.stringify(
      {
        goal: 'Complete governance rollout.',
        current_phase: 'validation',
        decisions: ['Enable CI risk checks.'],
        open_risks: ['Need CODEOWNERS.'],
        blocked_by: [],
        next_actions: ['Draft CODEOWNERS', 'Review branch protections', 'Publish docs'],
        artifacts: ['docs/compatibility.md'],
        last_updated: '2026-04-25T00:00:00Z',
      },
      null,
      2
    ),
    'utf8'
  );

  execFileSync(process.execPath, [scriptPath, '--state', statePath, '--out', outPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  assert(fs.existsSync(outPath), 'Expected handoff file to be generated');
  const content = fs.readFileSync(outPath, 'utf8');
  assert(content.includes('# Handoff Packet'), 'Expected handoff heading');
  assert(content.includes('Complete governance rollout.'), 'Expected objective in handoff');
  assert(content.includes('Next 3 Actions'), 'Expected next-actions section');
}

function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-handoff-'));

  try {
    console.log('Running handoff generator tests...');
    testGenerateHandoff(tmpRoot);
    console.log('✅ Handoff generator tests passed');
  } catch (err) {
    console.error('❌ Handoff generator tests failed');
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
