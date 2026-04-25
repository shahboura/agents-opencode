#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const harnessPath = path.join(repoRoot, 'evals', 'harness', 'run-evals.js');

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

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeExpectedContracts(rootDir) {
  writeFile(
    path.join(rootDir, 'evals', 'fixtures', 'expected-contracts.json'),
    JSON.stringify(
      {
        planner: {
          requiredBodyPatterns: ['read-only', 'no code edits'],
        },
        orchestrator: {
          requiredBodyPatterns: ['planning phase', 'await approval', 'safe execution loop protocol'],
        },
        review: {
          requiredBodyPatterns: ['verification gate', 'pass / pass-with-conditions / fail'],
        },
      },
      null,
      2
    ) + '\n'
  );
}

function writeSkills(rootDir) {
  const skills = ['python', 'docs-validation', 'agent-diagnostics'];
  for (const skill of skills) {
    writeFile(path.join(rootDir, '.opencode', 'skills', skill, 'SKILL.md'), `# ${skill}\n`);
  }
}

function writeValidAgents(rootDir) {
  writeFile(
    path.join(rootDir, '.opencode', 'agents', 'planner.md'),
    `---
description: planner
mode: primary
permission:
  "*": "deny"
  edit: "deny"
  bash: "deny"
  read: "allow"
  skill:
    "*": "deny"
    "python": "allow"
  task:
    "*": "deny"
    "explore": "allow"
---

Read-only planner with no code edits.
`
  );

  writeFile(
    path.join(rootDir, '.opencode', 'agents', 'orchestrator.md'),
    `---
description: orchestrator
mode: primary
permission:
  "*": "deny"
  read: "allow"
  skill:
    "*": "deny"
    "python": "allow"
  task:
    "*": "deny"
    "review": "allow"
    "explore": "allow"
---

Planning phase is required.
Present plan and await approval.
Use the safe execution loop protocol.
`
  );

  writeFile(
    path.join(rootDir, '.opencode', 'agents', 'review.md'),
    `---
description: review
mode: subagent
permission:
  "*": "deny"
  edit: "deny"
  read: "allow"
  skill:
    "*": "deny"
    "docs-validation": "allow"
  task:
    "*": "deny"
---

Verification gate: return pass / pass-with-conditions / fail.
`
  );
}

function writeValidCommands(rootDir) {
  writeFile(
    path.join(rootDir, '.opencode', 'commands', 'plan-project.md'),
    `---
description: plan
agent: orchestrator
argument-hint: "[feature]"
subtask: true
---

Use $ARGUMENTS for project plan.
`
  );
}

function setupValidFixture(rootDir) {
  writeExpectedContracts(rootDir);
  writeSkills(rootDir);
  writeValidAgents(rootDir);
  writeValidCommands(rootDir);
}

function testValidFixturePasses(tmpRoot) {
  const fixture = path.join(tmpRoot, 'valid');
  setupValidFixture(fixture);

  const result = runHarness(repoRoot, ['--root', fixture]);
  assert(result.status === 0, 'Expected valid eval fixture to pass');
}

function testNegativeFixtureFails(tmpRoot) {
  const fixture = path.join(tmpRoot, 'negative');
  setupValidFixture(fixture);

  writeFile(
    path.join(fixture, '.opencode', 'agents', 'planner.md'),
    `---
description: planner
mode: primary
permission:
  "*": "deny"
  edit: "allow"
  bash: "deny"
  read: "allow"
  skill:
    "*": "deny"
    "python": "allow"
  task:
    "*": "deny"
    "explore": "allow"
---

Planner content missing required phrase.
`
  );

  writeFile(
    path.join(fixture, '.opencode', 'commands', 'plan-project.md'),
    `---
description: plan
agent: unknown-agent
argument-hint: "[feature]"
subtask: true
---

Use <args> token.
`
  );

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
