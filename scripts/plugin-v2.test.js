#!/usr/bin/env node
'use strict';

/**
 * Proves the secret-read guard blocks the *same* paths on the v2 hook path as
 * on v1, and that the *wiring* (event shape -> policy) is correct — not just the
 * policy core.
 *
 * The policy core lives in .opencode/lib/guards.mjs (`readGuardError`, a thin
 * wrapper over `isBlockedReadPath`). The plugin never calls it directly; it
 * calls `handleToolExecuteBefore`, which maps the raw event onto the core.
 * These tests drive that helper with every documented event shape:
 * - v2 `ctx.tool.hook("execute.before")` event: `{ tool, input: { filePath } }`,
 *   `{ tool, input: { args: { filePath } } }`, and flat `{ tool, filePath }`
 * - v1 `tool.execute.before(input, output)`: output `{ args: { filePath } }`
 * Both entrypoints must throw (block), not merely `ask`.
 */

const path = require('path');
const { pathToFileURL } = require('url');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const guardsPath = path.join(process.cwd(), '.opencode', 'lib', 'guards.mjs');
  const { readGuardError, isBlockedReadPath, injectContextOnce, handleToolExecuteBefore } =
    await import(pathToFileURL(guardsPath).href);

  const packSkillsPath = path.join(process.cwd(), '.opencode', 'lib', 'pack-skills.mjs');
  const { shouldRegisterPackSkills, buildSkillInfo } = await import(
    pathToFileURL(packSkillsPath).href
  );

  const blocked = [
    '/x/.env',
    '/x/.env.local',
    '/x/production.env',
    '/x/id_rsa',
    '/x/id_ed25519',
    '/x/id_ecdsa',
    '/x/credentials.json',
    '/x/credentials.yaml',
    '/x/credentials.yml',
    '/x/secrets.yaml',
    '/x/secrets.yml',
    '/x/secrets.json',
    '/x/.npmrc',
    '/x/.netrc',
    '/x/server.p12',
    '/x/app.pfx',
    '/x/app.jks',
    '/x/app.keystore',
    '/x/private.pem',
    '/x/server.key',
    'C:\\Users\\me\\deck.key',
  ];

  const allowed = [
    '/x/.env.example',
    '/x/.env.sample',
    '/x/.env.template',
    '/x/.env.dist',
    '/x/.env.defaults',
    '/x/production.env.example',
    '/x/ca.pem',
    '/x/cert.pem',
    '/x/certificate.pem',
    '/x/chain.pem',
    '/x/fullchain.pem',
    '/x/key.pub',
    '/x/server.crt',
    '/x/cert.cer',
    '/x/env',
    '/x/myenv',
    '/x/monkey',
    '/x/src/app.ts',
    '/x/README.md',
  ];

  for (const filePath of blocked) {
    assert(isBlockedReadPath(filePath), `isBlockedReadPath must block: ${filePath}`);

    const v1 = readGuardError('read', { args: { filePath } }); // v1 hook payload
    const v2 = readGuardError('read', { filePath }); // v2 event payload

    assert(v1, `v1 hook must block: ${filePath}`);
    assert(v2, `v2 hook must block: ${filePath}`);
    assert(v1 === v2, `v1 and v2 must produce the same block message for: ${filePath}`);
    assert(
      typeof v2 === 'string' && v2.length > 0,
      `v2 must produce a throw-able block (not ask) for: ${filePath}`
    );
  }

  for (const filePath of allowed) {
    assert(!isBlockedReadPath(filePath), `isBlockedReadPath must allow: ${filePath}`);
    assert(readGuardError('read', { args: { filePath } }) === null, `v1 hook must allow: ${filePath}`);
    assert(readGuardError('read', { filePath }) === null, `v2 hook must allow: ${filePath}`);
  }

  // Non-read tools and malformed payloads are never blocked on either path.
  assert(readGuardError('bash', { filePath: '/x/.env' }) === null, 'v1/v2: non-read tool must not be blocked');
  assert(readGuardError('read', {}) === null, 'v2: missing filePath must be allowed');
  assert(readGuardError('read', { args: {} }) === null, 'v1: missing filePath must be allowed');
  assert(readGuardError('read', { filePath: 42 }) === null, 'v2: non-string filePath must be allowed');
  assert(readGuardError(undefined, { filePath: '/x/.env' }) === null, 'v2: undefined tool must be allowed');

  // --- handleToolExecuteBefore: proves the EVENT WIRING, not just the policy ---
  // The plugin maps each runtime event onto the guard through this helper. If the
  // plugin passed the wrong event field (e.g. `event.info` instead of
  // `event.input`), the policy core would still pass the tests above but the
  // guard would silently fail open in production. Driving the helper with every
  // documented event shape closes that gap.
  const shapeFactories = {
    'v2 { tool, input: { filePath } }': (filePath) => ({ tool: 'read', input: { filePath } }),
    'v2 { tool, input: { args: { filePath } } }': (filePath) => ({
      tool: 'read',
      input: { args: { filePath } },
    }),
    'v2 flat { tool, filePath }': (filePath) => ({ tool: 'read', filePath }),
  };

  for (const filePath of blocked) {
    // Policy-core reference message (v1 payload) that every shape must match.
    const expected = readGuardError('read', { args: { filePath } });
    assert(expected, `policy core must block: ${filePath}`);

    for (const [shape, make] of Object.entries(shapeFactories)) {
      const event = make(filePath);
      const wholeEvent = handleToolExecuteBefore(event); // `handleToolExecuteBefore(event)`
      const splitPair = handleToolExecuteBefore(event.tool, event); // `(tool, payload)`

      assert(wholeEvent, `${shape} must block via helper: ${filePath}`);
      assert(splitPair, `${shape} must block via (tool, payload): ${filePath}`);
      assert(wholeEvent === expected, `${shape} helper message must match policy: ${filePath}`);
      assert(splitPair === expected, `${shape} (tool,payload) message must match policy: ${filePath}`);
      assert(
        readGuardError(event.tool, event) === expected,
        `${shape} must resolve the path from the whole event: ${filePath}`
      );
    }

    // v1 `tool.execute.before` output shape, passed with the tool separately.
    const v1 = handleToolExecuteBefore('read', { args: { filePath } });
    assert(v1 === expected, `v1 output payload must block via helper: ${filePath}`);
  }

  for (const filePath of allowed) {
    for (const [shape, make] of Object.entries(shapeFactories)) {
      const event = make(filePath);
      assert(
        handleToolExecuteBefore(event) === null,
        `${shape} must allow via helper: ${filePath}`
      );
      assert(
        handleToolExecuteBefore(event.tool, event) === null,
        `${shape} must allow via (tool, payload): ${filePath}`
      );
    }
    assert(
      handleToolExecuteBefore('read', { args: { filePath } }) === null,
      `v1 output payload must allow via helper: ${filePath}`
    );
  }

  // Non-read tools and malformed/missing shapes never block on any form.
  assert(
    handleToolExecuteBefore({ tool: 'bash', input: { filePath: '/x/.env' } }) === null,
    'helper: non-read tool must not be blocked'
  );
  assert(handleToolExecuteBefore({ tool: 'read', input: {} }) === null, 'helper: missing path must be allowed');
  assert(handleToolExecuteBefore({ tool: 'read', filePath: 42 }) === null, 'helper: non-string path must be allowed');
  assert(handleToolExecuteBefore({ tool: 'read' }) === null, 'helper: pathless read must be allowed');
  assert(handleToolExecuteBefore(undefined) === null, 'helper: undefined event must be a safe no-op');
  assert(handleToolExecuteBefore(null) === null, 'helper: null event must be a safe no-op');
  assert(handleToolExecuteBefore('read', undefined) === null, 'helper: missing payload must be allowed');

  // First-defined-wins precedence across the tolerated locations.
  assert(
    handleToolExecuteBefore('read', { args: { filePath: '/x/.env' }, filePath: '/x/README.md' }) !== null,
    'payload.args.filePath must win over payload.filePath'
  );
  assert(
    handleToolExecuteBefore('read', { filePath: '/x/.env', input: { filePath: '/x/README.md' } }) !== null,
    'payload.filePath must win over payload.input.filePath'
  );
  assert(
    handleToolExecuteBefore('read', { input: { filePath: '/x/.env', args: { filePath: '/x/README.md' } } }) !==
      null,
    'payload.input.filePath must win over payload.input.args.filePath'
  );

  // --- injectContextOnce: idempotent context injection (finding H2) ---
  // v2 runs the `context` hook on every agent-loop turn, so the bootstrap block
  // must be appended at most once per array (sentinel = first line of block[0]).
  const block = [
    '## Agents Opencode Context\n\nYou are operating with the agents-opencode agent pack.',
    '## Session State Reminder\n- Current phase: Read state/session-state.json',
  ];

  const fresh = [];
  assert(injectContextOnce(fresh, block) === true, 'fresh array must report a change');
  assert(fresh.length === block.length, 'fresh array must receive the whole block');
  assert(fresh[0] === block[0], 'fresh array must receive the block verbatim');

  assert(injectContextOnce(fresh, block) === false, 'repeat call must be a no-op');
  assert(fresh.length === block.length, 'repeat call must not duplicate the block');

  const preSeeded = ['unrelated', 'prefix ## Agents Opencode Context suffix'];
  assert(injectContextOnce(preSeeded, block) === false, 'sentinel present must be a no-op');
  assert(preSeeded.length === 2, 'pre-seeded array must be unchanged');

  for (const target of [undefined, null, 'not-an-array', 42, {}, new Set()]) {
    assert(
      injectContextOnce(target, block) === false,
      `non-array target must be a safe no-op: ${String(target)}`
    );
  }
  assert(injectContextOnce([], 'not-an-array') === false, 'non-array lines must be a safe no-op');
  assert(injectContextOnce([], []) === false, 'empty lines must be a safe no-op');

  // --- shouldRegisterPackSkills: coexistence detection (marker vs editor.list) ---
  // A file install has the installer marker at the pack root, so its skills are
  // already discovered: registering them again would duplicate every skill.
  assert(
    shouldRegisterPackSkills({ markerPresent: true, alreadyPresentIds: [], skillIds: ['adr', 'python'] }) ===
      false,
    'file-installed pack (marker present) must not register skills'
  );
  assert(
    shouldRegisterPackSkills({ markerPresent: true, skillIds: ['adr'] }) === false,
    'marker present must win even with skills to add'
  );

  // Plugin-only install (no marker): every discovered id is registered.
  const pluginOnly = shouldRegisterPackSkills({
    markerPresent: false,
    alreadyPresentIds: [],
    skillIds: ['adr', 'python'],
  });
  assert(
    Array.isArray(pluginOnly) && pluginOnly.length === 2 && pluginOnly[0] === 'adr',
    'plugin-only install must return all ids in input order'
  );

  // Second guard: ids the runtime already exposes are skipped.
  const deduped = shouldRegisterPackSkills({
    markerPresent: false,
    alreadyPresentIds: ['adr'],
    skillIds: ['adr', 'python'],
  });
  assert(
    Array.isArray(deduped) && deduped.length === 1 && deduped[0] === 'python',
    'ids already present must be skipped'
  );

  // Hygiene: non-strings, empties and duplicates never leak into the result.
  const normalized = shouldRegisterPackSkills({
    markerPresent: false,
    alreadyPresentIds: ['x'],
    skillIds: ['a', 'a', '', null, 'x', 'b'],
  });
  assert(
    Array.isArray(normalized) && normalized.join(',') === 'a,b',
    'ids must be de-duplicated and cleaned'
  );

  // Defensive: malformed input must never throw.
  assert(Array.isArray(shouldRegisterPackSkills()), 'no input must return an array');
  assert(
    Array.isArray(shouldRegisterPackSkills({ markerPresent: false, skillIds: [] })),
    'no skills must return an empty array, not the false sentinel'
  );

  // --- buildSkillInfo: feature-detected file field (`path` vs `location`) ---
  const withPath = buildSkillInfo({
    id: 'adr',
    description: 'd',
    filePath: '/p/SKILL.md',
    content: 'c',
    preferPath: true,
  });
  assert(
    'path' in withPath && !('location' in withPath) && withPath.path === '/p/SKILL.md',
    'preferPath must emit `path` only'
  );
  assert(
    withPath.id === 'adr' && withPath.description === 'd' && withPath.content === 'c',
    'id/description/content must pass through'
  );

  const withLocation = buildSkillInfo({
    id: 'adr',
    description: 'd',
    filePath: '/p/SKILL.md',
    preferPath: false,
  });
  assert(
    !('path' in withLocation) && 'location' in withLocation && withLocation.location === '/p/SKILL.md',
    'non-preferred must emit `location` only'
  );

  // Default shape targets v2 core 2.0.4+ (`path`).
  const defaulted = buildSkillInfo({ id: 'adr', filePath: '/p/SKILL.md' });
  assert(defaulted.path === '/p/SKILL.md', 'default must prefer `path`');

  for (const info of [withPath, withLocation, defaulted]) {
    assert(
      info.path !== undefined || info.location !== undefined,
      'descriptor must never leave both `path` and `location` undefined'
    );
    const fields = ['path', 'location'].filter((field) => field in info);
    assert(fields.length === 1, 'descriptor must carry exactly one file field');
  }

  console.log('✅ Plugin v2 guard tests passed');
  console.log('✅ Plugin v2 execute.before event-wiring tests passed');
  console.log('✅ Plugin v2 context injection idempotency tests passed');
  console.log('✅ Plugin pack-skill coexistence + descriptor tests passed');
}

main().catch((err) => {
  console.error('❌ Plugin v2 guard tests failed');
  console.error(err.message);
  process.exit(1);
});
