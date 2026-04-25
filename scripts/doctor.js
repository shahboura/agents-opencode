#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const isWin = process.platform === 'win32';

const checks = [
  {
    name: 'Validate agent configurations',
    command: process.execPath,
    args: ['scripts/validate-agents.js'],
  },
  {
    name: 'Validate command docs parity',
    command: process.execPath,
    args: ['scripts/validate-command-matrices.js'],
  },
  {
    name: 'Run installer lifecycle tests',
    command: process.execPath,
    args: ['scripts/test-installer.js'],
  },
  {
    name: 'Validate documentation links',
    command: process.execPath,
    args: ['scripts/validate-docs.js'],
  },
  {
    name: 'Run docs validator tests',
    command: process.execPath,
    args: ['scripts/validate-docs.test.js'],
  },
  {
    name: 'Run agent validator tests',
    command: process.execPath,
    args: ['scripts/validate-agents.test.js'],
  },
  {
    name: 'Run agent eval harness',
    command: process.execPath,
    args: ['evals/harness/run-evals.js'],
  },
  {
    name: 'Run agent eval harness tests',
    command: process.execPath,
    args: ['scripts/eval-harness.test.js'],
  },
  {
    name: 'Validate context size threshold',
    command: process.execPath,
    args: ['scripts/check-context-size.js', '--check'],
  },
  {
    name: 'Lint markdown files',
    command: isWin ? 'npm.cmd' : 'npm',
    args: ['run', 'lint:md'],
    shell: isWin,
  },
];

function runCheck(check) {
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    shell: check.shell === true,
  });

  const errorOutput = result.error ? `${result.error.message}\n` : '';
  const output = `${errorOutput}${result.stdout || ''}${result.stderr || ''}`.trim();
  const ok = result.status === 0;

  return {
    ...check,
    ok,
    code: result.status,
    output,
  };
}

function main() {
  console.log('🩺 OpenCode Agents doctor\n');

  const results = checks.map(runCheck);

  for (const result of results) {
    const prefix = result.ok ? '✅' : '❌';
    console.log(`${prefix} ${result.name}`);

    if (!result.ok && result.output) {
      console.log(result.output);
      console.log('');
    }
  }

  const failed = results.filter((result) => !result.ok);

  console.log('—'.repeat(60));
  if (failed.length === 0) {
    console.log('✅ Doctor checks passed');
    process.exit(0);
  }

  console.log(`❌ Doctor detected ${failed.length} failing check(s)`);
  process.exit(1);
}

main();
