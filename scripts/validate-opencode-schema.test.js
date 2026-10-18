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
    'permission:',
    '  "*": "deny"',
    '  read: "allow"',
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

function testUnknownSkillFieldWarns() {
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
  // OpenCode ignores unknown skill fields, so this must warn (not fail).
  assert(result.status === 0, 'Expected unknown skill field to warn, not fail');
  assert(result.output.includes('unrecognized frontmatter field'), 'Expected warning message');
}

function testQuotedUnknownKeyWarns() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'skills', 'good', 'SKILL.md'), [
      '---',
      'name: good',
      'description: Has a quoted unknown key.',
      '"allowed-tools": Bash',
      '---',
      '',
      '# Good',
      '',
    ].join('\n'));
  });
  assert(result.status === 0, 'Expected quoted unknown key to warn, not fail');
  assert(result.output.includes('unrecognized frontmatter field'), 'Expected quoted key to be detected');
}

function testIndentedKeysIgnored() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'skills', 'good', 'SKILL.md'), [
      '---',
      'name: good',
      'description: Has nested metadata.',
      'metadata:',
      '  audience: developers',
      '  workflow: documentation',
      '---',
      '',
      '# Good',
      '',
    ].join('\n'));
  });
  assert(result.status === 0, `Expected indented keys to be ignored. Output: ${result.output}`);
  assert(!result.output.includes("'workflow'"), 'Expected nested workflow key not flagged as top-level');
  assert(!result.output.includes("'audience'"), 'Expected nested audience key not flagged as top-level');
}

function testInlineNestedPermissionFails() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'permission:',
      '  "*": "deny"',
      '  skill: { "*": "allow" }',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  });
  assert(result.status !== 0, 'Expected inline nested permission.skill to fail');
  assert(result.output.includes('permission.skill must be a block mapping'), 'Expected nested fail-closed message');
}

function testEmptyNestedPermissionFails() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'permission:',
      '  "*": "deny"',
      '  skill:',
      '  task:',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  });
  assert(result.status !== 0, 'Expected empty nested permission children to fail');
}

function testTrailingCommentOnChildKeyPasses() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'permission:',
      '  "*": "deny"',
      '  skill:  # allowlist',
      '    "*": "deny"',
      '    "good": "allow"',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  });
  assert(result.status === 0, `Expected trailing comment on child key to parse as block. Output: ${result.output}`);
}

function testDuplicateNestedPermissionFails() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'permission:',
      '  "*": "deny"',
      '  skill:',
      '    "*": "deny"',
      '  skill:',
      '    "*": "allow"',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  });
  assert(result.status !== 0, 'Expected duplicate nested permission.skill to fail');
  assert(result.output.includes('duplicate permission.skill block'), 'Expected nested duplicate message');
}

function testDuplicatePermissionFails() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'permission:',
      '  "*": "deny"',
      '  read: "allow"',
      'permission:',
      '  "*": "allow"',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  });
  assert(result.status !== 0, 'Expected duplicate permission block to fail');
  assert(result.output.includes("duplicate 'permission' block"), 'Expected duplicate permission message');
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

function testInlinePermissionFailsClosed() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'permission: {}',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  });
  assert(result.status !== 0, 'Expected inline permission map to fail closed');
  assert(result.output.includes('block mapping'), 'Expected fail-closed message for inline permission');
}

function testNestedPermissionPatternsAllowed() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'permission:',
      '  "*": "deny"',
      '  bash:',
      '    "*": "ask"',
      '    "rm -rf *": "deny"',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  });
  assert(result.status === 0, `Expected nested bash patterns to be accepted. Output: ${result.output}`);
}

function testFoldedDescriptionPasses() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'skills', 'good', 'SKILL.md'), [
      '---',
      'name: good',
      'description: >-',
      '  A folded description that spans',
      '  multiple lines for the good skill.',
      '---',
      '',
      '# Good',
      '',
    ].join('\n'));
  });
  assert(result.status === 0, `Expected folded (>) description to parse. Output: ${result.output}`);
}

function testMissingConfigFails() {
  const result = withFixture((root) => {
    fs.rmSync(path.join(root, 'opencode.json'), { force: true });
  });
  assert(result.status !== 0, 'Expected missing opencode.json to fail');
  assert(result.output.includes('file not found'), 'Expected file-not-found message');
}

function testStrictPromotesMissingPermission() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  }, ['--strict']);
  assert(result.status !== 0, 'Expected --strict to fail an agent without a permission block');
}

