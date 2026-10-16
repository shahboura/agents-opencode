#!/usr/bin/env node
'use strict';

/**
 * Tests for the OpenCode install-target adapter (scripts/lib/opencode-target.js).
 * The core invariant is that v1 and v2 config keys are never co-emitted.
 */

const target = require('./lib/opencode-target.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function testTargetsList() {
  assert(deepEqual(target.TARGETS, ['v1', 'v2']), 'TARGETS must be [v1, v2]');
}

function testResolveTarget() {
  const cases = [
    [{ requested: 'v1' }, 'v1'],
    [{ requested: 'v2' }, 'v2'],
    [{ requested: 'V2' }, 'v2'],
    [{ requested: 'auto' }, 'v1'],
    [{}, 'v1'],
    [{ requested: 'auto', detectedVersion: undefined }, 'v1'],
    [{ requested: 'auto', detectedVersion: '1.19.0' }, 'v1'],
    [{ requested: 'auto', detectedVersion: '1.4.2' }, 'v1'],
    [{ requested: 'auto', detectedVersion: 'v1.9.0' }, 'v1'],
    [{ requested: 'auto', detectedVersion: '2.0.0' }, 'v2'],
    [{ requested: 'auto', detectedVersion: '2.0.4' }, 'v2'],
    [{ requested: 'auto', detectedVersion: 'v2.7.1' }, 'v2'],
    [{ requested: 'auto', detectedVersion: 'opencode 2.0.4' }, 'v2'],
    [{ requested: 'auto', detectedVersion: 'garbage' }, 'v1'],
    // Dotted-token preference: a leading bare number must not be read as the major.
    [{ requested: 'auto', detectedVersion: 'build 2024 1.19.0' }, 'v1'],
    [{ requested: 'v1', detectedVersion: '2.5.0' }, 'v1'],
    [{ requested: 'v2', detectedVersion: '1.0.0' }, 'v2'],
  ];

  for (const [input, expected] of cases) {
    assert(
      target.resolveTarget(input) === expected,
      `resolveTarget(${JSON.stringify(input)}) should be '${expected}'`
    );
  }

  let threw = false;
  try {
    target.resolveTarget({ requested: 'v3' });
  } catch {
    threw = true;
  }
  assert(threw, 'resolveTarget must reject an unknown target');
}

function testParseHostMajor() {
  const cases = [
    ['1.19.0', 1],
    ['2.0.4', 2],
    ['v2.1', 2],
    ['opencode 2.0.4', 2],
    ['V2', 2],
    ['2', 2],
    ['10.0', 10],
    ['3.0.0-beta.1', 3],
    // A bare number before the real version must not be read as the major: the
    // dotted token wins, so "2024" in the banner is ignored.
    ['build 2024 1.19.0', 1],
    ['garbage', undefined],
    ['', undefined],
    ['   ', undefined],
    [undefined, undefined],
    [null, undefined],
    // Non-string input is stringified; a bare "42" parses to major 42.
    [42, 42],
  ];

  for (const [input, expected] of cases) {
    assert(
      target.parseHostMajor(input) === expected,
      `parseHostMajor(${JSON.stringify(input)}) should be ${expected}`
    );
  }
}

function testDetectHostVersionOverride() {
  // A non-empty override must be returned verbatim and must not probe the host,
  // so this stays hermetic even when an `opencode` binary is present.
  assert(
    target.detectHostVersion({ env: { AGENTS_OPENCODE_HOST_VERSION: '2.0.4' } }) === '2.0.4',
    'detectHostVersion should return the env override verbatim'
  );
  assert(
    target.detectHostVersion({ env: { AGENTS_OPENCODE_HOST_VERSION: 'opencode 2.0.4' } }) === 'opencode 2.0.4',
    'detectHostVersion should return non-version override text verbatim'
  );
}

function testConfigKeysFor() {
  const v1 = target.configKeysFor('v1');
  assert(v1.permissionKey === 'permission', 'v1 permissionKey should be permission');
  assert(v1.pluginKey === 'plugin', 'v1 pluginKey should be plugin');
  assert(v1.schema === 'https://opencode.ai/config.json', 'v1 schema URL');
  assert(deepEqual(v1.managedKeys, ['$schema', 'plugin', 'permission']), 'v1 managedKeys');

  const v2 = target.configKeysFor('v2');
  assert(v2.permissionKey === 'permissions', 'v2 permissionKey should be permissions');
  assert(v2.pluginKey === 'plugins', 'v2 pluginKey should be plugins');
  assert(v2.schema === 'https://opencode.ai/config.json', 'v2 schema URL');
  assert(deepEqual(v2.managedKeys, ['$schema', 'plugins', 'permissions']), 'v2 managedKeys');
}

