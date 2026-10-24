#!/usr/bin/env node
'use strict';

/**
 * Proves the secret-content guard (`read`/`grep`) blocks the *same* paths on the
 * v2 hook path as on v1, and that the *wiring* (event shape -> policy) is
 * correct — not just the policy core.
 *
 * The policy core lives in .opencode/lib/guards.mjs (`readGuardError`, a thin
 * wrapper over `isBlockedReadPath`). The plugin never calls it directly; it
 * calls `handleToolExecuteBefore`, which maps the raw event onto the core.
 * These tests drive that helper with every documented event shape:
 * - v2 `ctx.tool.hook("execute.before")` event: `{ tool, input: { filePath } }`,
 *   `{ tool, input: { args: { filePath } } }`, and flat `{ tool, filePath }`
 * - v1 `tool.execute.before(input, output)`: output `{ args: { filePath } }`
 * Both entrypoints must throw (block), not merely `ask`.
 *
 * `grep` is covered by the same guard (it returns matching lines): its search
 * path is resolved from `args.path`, `path`, `input.path`, or
 * `input.args.path`, and a blocked target is denied on the same entrypoints.
 * Every other tool — `bash` included — stays unguarded.
 *
 * The same module hosts the other v2 wiring seams so they can be tested
 * without a live v2 host:
 * - `injectContextOnce` (v1 string `context` array) and
 *   `injectSystemContextOnce` (v2 `system` typed parts) — idempotent injection;
 * - `createReadGuardHandler` — the handler the v2 plugin registers: block
 *   policy plus once-per-handler telemetry for unresolvable `read` events (the
 *   fail-open case that must not stay invisible);
 * - `safeRegister` — awaited registrations whose failures are contained;
 * - `subscribeEventStream` — `ctx.event.subscribe({ signal })` consumption,
 *   abort cleanup, and the missing-`subscribe` no-op.
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
  const {
    readGuardError,
    isBlockedReadPath,
    injectContextOnce,
    injectSystemContextOnce,
    handleToolExecuteBefore,
    createReadGuardHandler,
    createContextBudgetTracker,
    replaceSystemContextPart,
    safeRegister,
    subscribeEventStream,
  } = await import(pathToFileURL(guardsPath).href);

  // Lets contained background work (the event-subscribe loop, dispose
  // rejection handlers) settle before assertions.
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  const packSkillsPath = path.join(process.cwd(), '.opencode', 'lib', 'pack-skills.mjs');
  const { shouldRegisterPackSkills, buildSkillInfo } = await import(
    pathToFileURL(packSkillsPath).href
  );

  const blocked = [
    '/x/.env',
    '/x/.env.local',
    '/x/production.env',
    '/x/.envrc',
    '/x/.envrc.local',
    '/x/.envrc.private',
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
    '/x/.envrc.example',
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

  // Unguarded tools (bash, write, ...) and malformed payloads are never blocked
  // on either path: this is a best-effort content guard, not a sandbox.
  assert(readGuardError('bash', { filePath: '/x/.env' }) === null, 'v1/v2: bash must not be blocked');
  assert(readGuardError('bash', { path: '/x/.envrc' }) === null, 'v1/v2: bash with a grep-like path must not be blocked');
  assert(readGuardError('write', { filePath: '/x/.env' }) === null, 'v1/v2: write must not be blocked');
  assert(readGuardError('read', {}) === null, 'v2: missing filePath must be allowed');
  assert(readGuardError('read', { args: {} }) === null, 'v1: missing filePath must be allowed');
  assert(readGuardError('read', { filePath: 42 }) === null, 'v2: non-string filePath must be allowed');
  assert(readGuardError(undefined, { filePath: '/x/.env' }) === null, 'v2: undefined tool must be allowed');

  // --- grep: the secret-content guard also covers search paths ---
  // `grep` returns matching lines and every agent has unrestricted access, so a
  // `grep` pointed at a secret file would leak it just like `read` would. The
  // search path resolves from the same four tolerated locations, with `path`
  // instead of `filePath`; all other tools stay unguarded.
  const grepShapes = {
    'v1 { args: { path } }': (searchPath) => ({ args: { path: searchPath } }),
    'v2 flat { path }': (searchPath) => ({ path: searchPath }),
    'v2 { input: { path } }': (searchPath) => ({ input: { path: searchPath } }),
    'v2 { input: { args: { path } } }': (searchPath) => ({ input: { args: { path: searchPath } } }),
  };

  for (const searchPath of ['/x/.env', '/x/.envrc', '/x/.envrc.local', '/x/credentials.json']) {
    const expected = readGuardError('read', { filePath: searchPath });
    assert(expected, `grep target must be a blocked path: ${searchPath}`);

    for (const [shape, make] of Object.entries(grepShapes)) {
      const payload = make(searchPath);
      const direct = readGuardError('grep', payload);
      assert(direct === expected, `grep ${shape} must block via policy core: ${searchPath}`);

      const event = { tool: 'grep', ...payload };
      assert(
        handleToolExecuteBefore(event) === expected,
        `grep ${shape} must block via whole event: ${searchPath}`
      );
      assert(
        handleToolExecuteBefore('grep', payload) === expected,
        `grep ${shape} must block via (tool, payload): ${searchPath}`
      );

      let threw = false;
      try {
        createReadGuardHandler()(event);
      } catch (err) {
        threw = true;
        assert(
          typeof err.message === 'string' && err.message.includes('Blocked reading sensitive file'),
          `grep ${shape} block must throw the policy error: ${searchPath}`
        );
        assert(
          err.message.includes(searchPath),
          `grep ${shape} block must name the offending path: ${searchPath}`
        );
      }
      assert(threw, `grep ${shape} must throw, not ask: ${searchPath}`);
    }
  }

  // Checked-in env templates stay searchable in every shape.
  for (const searchPath of ['/x/.env.example', '/x/.envrc.example']) {
    for (const [shape, make] of Object.entries(grepShapes)) {
      const payload = make(searchPath);
      assert(
        readGuardError('grep', payload) === null,
        `grep ${shape} must allow a template: ${searchPath}`
      );
      assert(
        handleToolExecuteBefore({ tool: 'grep', ...payload }) === null,
        `grep ${shape} must allow a template via whole event: ${searchPath}`
      );
    }
  }

  // A pathless grep searches the working directory: still allowed (fail-open by
  // design; the guard is best-effort, not a sandbox).
  assert(readGuardError('grep', {}) === null, 'grep: missing path must be allowed');
  assert(readGuardError('grep', { args: { path: '' } }) === null, 'grep: blank path must be allowed');
  assert(
    handleToolExecuteBefore({ tool: 'grep', input: { pattern: 'SECRET' } }) === null,
    'grep: pattern-only event must be allowed'
  );

  // First-defined-wins precedence across the tolerated grep locations.
  assert(
    handleToolExecuteBefore('grep', { args: { path: '/x/.env' }, path: '/x/README.md' }) !== null,
    'grep: payload.args.path must win over payload.path'
  );
  assert(
    handleToolExecuteBefore('grep', { path: '/x/.env', input: { path: '/x/README.md' } }) !== null,
    'grep: payload.path must win over payload.input.path'
  );
  assert(
    handleToolExecuteBefore('grep', {
      input: { path: '/x/.env', args: { path: '/x/README.md' } },
    }) !== null,
    'grep: payload.input.path must win over payload.input.args.path'
  );

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

  // --- createReadGuardHandler: fail-open telemetry (S1) ---
  // A `read` whose path cannot be resolved from any documented shape proceeds
  // unguarded (fail-open by design), so the handler must surface that once —
  // otherwise a v2 payload-shape mismatch silently disables the pack's only
  // secret-content control.
  let unresolvedWarnings = 0;
  const telemetryHandler = createReadGuardHandler(() => {
    unresolvedWarnings += 1;
  });
  assert(typeof telemetryHandler === 'function', 'createReadGuardHandler must return a handler');

  // Repeated unresolvable reads, in every tolerated shape without a path.
  telemetryHandler({ tool: 'read' });
  telemetryHandler({ tool: 'read', input: {} });
  telemetryHandler({ tool: 'read', input: { args: {} } });
  telemetryHandler('read', {});
  telemetryHandler('read', { args: {} });
  telemetryHandler({ tool: 'read', filePath: 42 });
  telemetryHandler({ tool: 'read', filePath: '   ' });
  assert(unresolvedWarnings === 1, 'unresolved reads must warn exactly once per handler');

  // Resolvable reads — allowed or blocked — must never warn.
  let resolvableWarnings = 0;
  const resolvableHandler = createReadGuardHandler(() => {
    resolvableWarnings += 1;
  });
  resolvableHandler({ tool: 'read', input: { filePath: '/x/README.md' } });
  resolvableHandler({ tool: 'read', input: { args: { filePath: '/x/src/app.ts' } } });
  resolvableHandler({ tool: 'read', filePath: '/x/ca.pem' });
  resolvableHandler('read', { args: { filePath: '/x/README.md' } });
  assert(resolvableWarnings === 0, 'resolvable reads must never warn');

  let blockedThrew = false;
  try {
    resolvableHandler({ tool: 'read', input: { filePath: '/x/.env' } });
  } catch (err) {
    blockedThrew = true;
    assert(
      typeof err.message === 'string' && err.message.includes('Blocked reading sensitive file'),
      'blocked reads must still throw the policy error'
    );
  }
  assert(blockedThrew, 'blocked reads must still throw');
  assert(resolvableWarnings === 0, 'blocked reads must not warn (the path resolved)');

  // Unguarded tools and malformed events never warn. A pathless `grep` is
  // normal (it searches the working directory), so it must not warn either.
  let ignoredWarnings = 0;
  const ignoringHandler = createReadGuardHandler(() => {
    ignoredWarnings += 1;
  });
  for (const event of [
    { tool: 'bash', input: { filePath: '/x/.env' } },
    { tool: 'bash', path: '/x/.envrc' },
    { tool: 'write', input: {} },
    { tool: 'grep', input: { pattern: 'SECRET' } },
    { tool: 'grep', path: '' },
    undefined,
    null,
    42,
  ]) {
    ignoringHandler(event);
  }
  ignoringHandler('bash', undefined);
  ignoringHandler('grep', {});
  assert(ignoredWarnings === 0, 'unguarded tool events must never warn');

  // A throwing telemetry callback is contained and still fires at most once.
  let containedCalls = 0;
  const containedHandler = createReadGuardHandler(() => {
    containedCalls += 1;
    throw new Error('telemetry failure');
  });
  containedHandler({ tool: 'read', input: {} });
  containedHandler({ tool: 'read', input: {} });
  assert(
    containedCalls === 1,
    'a throwing telemetry callback must not break the handler nor be retried'
  );

  // A missing telemetry callback must keep the handler a working block guard.
  const noTelemetryHandler = createReadGuardHandler();
  noTelemetryHandler({ tool: 'read', input: {} });
  let noTelemetryThrew = false;
  try {
    noTelemetryHandler({ tool: 'read', input: { filePath: '/x/.env' } });
  } catch {
    noTelemetryThrew = true;
  }
  assert(noTelemetryThrew, 'the handler must still block when no telemetry callback is supplied');

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

  // --- injectSystemContextOnce: v2 `system` typed-parts injection (D1) ---
  // v2's `context` hook exposes `system` as parts (`{ type: "text", text }`),
  // not a string array; the block is appended at most once per parts array.
  const contextText =
    '## Agents Opencode Context\n\nYou are operating with the agents-opencode agent pack.';

  const systemParts = [];
  assert(
    injectSystemContextOnce(systemParts, contextText) === true,
    'fresh system parts array must report a change'
  );
  assert(systemParts.length === 1, 'exactly one part must be pushed');
  assert(
    systemParts[0] &&
      systemParts[0].type === 'text' &&
      systemParts[0].text === contextText,
    'part must be { type: "text", text } with the block verbatim'
  );

  assert(
    injectSystemContextOnce(systemParts, contextText) === false,
    'repeat call must be a no-op'
  );
  assert(systemParts.length === 1, 'repeat call must not duplicate the part');

  const seededParts = [{ type: 'text', text: 'prefix ## Agents Opencode Context suffix' }];
  assert(
    injectSystemContextOnce(seededParts, contextText) === false,
    'sentinel present in any text part must be a no-op'
  );
  assert(seededParts.length === 1, 'pre-seeded parts must be unchanged');

  // A runtime that normalizes the part type still must not get duplicates:
  // the sentinel check reads `text` regardless of `type`.
  const normalizedParts = [{ type: 'normalized', text: contextText }];
  assert(
    injectSystemContextOnce(normalizedParts, contextText) === false,
    'sentinel must win even when the part type differs'
  );

  // Malformed existing entries are skipped, not fatal.
  const mixedParts = [null, 42, 'string', { text: 7 }, { noText: true }];
  assert(
    injectSystemContextOnce(mixedParts, contextText) === true,
    'malformed entries must not break injection'
  );
  assert(mixedParts.length === 6, 'malformed entries must be preserved');

  for (const target of [undefined, null, 'not-an-array', 42, {}, new Set()]) {
    assert(
      injectSystemContextOnce(target, contextText) === false,
      `non-array target must be a safe no-op: ${String(target)}`
    );
  }
  assert(injectSystemContextOnce([], null) === false, 'non-string text must be a safe no-op');
  assert(injectSystemContextOnce([], '') === false, 'empty text must be a safe no-op');
  assert(injectSystemContextOnce([], '   ') === false, 'blank text must be a safe no-op');

  // F4: a frozen `system` array must be a safe no-op — a bare `push` would
  // throw inside the hook handler, outside safeRegister's containment.
  const frozenParts = Object.freeze([]);
  assert(
    injectSystemContextOnce(frozenParts, contextText) === false,
    'a frozen target array must return false instead of throwing'
  );

  // --- safeRegister: awaited registrations, contained failures (D5) ---
  // v2's hook()/transform() return Promise<Registration>; an unawaited
  // rejection (e.g. an unknown hook name) must not become an unhandled
  // rejection, and one failed registration must not disable the others.
  const cleanups = [];

  assert(
    (await safeRegister(cleanups, () => Promise.reject(new Error('unknown hook name')))) === false,
    'a rejected registration must be contained and report false'
  );
  assert(cleanups.length === 0, 'a rejected registration must not register a cleanup');

  let laterRan = false;
  assert(
    (await safeRegister(cleanups, () => {
      laterRan = true;
      return undefined;
    })) === false,
    'a sync registration without a result reports false'
  );
  assert(laterRan, 'later registrations must still run after an earlier failure');

  // A cleanup function result is pushed verbatim.
  let cleanupRan = false;
  assert(
    (await safeRegister(cleanups, () => () => {
      cleanupRan = true;
    })) === true,
    'a cleanup function must count as registered'
  );

  // A `Registration` object (`hook()` result) becomes a disposal cleanup.
  let disposed = 0;
  assert(
    (await safeRegister(cleanups, () =>
      Promise.resolve({
        dispose: () => {
          disposed += 1;
        },
      })
    )) === true,
    'a Registration object must count as registered'
  );

  for (const cleanup of cleanups) cleanup();
  await flush();
  assert(cleanupRan, 'a cleanup function must run on drain');
  assert(disposed === 1, 'Registration.dispose() must run on drain');

  // Sync throws are contained too.
  assert(
    (await safeRegister([], () => {
      throw new Error('sync registration failure');
    })) === false,
    'a sync throw must be contained'
  );

  // Disposal failures (sync throw and async rejection) are swallowed.
  const disposals = [];
  await safeRegister(disposals, () =>
    Promise.resolve({
      dispose: () => {
        throw new Error('sync dispose failure');
      },
    })
  );
  await safeRegister(disposals, () =>
    Promise.resolve({
      dispose: () => Promise.reject(new Error('async dispose failure')),
    })
  );
  for (const cleanup of disposals) cleanup();
  await flush();

  // --- subscribeEventStream: v2 ctx.event.subscribe({ signal }) wiring (D3) ---
  // A missing `subscribe` (or a non-async-iterable result) is a quiet no-op.
  for (const stream of [undefined, null, {}, { subscribe: 'nope' }, 42]) {
    assert(
      subscribeEventStream(stream, () => {}) === undefined,
      `stream must be a no-op without subscribe: ${String(stream)}`
    );
  }
  assert(
    subscribeEventStream({ subscribe: () => ({}) }, () => {}) === undefined,
    'a non-async-iterable subscribe result must be a no-op'
  );
  assert(
    subscribeEventStream(
      {
        subscribe: () => {
          throw new Error('sync subscribe failure');
        },
      },
      () => {}
    ) === undefined,
    'a sync-throwing subscribe must be contained'
  );

  // The documented shape: subscribe({ signal }) -> AsyncIterable; events are
  // delivered, the cleanup aborts the subscription, and abort ends the loop
  // without an unhandled rejection.
  let signalSeen;
  let abortObserved = false;
  const abortableStream = {
    subscribe(options = {}) {
      signalSeen = options.signal;
      return (async function* () {
        yield { type: 'session.idle' };
        await new Promise((_resolve, reject) => {
          const onAbort = () => {
            abortObserved = true;
            reject(new Error('stream aborted'));
          };
          if (options.signal?.aborted) onAbort();
          else options.signal?.addEventListener('abort', onAbort, { once: true });
        });
      })();
    },
  };

  const received = [];
  const abortCleanup = subscribeEventStream(abortableStream, (event) => {
    received.push(event.type);
  });
  assert(typeof abortCleanup === 'function', 'subscribe path must return a cleanup');
  assert(signalSeen instanceof AbortSignal, 'subscribe must receive an AbortSignal');

  await flush();
  assert(received.join(',') === 'session.idle', 'events must be delivered before abort');

  abortCleanup();
  await flush();
  assert(abortObserved === true, 'cleanup must abort the subscription');

  // A throwing handler is contained per event and must not end the loop.
  const handlerEvents = [];
  const handlerCleanup = subscribeEventStream(
    { subscribe: () => (async function* () {
      yield 1;
      yield 2;
    })() },
    (value) => {
      handlerEvents.push(value);
      if (value === 1) throw new Error('handler failed');
    }
  );
  await flush();
  assert(
    handlerEvents.join(',') === '1,2',
    'a throwing handler must not end the subscription'
  );
  handlerCleanup();

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

  // --- buildSkillInfo: shipped v2 `Skill.Info` descriptor ---
  // The 2.0.30 host schema requires id/name/path/content (`name` throws
  // SchemaError(Missing key at ["name"]) when absent) and has no `location`
  // field, so the descriptor must emit exactly those five keys.
  const descriptor = buildSkillInfo({
    id: 'adr',
    name: 'adr',
    description: 'd',
    filePath: '/p/SKILL.md',
    content: 'c',
  });
  assert(
    descriptor.id === 'adr' &&
      descriptor.name === 'adr' &&
      descriptor.description === 'd' &&
      descriptor.path === '/p/SKILL.md' &&
      descriptor.content === 'c',
    'descriptor must carry id/name/description/path/content'
  );
  assert(
    Object.keys(descriptor).sort().join(',') === 'content,description,id,name,path',
    'descriptor must emit exactly the five Skill.Info fields'
  );
  assert(!('location' in descriptor), 'descriptor must not emit the obsolete `location` field');
  assert(!('preferPath' in descriptor), 'descriptor must not carry the removed preferPath flag');

  // `name` prefers the frontmatter value, falls back to the id, and is always a
  // non-empty string even for blank input.
  const namedFromFrontmatter = buildSkillInfo({
    id: 'adr',
    name: '  Architecture Decisions  ',
    filePath: '/p/SKILL.md',
  });
  assert(
    namedFromFrontmatter.name === 'Architecture Decisions',
    'frontmatter name must be preferred and trimmed'
  );
  const namedFromId = buildSkillInfo({ id: 'adr', name: '   ', filePath: '/p/SKILL.md' });
  assert(namedFromId.name === 'adr', 'blank frontmatter name must fall back to the id');
  const namedFromIdAlone = buildSkillInfo({ id: 'adr', filePath: '/p/SKILL.md' });
  assert(namedFromIdAlone.name === 'adr', 'missing frontmatter name must fall back to the id');

  for (const info of [descriptor, namedFromFrontmatter, namedFromId, namedFromIdAlone]) {
    assert(
      typeof info.name === 'string' && info.name.length > 0,
      'name must always be a non-empty string'
    );
    assert(info.path === '/p/SKILL.md', 'path must always carry the SKILL.md path');
  }

  // Optional/missing fields normalize to strings so the required schema keys
  // never receive null/undefined.
  const normalizedDescriptor = buildSkillInfo({ id: 'adr', filePath: '/p/SKILL.md', content: null });
  assert(normalizedDescriptor.content === '', 'missing content must normalize to an empty string');
  assert(normalizedDescriptor.description === '', 'missing description must normalize to an empty string');

  // F5: `id` and `path` normalize like the other required fields — `id` is
  // trimmed and falls back to the same `'skill'` placeholder as `name`, and
  // `path` is always a string (callers pass a real `SKILL.md` path; malformed
  // input degrades to `''` since no placeholder can stand in for a path).
  const idTrimmed = buildSkillInfo({ id: '  adr  ', filePath: '/p/SKILL.md' });
  assert(idTrimmed.id === 'adr', 'id must be trimmed');

  const malformedId = buildSkillInfo({ id: '   ', filePath: 42 });
  assert(malformedId.id === 'skill', 'a blank/non-string id must fall back to the placeholder');
  assert(malformedId.name === 'skill', 'the name fallback must stay consistent with the id fallback');
  assert(malformedId.path === '', 'a non-string path must normalize to an empty string');

  const emptyInput = buildSkillInfo({});
  assert(
    emptyInput.id === 'skill' && emptyInput.name === 'skill',
    'a missing id/name must fall back to the placeholder'
  );
  assert(
    Object.values(emptyInput).every((value) => typeof value === 'string'),
    'every descriptor value must be a string for malformed input'
  );

  // --- replaceSystemContextPart: update the band part without duplicating ---
  const bandParts = [{ type: 'text', text: '## Static\nbody' }];
  assert(
    replaceSystemContextPart(
      bandParts,
      ['Context budget ', 'Last step added '],
      'Context budget 30%+ — ask'
    ) === true,
    'the first band must push a part'
  );
  assert(bandParts.length === 2, 'the base + one band part');
  replaceSystemContextPart(
    bandParts,
    ['Context budget ', 'Last step added '],
    'Context budget 50%+ — stop'
  );
  assert(
    bandParts.length === 2 && bandParts[1].text.includes('50%'),
    'a new band must replace the old part, not duplicate it'
  );
  assert(
    replaceSystemContextPart(
      bandParts,
      ['Context budget ', 'Last step added '],
      undefined
    ) === false,
    'clearing must not push a part'
  );
  assert(bandParts.length === 1, 'clearing must remove the band part');
  const frozenBandParts = Object.freeze([{ type: 'text', text: 'Context budget 30%+ — ask' }]);
  assert(
    replaceSystemContextPart(frozenBandParts, ['Context budget '], 'Context budget 50%+') === false,
    'a frozen system array must be a safe no-op'
  );

  // --- createContextBudgetTracker: bands, delta, reset, safe no-ops ---
  const tokensOf = (used) => ({
    input: used,
    output: 0,
    reasoning: 0,
    cache: { read: 0, write: 0 },
  });
  const assistantEvent = (sessionID, id, used, completed = true) => ({
    type: 'message.updated',
    properties: {
      sessionID,
      info: {
        id,
        sessionID,
        role: 'assistant',
        time: completed ? { created: 1, completed: 2 } : { created: 1 },
        tokens: tokensOf(used),
      },
    },
  });
  const LIMIT = 1_000_000;

  const budgetFresh = createContextBudgetTracker();
  assert(budgetFresh.line('s', LIMIT) === undefined, 'unknown session must be a no-op');
  budgetFresh.note(assistantEvent('s', 'm1', 290_000));
  assert(budgetFresh.line('s', LIMIT) === undefined, 'below 30% must be silent');
  budgetFresh.note(assistantEvent('s', 'm2', 300_000));
  const askLine = budgetFresh.line('s', LIMIT);
  assert(askLine && askLine.includes('30%'), '30% must emit the ask band');
  assert(!askLine.includes('40%'), '30% must not include the handoff band');

  const budgetHandoff = createContextBudgetTracker();
  budgetHandoff.note(assistantEvent('s', 'm1', 400_000));
  assert(budgetHandoff.line('s', LIMIT).includes('40%'), '40% must emit the handoff band');

  const budgetStop = createContextBudgetTracker();
  budgetStop.note(assistantEvent('s', 'm1', 500_000));
  assert(budgetStop.line('s', LIMIT).includes('50%'), '50% must emit the stop band');

  // A lower report must not hide the earlier band; an explicit reset may.
  budgetStop.note(assistantEvent('s', 'm2', 350_000));
  assert(budgetStop.line('s', LIMIT).includes('50%'), 'a lower report must not downgrade the band');
  budgetStop.reset('s');
  budgetStop.note(assistantEvent('s', 'm3', 350_000));
  assert(budgetStop.line('s', LIMIT).includes('30%'), 'reset must allow the lower band again');

  // Explicit lifecycle events and a >50% drop clear the band.
  const budgetEventReset = createContextBudgetTracker();
  budgetEventReset.note(assistantEvent('s', 'm1', 500_000));
  budgetEventReset.line('s', LIMIT);
  budgetEventReset.note({ type: 'session.compacted', properties: { sessionID: 's' } });
  budgetEventReset.note(assistantEvent('s', 'm2', 350_000));
  assert(
    budgetEventReset.line('s', LIMIT).includes('30%'),
    'session.compacted must reset the band'
  );

  const budgetDeleted = createContextBudgetTracker();
  budgetDeleted.note(assistantEvent('s', 'm1', 500_000));
  budgetDeleted.note({ type: 'session.deleted', properties: { sessionID: 's' } });
  assert(
    budgetDeleted.line('s', LIMIT) === undefined,
    'session.deleted must drop the session state'
  );

  const budgetDrop = createContextBudgetTracker();
  budgetDrop.note(assistantEvent('s', 'm1', 500_000));
  budgetDrop.line('s', LIMIT);
  budgetDrop.note(assistantEvent('s', 'm2', 100_000));
  assert(budgetDrop.line('s', LIMIT) === undefined, 'a >50% drop must clear the band');

  const split = createContextBudgetTracker();
  split.note({
    type: 'message.updated',
    properties: {
      sessionID: 's',
      info: {
        id: 'm1',
        sessionID: 's',
        role: 'assistant',
        time: { created: 1, completed: 2 },
        tokens: {
          input: 100_000,
          output: 100_000,
          reasoning: 100_000,
          cache: { read: 100_000, write: 0 },
        },
      },
    },
  });
  assert(
    split.line('s', LIMIT).includes('40%'),
    'input+output+reasoning+cache.read must total 400k'
  );

  // Streaming, duplicate, and incomplete messages are ignored.
  const budgetDup = createContextBudgetTracker();
  budgetDup.note(assistantEvent('s', 'm1', 500_000));
  assert(
    budgetDup.note(assistantEvent('s', 'm1', 400_000)) === false,
    'duplicate messageID must be ignored'
  );
  assert(budgetDup.note(assistantEvent('s', 'm2', 900_000, false)) === false, 'incomplete messages must be ignored');
  assert(budgetDup.line('s', LIMIT).includes('50%'), 'ignored updates must not change the band');

  // Per-call delta warning is one-shot.
  const budgetDelta = createContextBudgetTracker();
  budgetDelta.note(assistantEvent('s', 'm1', 100_000));
  budgetDelta.line('s', LIMIT);
  budgetDelta.note(assistantEvent('s', 'm2', 126_000));
  const deltaLine = budgetDelta.line('s', LIMIT);
  assert(deltaLine && deltaLine.includes('Last step added'), 'a >2.5% step must warn');
  assert(budgetDelta.line('s', LIMIT) === undefined, 'the delta warning must be one-shot');

  const budgetSmallDelta = createContextBudgetTracker();
  budgetSmallDelta.note(assistantEvent('s', 'm1', 100_000));
  budgetSmallDelta.line('s', LIMIT);
  budgetSmallDelta.note(assistantEvent('s', 'm2', 120_000));
  assert(budgetSmallDelta.line('s', LIMIT) === undefined, 'a <=2.5% step must stay silent');

  // Missing data and an unknown window are safe no-ops.
  const budgetMissing = createContextBudgetTracker();
  budgetMissing.note({ type: 'message.updated', properties: { info: { role: 'assistant' } } });
  assert(budgetMissing.line('s', LIMIT) === undefined, 'missing tokens/session must be silent');
  budgetMissing.note(assistantEvent('s', 'm1', 500_000));
  assert(budgetMissing.line('s', Number.NaN) === undefined, 'an unknown window must be silent');

  console.log('✅ Plugin v2 guard tests passed');
  console.log('✅ Plugin v2 execute.before event-wiring tests passed');
  console.log('✅ Plugin v2 grep secret-content guard tests passed');
  console.log('✅ Plugin v2 fail-open telemetry tests passed');
  console.log('✅ Plugin v2 context injection idempotency tests passed');
  console.log('✅ Plugin v2 system-parts injection idempotency tests passed');
  console.log('✅ Plugin v2 registration containment tests passed');
  console.log('✅ Plugin v2 event subscription tests passed');
  console.log('✅ Plugin pack-skill coexistence + descriptor tests passed');
}

main().catch((err) => {
  console.error('❌ Plugin v2 guard tests failed');
  console.error(err.message);
  process.exit(1);
});