function testStrictPromotesLegacyTools() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'tools:',
      '  write: true',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  }, ['--strict']);
  assert(result.status !== 0, 'Expected --strict to fail a legacy tools: block');
}

function testStrictPassesCleanFixture() {
  const result = withFixture(null, ['--strict']);
  assert(result.status === 0, `Expected clean fixture to pass --strict. Output: ${result.output}`);
}

function testV2ReportsGaps() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({ $schema: 'https://opencode.ai/config.json', plugin: ['x'] }, null, 2));
  }, ['--v2']);
  assert(result.status === 0, 'Expected --v2 to remain non-failing for a clean fixture');
  assert(result.output.includes('v2 readiness'), 'Expected --v2 to emit the readiness section');
  assert(result.output.includes("'plugin' (singular)"), 'Expected --v2 to report the plugin gap');
}

function testV2PreservesFailure() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'skills', 'good', 'SKILL.md'), '---\nname: good\n---\n\n# Good\n');
  }, ['--v2']);
  assert(result.status !== 0, 'Expected a missing skill description to still fail under --v2');
}

function testWarningsOnlyExitsZero() {
  const result = withFixture((root) => {
    // Agent without a permission section -> warning only, must not fail.
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  });
  assert(result.status === 0, 'Expected warnings-only run to exit 0');
}

// --- v2-strict ------------------------------------------------------------
// The emitted v2 config (from the v1 source) must be v2-conformant. Rules:
// (a) no v1-only keys, (b) no co-declared key sets, (d) { action, resource,
// effect } v2 rules. Rule (c) top-level key policy is source-dependent: the
// installer's adapter output is held to the strict allowlist, but a hand-authored
// in-place v2 file may carry extra legitimate v2 keys (share, model, ...).

function testV2StrictPassesCleanFixture() {
  const result = withFixture(null, ['--v2-strict']);
  assert(result.status === 0, `Expected clean fixture to pass --v2-strict. Output: ${result.output}`);
  assert(result.output.includes('v2-strict validation passed'), 'Expected v2-strict pass summary');
}

function testV2StrictPassesValidV2Config() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permissions: [{ action: 'external_directory', resource: '*', effect: 'deny' }],
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status === 0, `Expected a valid v2 config to pass --v2-strict. Output: ${result.output}`);
}

function testV2StrictNotesAutoTranslation() {
  const result = withFixture(null, ['--v2-strict']);
  assert(result.status === 0, 'Expected auto-translated frontmatter to be informational, not failing');
  assert(result.output.includes('auto-translation'), 'Expected an auto-translation info note');
}

function testV2StrictFailsCoDeclaredKeySets() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permission: { read: 'allow' },
      permissions: [{ action: 'read', resource: '*', effect: 'allow' }],
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status !== 0, 'Expected co-declared permission+permissions to fail');
  assert(result.output.includes("'permission' and 'permissions' must never co-exist"), 'Expected co-existence message');
}

function testV2StrictAllowsInPlaceExtraV2Keys() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permissions: [{ action: 'read', resource: '*', effect: 'allow' }],
      share: 'disabled',
      model: 'anthropic/claude-sonnet-4',
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status === 0, `Expected extra legitimate v2 keys to pass --v2-strict. Output: ${result.output}`);
  assert(!result.output.includes("'share'"), 'Expected the v2 key share not to be flagged');
  assert(!result.output.includes("'model'"), 'Expected the v2 key model not to be flagged');
}

function testV2StrictFailsInstallerLeakedV1Key() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permissions: [{ action: 'read', resource: '*', effect: 'allow' }],
      permission: { read: 'allow' },
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status !== 0, 'Expected an installer-leaked v1-only key to fail in place');
  assert(result.output.includes("v1-only key 'permission'"), 'Expected installer-leaked v1-only key message');
}

function testV2StrictFailsRenamedAction() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permissions: [{ action: 'bash', resource: '*', effect: 'deny' }],
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status !== 0, 'Expected a v1 action name in a v2 rule to fail');
  assert(result.output.includes("'bash' is not a v2 action"), 'Expected v1-action message');
}

function testV2StrictFailsOtherV1OnlyActions() {
  for (const action of ['task', 'write', 'patch', 'doom_loop', 'lsp']) {
    const result = withFixture((root) => {
      writeFile(root, 'opencode.json', JSON.stringify({
        $schema: 'https://opencode.ai/config.json',
        permissions: [{ action, resource: '*', effect: 'deny' }],
      }, null, 2));
    }, ['--v2-strict']);
    assert(result.status !== 0, `Expected the v1-only action '${action}' to fail`);
    assert(result.output.includes(`'${action}' is not a v2 action`), `Expected a v1-only action message for '${action}'`);
  }
}

