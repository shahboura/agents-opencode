#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'validate-agents.js');

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

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function setupValidFixture(rootDir) {
  writeFile(path.join(rootDir, '.opencode', 'skills', 'python', 'SKILL.md'), '# python\n');
  writeFile(path.join(rootDir, '.opencode', 'skills', 'docs-validation', 'SKILL.md'), '# docs-validation\n');

  writeFile(
    path.join(rootDir, '.opencode', 'agents', 'review.md'),
    `---
description: review
mode: subagent
permission:
  "*": "deny"
  skill:
    "*": "deny"
    "python": "allow"
  task:
    "*": "deny"
---

## Skill Activation Policy

Use skills on demand.
`
  );

  writeFile(
    path.join(rootDir, '.opencode', 'agents', 'codebase.md'),
    `---
description: codebase
mode: primary
permission:
  "*": "deny"
  skill:
    "*": "deny"
    "python": "allow"
  task:
    "*": "deny"
    "review": "allow"
---

## Skill Activation Policy

Use skills on demand.
`
  );

  writeFile(
    path.join(rootDir, '.opencode', 'commands', 'code-review.md'),
    `---
description: review code
agent: review
argument-hint: "[scope]"
subtask: true
---

Review current changes for quality and security.
`
  );
}

function testValidFixturePasses(tmpRoot) {
  const fixture = path.join(tmpRoot, 'valid');
  setupValidFixture(fixture);
  const result = runValidator(fixture);
  assert(result.status === 0, 'Expected valid fixture to pass agent validation');
}

function testUnknownSkillFails(tmpRoot) {
  const fixture = path.join(tmpRoot, 'unknown-skill');
  setupValidFixture(fixture);

  writeFile(
    path.join(fixture, '.opencode', 'agents', 'codebase.md'),
    `---
description: codebase
mode: primary
permission:
  "*": "deny"
  skill:
    "*": "deny"
    "not-a-real-skill": "allow"
  task:
    "*": "deny"
    "review": "allow"
---

## Skill Activation Policy

Use skills on demand.
`
  );

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
