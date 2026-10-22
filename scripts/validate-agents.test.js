#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'validate-agents.js');
const fixturesRoot = path.join(repoRoot, 'scripts', 'fixtures', 'validate-agents');
const {
  frontmatterOf,
  analyzePermission,
  permissionChildBlock,
  parseMapEntries,
} = require('./lib/opencode-schema');

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

function testAllowAllSkillPasses(tmpRoot) {
  const fixture = path.join(tmpRoot, 'allow-all-skill');
  copyDirectory(path.join(fixturesRoot, 'allow-all-skill'), fixture);

  const result = runValidator(fixture);
  assert(result.status === 0, `Expected allow-all skill policy to pass. Output: ${result.output}`);
}

function testUnknownSkillWarns(tmpRoot) {
  const fixture = path.join(tmpRoot, 'unknown-skill');
  copyDirectory(path.join(fixturesRoot, 'unknown-skill'), fixture);

  const result = runValidator(fixture);
  assert(result.status === 0, `Expected unknown skill allow entry to warn, not fail. Output: ${result.output}`);
  assert(result.output.includes('may be a host skill'), 'Expected host-skill warning in output');
  assert(result.output.includes('not-a-real-skill'), 'Expected the warning to name the offending entry');
}

function testInvalidPermissionKeyFails(tmpRoot) {
  const fixture = path.join(tmpRoot, 'invalid-permission-key');
  copyDirectory(path.join(fixturesRoot, 'invalid-permission-key'), fixture);

  const result = runValidator(fixture);
  assert(result.status !== 0, 'Expected inert top-level permission key to fail validation');
  assert(
    result.output.includes('is not a recognized permission'),
    'Expected unrecognized permission-key error in output'
  );
}

function testInlineSkillChildFails(tmpRoot) {
  const fixture = path.join(tmpRoot, 'inline-skill');
  copyDirectory(path.join(fixturesRoot, 'inline-skill'), fixture);

  const result = runValidator(fixture);
  assert(result.status !== 0, 'Expected inline permission.skill to fail validation');
  assert(result.output.includes('permission.skill must be a block mapping'), 'Expected fail-closed message for inline skill child');
}

function testIndentedPermissionPasses(tmpRoot) {
  const fixture = path.join(tmpRoot, 'indented-permission');
  copyDirectory(path.join(fixturesRoot, 'indented-permission'), fixture);

  const result = runValidator(fixture);
  assert(result.status === 0, `Expected non-2-space indentation to be parsed. Output: ${result.output}`);
}

// Fail-closed: a read grant without .env denies must be an error, not a warning.
// Built inline so the negative case cannot drift from the check it covers.
function testReadWithoutEnvDenyFails(tmpRoot) {
  const fixture = path.join(tmpRoot, 'read-without-env-deny');
  const agentDir = path.join(fixture, '.opencode', 'agents');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, 'leaky.md'), [
    '---',
    'description: Agent with an unguarded read grant',
    'mode: subagent',
    'permission:',
    '  "*": "deny"',
    '  read: "allow"',
    '---',
    '',
    '## Role',
    'Reads files.',
    '',
  ].join('\n'));

  const result = runValidator(fixture);
  assert(result.status !== 0, `Expected read access without .env denies to fail validation. Output: ${result.output}`);
  assert(
    result.output.includes('read access without ".env": "deny"'),
    `Expected fail-closed .env message. Output: ${result.output}`
  );
}

// `.envrc` (direnv) also holds exported credentials, so a broad read map must
// deny it too; denying only the `.env` family is not enough.
function testReadWithoutEnvrcDenyFails(tmpRoot) {
  const fixture = writeAgentFixture(tmpRoot, 'read-without-envrc-deny', [
    'permission:',
    '  "*": "deny"',
    '  read:',
    '    "*": "allow"',
    '    "*.env": "deny"',
    '    "*.env.*": "deny"',
    '    "*.env.example": "allow"',
  ]);

  const result = runValidator(fixture);
  assert(result.status !== 0, `Expected read access without .envrc denies to fail validation. Output: ${result.output}`);
  assert(
    result.output.includes('".envrc": "deny"'),
    `Expected fail-closed .envrc message. Output: ${result.output}`
  );
}