function testV2StrictAllowsPluginAndExecuteActions() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permissions: [
        { action: 'browser', resource: '*', effect: 'deny' },
        { action: 'execute', resource: '*', effect: 'allow' },
        { action: 'todowrite', resource: '*', effect: 'allow' },
      ],
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status === 0, `Expected plugin-defined, execute, and legacy-but-plugin actions to pass. Output: ${result.output}`);
}

function testV2StrictWarnsUnknownAction() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permissions: [{ action: 'shel', resource: '*', effect: 'allow' }],
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status === 0, 'An unknown action should warn, not fail');
  assert(result.output.includes("unrecognized v2 action 'shel'"), 'Expected an advisory unknown-action warning');
}

function testV2StrictAcceptsToleratedV1Actions() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permission: { todowrite: 'allow', list: 'allow' },
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status === 0, `Expected adapter output with tolerated v1 actions to pass. Output: ${result.output}`);
}

function testV2StrictFailsNestedV1OnlyAction() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      agents: { reviewer: { permissions: [{ action: 'bash', resource: '*', effect: 'deny' }] } },
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status !== 0, 'Expected a v1-only action under agents.<id>.permissions to fail');
  assert(result.output.includes("agents.reviewer.permissions rule 0"), 'Expected the nested rule location in the message');
}

function testV2StrictFailsMalformedRuleShape() {
  const result = withFixture((root) => {
    writeFile(root, 'opencode.json', JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permissions: [{ action: 'read', resource: '*' }],
    }, null, 2));
  }, ['--v2-strict']);
  assert(result.status !== 0, 'Expected a rule missing its effect to fail');
  assert(result.output.includes("non-empty string 'effect'"), 'Expected rule-shape message');
}

function testV2StrictFailsUntranslatedAgentToken() {
  const result = withFixture((root) => {
    writeFile(root, path.join('.opencode', 'agents', 'foo.md'), [
      '---',
      'description: Test agent',
      'mode: subagent',
      'tools:',
      '  write: true',
      '---',
      '',
      '# Test Agent',
      '',
    ].join('\n'));
  }, ['--v2-strict']);
  assert(result.status !== 0, "Expected an untranslatable 'tools:' block to fail --v2-strict");
  assert(result.output.includes('does not translate'), 'Expected untranslated-token message');
}

function main() {
  try {
    console.log('Running OpenCode schema validator tests...');
    testValidFixturePasses();
    testSkillNameMismatchFails();
    testUnknownSkillFieldWarns();
    testQuotedUnknownKeyWarns();
    testIndentedKeysIgnored();
    testInlineNestedPermissionFails();
    testEmptyNestedPermissionFails();
    testTrailingCommentOnChildKeyPasses();
    testDuplicateNestedPermissionFails();
    testDuplicatePermissionFails();
    testUnknownCommandFieldFails();
    testUnknownPermissionKeyFails();
    testInlinePermissionFailsClosed();
    testNestedPermissionPatternsAllowed();
    testFoldedDescriptionPasses();
    testMissingConfigFails();
    testStrictPromotesMissingPermission();
    testStrictPromotesLegacyTools();
    testStrictPassesCleanFixture();
    testV2ReportsGaps();
    testV2PreservesFailure();
    testWarningsOnlyExitsZero();
    testV2StrictPassesCleanFixture();
    testV2StrictPassesValidV2Config();
    testV2StrictNotesAutoTranslation();
    testV2StrictFailsCoDeclaredKeySets();
    testV2StrictAllowsInPlaceExtraV2Keys();
    testV2StrictFailsInstallerLeakedV1Key();
    testV2StrictFailsRenamedAction();
    testV2StrictFailsOtherV1OnlyActions();
    testV2StrictAllowsPluginAndExecuteActions();
    testV2StrictWarnsUnknownAction();
    testV2StrictAcceptsToleratedV1Actions();
    testV2StrictFailsNestedV1OnlyAction();
    testV2StrictFailsMalformedRuleShape();
    testV2StrictFailsUntranslatedAgentToken();
    console.log('✅ OpenCode schema validator tests passed');
  } catch (err) {
    console.error('❌ OpenCode schema validator tests failed');
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
