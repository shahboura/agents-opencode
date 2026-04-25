#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'assess-risk-path.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runAssessment({ changedFiles, prBody, requireAck }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-risk-path-'));

  const changedFilesPath = path.join(tmpDir, 'changed-files.txt');
  fs.writeFileSync(changedFilesPath, `${changedFiles.join('\n')}\n`, 'utf8');

  const args = [
    scriptPath,
    '--changed-files-file',
    changedFilesPath,
    '--json',
  ];

  if (typeof prBody === 'string') {
    const prBodyPath = path.join(tmpDir, 'pr-body.txt');
    fs.writeFileSync(prBodyPath, prBody, 'utf8');
    args.push('--pr-body-file', prBodyPath);
  }

  if (requireAck) {
    args.push('--require-ack');
  }

  try {
    const output = execFileSync(process.execPath, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return {
      status: 0,
      payload: JSON.parse(output),
    };
  } catch (err) {
    const output = `${err.stdout || ''}${err.stderr || ''}`;
    return {
      status: err.status ?? 1,
      payload: JSON.parse(output),
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failure
    }
  }
}

function testHighRiskRequiresAcknowledgment() {
  const result = runAssessment({
    changedFiles: ['.github/workflows/validate.yml'],
    prBody: '## Risk & Rollback\n- Risk level: medium\n',
    requireAck: true,
  });

  assert(result.status !== 0, 'Expected high-risk change with medium acknowledgment to fail');
  assert(result.payload.computedRisk === 'high', 'Expected computed risk to be high');
  assert(result.payload.acknowledgedRisk === 'medium', 'Expected acknowledged risk to be medium');
  assert(result.payload.acknowledgmentSufficient === false, 'Expected acknowledgment to be insufficient');
}

function testHighRiskPassesWithHighAcknowledgment() {
  const result = runAssessment({
    changedFiles: ['.github/workflows/validate.yml'],
    prBody: '## Risk & Rollback\n- Risk level: high\n',
    requireAck: true,
  });

  assert(result.status === 0, 'Expected high-risk change with high acknowledgment to pass');
  assert(result.payload.computedRisk === 'high', 'Expected computed risk to be high');
  assert(result.payload.acknowledgmentSufficient === true, 'Expected acknowledgment to be sufficient');
}

function testMediumRiskPassesWithMediumAcknowledgment() {
  const result = runAssessment({
    changedFiles: ['scripts/validate-docs.js'],
    prBody: '## Risk & Rollback\n- Risk level: medium\n',
    requireAck: true,
  });

  assert(result.status === 0, 'Expected medium-risk change with medium acknowledgment to pass');
  assert(result.payload.computedRisk === 'medium', 'Expected computed risk to be medium');
}

function testLowRiskDoesNotRequireAcknowledgment() {
  const result = runAssessment({
    changedFiles: ['README.md'],
    prBody: '',
    requireAck: true,
  });

  assert(result.status === 0, 'Expected low-risk change to pass without acknowledgment');
  assert(result.payload.computedRisk === 'low', 'Expected computed risk to be low');
  assert(result.payload.requireAcknowledgment === false, 'Expected low-risk change to skip acknowledgment requirement');
}

function main() {
  try {
    console.log('Running risk-path assessment tests...');
    testHighRiskRequiresAcknowledgment();
    testHighRiskPassesWithHighAcknowledgment();
    testMediumRiskPassesWithMediumAcknowledgment();
    testLowRiskDoesNotRequireAcknowledgment();
    console.log('✅ Risk-path assessment tests passed');
  } catch (err) {
    console.error('❌ Risk-path assessment tests failed');
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
