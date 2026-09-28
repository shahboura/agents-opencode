#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'validate-opencode-schema.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function writeFile(root, relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function seedFixture(root) {
  writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
    '---',
    'description: Test agent',
    'mode: subagent',
    '---',
    '',
    '# Test Agent',
    '',
  ].join('\n'));

  writeFile(root, path.join('.opencode', 'skills', 'good', 'SKILL.md'), [
    '---',
    'name: good',
    'description: A good skill used for schema conformance testing.',
    '---',
    '',
    '# Good',
    '',
  ].join('\n'));

  writeFile(root, path.join('.opencode', 'commands', 'bar.md'), [
    '---',
    'description: Test command',
    'agent: foo',
    'subtask: true',
    '---',
    '',
    'Do the thing.',
    '',
  ].join('\n'));

  writeFile(root, 'opencode.json', JSON.stringify({ $schema: 'https://opencode.ai/config.json' }, null, 2));
}

function runValidator(root, args = []) {
  try {
    const output = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: root,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output };
  } catch (err) {
    return { status: err.status ?? 1, output: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

function withFixture(setup, args = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-schema-'));
  try {
    seedFixture(root);
    if (setup) setup(root);
    return runValidator(root, args);
  } finally {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

function testValidFixturePasses() {
  const result = withFixture();
  assert(result.status === 0, `Expected valid fixture to pass. Output: ${result.output}`);
}

function testSkillNameMismatchFails() {
  const result = withFixture((root) => {
    // Directory is 'good' but name claims 'other'.
    writeFile(root, path.join('.opencode', 'skills', 'good', 'SKILL.md'), [
      '---',
      'name: other',
      'description: Mismatched name.',
      '---',
      '',
      '# Good',
      '',
    ].join('\n'));
  });
  assert(result.status !== 0, 'Expected skill name/directory mismatch to fail');
  assert(result.output.includes('must match the directory name'), 'Expected mismatch message');
}

function testUnknownSkillFieldFails() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'skills', 'good', 'SKILL.md'), [
      '---',
      'name: good',
      'description: Has an unknown field.',
      'allowed-tools: Bash',
      '---',
      '',
      '# Good',
      '',
    ].join('\n'));
  });
  assert(result.status !== 0, 'Expected unknown skill frontmatter field to fail');
  assert(result.output.includes('unrecognized frontmatter field'), 'Expected unknown field message');
}

function testUnknownCommandFieldFails() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'commands', 'bar.md'), [
      '---',
      'description: Test command',
      'agent: foo',
      'bogus-field: nope',
      '---',
      '',
      'Do the thing.',
      '',
    ].join('\n'));
  });
  assert(result.status !== 0, 'Expected unknown command field to fail');
  assert(result.output.includes("unrecognized frontmatter field 'bogus-field'"), 'Expected unknown command field message');
}

function testUnknownPermissionKeyFails() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'permission:',
      '  "*": "deny"',
      '  bogus: "allow"',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  });
  assert(result.status !== 0, 'Expected unknown permission key to fail');
  assert(result.output.includes("unrecognized permission key 'bogus'"), 'Expected unknown permission message');
}

function testV2FlagIsNonFailing() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({ $schema: 'https://opencode.ai/config.json', plugin: ['x'] }, null, 2));
  });
  // --v2 is informational; it must not change the exit code.
  const resultV2 = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({ $schema: 'https://opencode.ai/config.json', plugin: ['x'] }, null, 2));
  }, ['--v2']);
  assert(result.status === 0, 'Expected v1 fixture to pass');
  assert(resultV2.status === 0, 'Expected --v2 to remain non-failing');
}

function main() {
  try {
    console.log('Running OpenCode schema validator tests...');
    testValidFixturePasses();
    testSkillNameMismatchFails();
    testUnknownSkillFieldFails();
    testUnknownCommandFieldFails();
    testUnknownPermissionKeyFails();
    testV2FlagIsNonFailing();
    console.log('✅ OpenCode schema validator tests passed');
  } catch (err) {
    console.error('❌ OpenCode schema validator tests failed');
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