// Writes a minimal agent fixture inline so negative cases cannot drift from the
// check they cover (only the validator is exercised, not the pack files).
function writeAgentFixture(tmpRoot, name, permissionLines) {
  const fixture = path.join(tmpRoot, name);
  const agentDir = path.join(fixture, '.opencode', 'agents');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, 'agent.md'), [
    '---',
    'description: Agent permission fixture',
    'mode: subagent',
    ...permissionLines,
    '---',
    '',
    '## Role',
    'Reads files.',
    '',
  ].join('\n'));
  return fixture;
}

function testScopedReadGrantPasses(tmpRoot) {
  const fixture = writeAgentFixture(tmpRoot, 'scoped-read', [
    'permission:',
    '  "*": "deny"',
    '  read:',
    '    "docs/**": "allow"',
  ]);

  const result = runValidator(fixture);
  assert(result.status === 0, `Expected a path-scoped read grant to pass. Output: ${result.output}`);
}

function testDuplicateReadBlockFails(tmpRoot) {
  const fixture = writeAgentFixture(tmpRoot, 'duplicate-read', [
    'permission:',
    '  "*": "deny"',
    '  read:',
    '    "*": "allow"',
    '    "*.env": "deny"',
    '    "*.env.*": "deny"',
    '  read:',
    '    "*": "allow"',
    '    "*.env": "deny"',
    '    "*.env.*": "deny"',
  ]);

  const result = runValidator(fixture);
  assert(result.status !== 0, `Expected duplicate permission.read blocks to fail. Output: ${result.output}`);
  assert(
    result.output.includes("duplicate 'permission.read' block"),
    `Expected duplicate read-block error. Output: ${result.output}`
  );
}

// Last match wins: an `.env` allow after the denies re-exposes secrets.
function testReadDenyBeforeAllowFails(tmpRoot) {
  const fixture = writeAgentFixture(tmpRoot, 'read-deny-before-allow', [
    'permission:',
    '  "*": "deny"',
    '  read:',
    '    "*": "allow"',
    '    "*.env": "deny"',
    '    "**/.env": "allow"',
    '    "*.env.*": "deny"',
    '    "*.envrc": "deny"',
    '    "*.envrc.*": "deny"',
  ]);

  const result = runValidator(fixture);
  assert(result.status !== 0, `Expected a later .env allow to fail validation. Output: ${result.output}`);
  assert(
    result.output.includes('last matching ".env" entry must be "deny"'),
    `Expected order error naming the re-exposed family. Output: ${result.output}`
  );
}

// The pack shell allowlist order is load-bearing under last-match-wins:
// wildcard first, then allows, then ask guards, then denies (denies win).
function testPackShellAllowlistOrdering() {
  for (const name of ['codebase', 'orchestrator', 'em-advisor']) {
    const file = path.join(repoRoot, '.opencode', 'agents', `${name}.md`);
    const frontmatter = frontmatterOf(fs.readFileSync(file, 'utf8'));
    const permission = analyzePermission(frontmatter);
    const bash = permissionChildBlock(permission.block, 'bash');
    const entries = [...parseMapEntries(bash.block).entries()];

    assert(entries.length > 0 && entries[0][0] === '*', `${name}: bash wildcard must be the first entry`);
    const lastAllow = entries.map(([, effect]) => effect === 'allow').lastIndexOf(true);
    const firstGuard = entries.findIndex(([key, effect]) => effect === 'ask' && key !== '*');
    const firstDeny = entries.findIndex(([, effect]) => effect === 'deny');

    assert(lastAllow !== -1 && firstGuard !== -1 && firstDeny !== -1, `${name}: expected allow, ask guard, and deny entries`);
    assert(lastAllow < firstGuard, `${name}: ask guards must come after the allows`);
    assert(firstGuard < firstDeny, `${name}: denies must come after the guards (last match wins)`);
  }
}

function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-validate-agents-'));

  try {
    console.log('Running agent validator tests...');
    testValidFixturePasses(tmpRoot);
    testAllowAllSkillPasses(tmpRoot);
    testInlineSkillChildFails(tmpRoot);
    testIndentedPermissionPasses(tmpRoot);
    testUnknownSkillWarns(tmpRoot);
    testInvalidPermissionKeyFails(tmpRoot);
    testReadWithoutEnvDenyFails(tmpRoot);
    testReadWithoutEnvrcDenyFails(tmpRoot);
    testScopedReadGrantPasses(tmpRoot);
    testDuplicateReadBlockFails(tmpRoot);
    testReadDenyBeforeAllowFails(tmpRoot);
    testPackShellAllowlistOrdering();
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