function testEmitConfigExclusiveKeys() {
  const source = {
    $schema: 'https://opencode.ai/config.json',
    plugin: ['my-plugin'],
    permission: { bash: 'ask', task: 'deny', doom_loop: 'deny', external_directory: 'deny' },
  };

  const v1 = target.emitConfig(source, 'v1');
  assert(Array.isArray(v1.plugin) && v1.plugin[0] === 'my-plugin', 'v1 emits plugin');
  assert(!('plugins' in v1), 'v1 must not emit plugins');
  assert(v1.permission && v1.permission.bash === 'ask', 'v1 emits permission object');
  assert(!('permissions' in v1), 'v1 must not emit permissions');
  assert(v1.permission.doom_loop === 'deny', 'v1 keeps doom_loop');

  const v2 = target.emitConfig(source, 'v2');
  assert(Array.isArray(v2.plugins) && v2.plugins[0] === 'my-plugin', 'v2 emits plugins');
  assert(!('plugin' in v2), 'v2 must not emit plugin');
  assert(Array.isArray(v2.permissions), 'v2 emits permissions array');
  assert(!('permission' in v2), 'v2 must not emit permission');

  const actions = v2.permissions.map((rule) => rule.action);
  assert(actions.includes('shell'), 'bash should map to shell');
  assert(actions.includes('subagent'), 'task should map to subagent');
  assert(!actions.includes('bash') && !actions.includes('task'), 'v1 action names must be dropped');
  assert(!actions.includes('doom_loop'), 'doom_loop must be dropped in v2');
  assert(actions.includes('external_directory'), 'external_directory survives in v2');
  assert(
    v2.permissions.every((rule) => typeof rule.action === 'string' && typeof rule.resource === 'string' && typeof rule.effect === 'string'),
    'v2 rules must be { action, resource, effect } strings'
  );

  // Never both keys, for either target.
  for (const emitted of [v1, v2]) {
    const keys = Object.keys(emitted);
    assert(!(keys.includes('plugin') && keys.includes('plugins')), 'must not co-write plugin + plugins');
    assert(!(keys.includes('permission') && keys.includes('permissions')), 'must not co-write permission + permissions');
  }
}

function testEmitConfigDefaults() {
  const emitted = target.emitConfig({}, 'v2');
  assert(emitted.$schema === 'https://opencode.ai/config.json', 'emitConfig should default the schema');
  assert(!('permissions' in emitted), 'emitConfig with no permission source should not fabricate permissions');
}

function testEmitConfigNeverCarriesV2IgnoredKeys() {
  // Characterization test for the *output contract*, not strip coverage:
  // `emitConfig` only ever copies its managed keys (`$schema` / plugin /
  // permission), so a source carrying the documented v1-only legacy settings
  // can never leak them into either target's output. This passes with the
  // defensive `stripV2IgnoredKeys` call removed — the strip is not the
  // mechanism that keeps the output clean, and this test cannot detect its
  // removal (it "cannot regress-fail" on that change by construction). The
  // strip function itself is covered directly by `testStripV2IgnoredKeys`;
  // this test pins the observable invariant a future emission change starts
  // from (copying source keys without stripping would fail here).
  const source = {
    $schema: 'https://opencode.ai/config.json',
    plugin: ['agents-opencode'],
    permission: { bash: 'ask' },
    subagent_depth: 2,
    logLevel: 'debug',
    server: { port: 4096 },
    compaction: { prune: true, tail_turns: 3 },
  };

  const v2 = target.emitConfig(source, 'v2');
  for (const key of target.V2_IGNORED_TOP_LEVEL_KEYS) {
    assert(!(key in v2), `v2 emit must omit the v1-only '${key}'`);
  }
  assert(!('compaction' in v2), 'v2 emit must not carry the v1-only compaction settings');
  assert(Array.isArray(v2.permissions), 'v2 emit must still translate the permission object');

  const v1 = target.emitConfig(source, 'v1');
  assert(
    deepEqual(v1, {
      $schema: 'https://opencode.ai/config.json',
      plugin: ['agents-opencode'],
      permission: { bash: 'ask' },
    }),
    'v1 emit must stay exactly { $schema, plugin, permission } for the same source'
  );
}

function testStripV2IgnoredKeys() {
  // Nested compaction: ignored members are stripped, supported members stay.
  const nested = { compaction: { prune: true, tail_turns: 1, auto: true, keep: 2 } };
  const returned = target.stripV2IgnoredKeys(nested);
  assert(returned === nested, 'stripV2IgnoredKeys must mutate and return the config');
  assert(
    deepEqual(nested.compaction, { auto: true, keep: 2 }),
    'stripV2IgnoredKeys must keep only the supported compaction members'
  );

  // A compaction object emptied by stripping is dropped entirely.
  const emptied = { compaction: { prune: true, tail_turns: 1 } };
  target.stripV2IgnoredKeys(emptied);
  assert(!('compaction' in emptied), 'an emptied compaction object must be dropped');

  // Top-level ignored keys are stripped; unrelated keys are untouched.
  const topLevel = {
    subagent_depth: 2,
    logLevel: 'debug',
    server: { port: 4096 },
    share: 'disabled',
    compaction: { auto: true },
  };
  target.stripV2IgnoredKeys(topLevel);
  for (const key of target.V2_IGNORED_TOP_LEVEL_KEYS) {
    assert(!(key in topLevel), `stripV2IgnoredKeys must remove '${key}'`);
  }
  assert(topLevel.share === 'disabled', 'supported top-level keys must be untouched');
  assert(
    deepEqual(topLevel.compaction, { auto: true }),
    'a compaction object with supported members must survive'
  );

  // A config without the ignored keys is returned unchanged (same object).
  const clean = { $schema: 'https://opencode.ai/config.json', share: 'disabled' };
  const snapshot = JSON.stringify(clean);
  const cleanResult = target.stripV2IgnoredKeys(clean);
  assert(cleanResult === clean, 'a clean config must be returned as-is');
  assert(JSON.stringify(clean) === snapshot, 'a clean config must be unchanged');
}

function testRevertKeysFor() {
  assert(deepEqual(target.revertKeysFor('v1'), ['$schema', 'plugin', 'permission']), 'v1 revert keys');
  assert(deepEqual(target.revertKeysFor('v2'), ['$schema', 'plugins', 'permissions']), 'v2 revert keys');
}

function testConfigPatchShape() {
  const v2 = target.configPatchShape('v2');
  assert(v2.target === 'v2', 'patch target');
  assert(v2.permissionKey === 'permissions' && v2.pluginKey === 'plugins', 'patch keys');
  assert(Array.isArray(v2.addedPermissionKeys) && Array.isArray(v2.addedPermissionRules), 'patch permission arrays');
  assert(Array.isArray(v2.addedPluginEntries), 'patch plugin array');
  assert(v2.createdFile === false && v2.changed === false && v2.skipped === false, 'patch defaults');

  const v1 = target.configPatchShape('v1');
  assert(v1.target === 'v1' && v1.permissionKey === 'permission' && v1.pluginKey === 'plugin', 'v1 patch shape');
}

function testPluginEntrypoints() {
  assert(target.pluginEntrypoints('v1').exportName === 'AgentsOpencodePlugin', 'v1 named export');
  assert(target.pluginEntrypoints('v2').exportName === 'default', 'v2 default export');
  assert(target.pluginEntrypoints('v1').file === target.pluginEntrypoints('v2').file, 'both entrypoints share one file');
}

function testTransformsPassthrough() {
  const text = '---\ndescription: x\nmode: subagent\n---\nbody\n';
  for (const t of ['v1', 'v2']) {
    assert(target.transformAgentFrontmatter(text, t) === text, `agent transform passthrough (${t})`);
    assert(target.transformCommandFrontmatter(text, t) === text, `command transform passthrough (${t})`);
    assert(target.transformSkillFrontmatter(text, t) === text, `skill transform passthrough (${t})`);
  }
}

function testUnknownTargetThrows() {
  let threw = 0;
  for (const fn of [target.configKeysFor, target.configPatchShape, target.revertKeysFor, target.pluginEntrypoints]) {
    try {
      fn('v9');
    } catch {
      threw += 1;
    }
  }
  assert(threw === 4, 'all target-keyed helpers must reject an unknown target');
}

function main() {
  try {
    console.log('Running OpenCode target adapter tests...');
    testTargetsList();
    testResolveTarget();
    testParseHostMajor();
    testDetectHostVersionOverride();
    testConfigKeysFor();
    testEmitConfigExclusiveKeys();
    testEmitConfigDefaults();
    testEmitConfigNeverCarriesV2IgnoredKeys();
    testStripV2IgnoredKeys();
    testRevertKeysFor();
    testConfigPatchShape();
    testPluginEntrypoints();
    testTransformsPassthrough();
    testUnknownTargetThrows();
    console.log('✅ OpenCode target adapter tests passed');
  } catch (err) {
    console.error('❌ OpenCode target adapter tests failed');
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
