// Pure guard helpers for the agents-opencode plugin.
// Kept dependency-free so they can be unit-tested outside the OpenCode runtime.

const PUBLIC_CREDENTIAL_SUFFIXES = ['.pub', '.crt', '.cer', '.cert'];

const PUBLIC_PEM_BASENAMES = new Set([
  'ca.pem',
  'cert.pem',
  'certificate.pem',
  'chain.pem',
  'fullchain.pem',
]);

const BLOCKED_READ_SUFFIXES = [
  'credentials.json',
  'credentials.yaml',
  'credentials.yml',
  'secrets.yaml',
  'secrets.yml',
  'secrets.json',
  'id_rsa',
  'id_ed25519',
  'id_ecdsa',
  '.npmrc',
  '.netrc',
  '.p12',
  '.pfx',
  '.keystore',
  '.jks',
  '.pem',
  '.key',
];

const ENV_TEMPLATE_SUFFIXES = ['.example', '.sample', '.template', '.dist', '.defaults'];

/**
 * Decide whether reading a path should be blocked.
 *
 * Policy: deny by default for secret-ish files, but allow explicit public
 * certificate/key forms and checked-in env templates. `.pem`/`.key` stay
 * blocked (dual-use private-key conventions) with a public-cert allowlist;
 * the rare false positive (e.g. Apple Keynote `.key` files) is accepted and
 * remains bypassable by design.
 */
export function isBlockedReadPath(filePath) {
  const basename = String(filePath ?? '').split(/[/\\]/).pop()?.toLowerCase() || '';
  if (!basename) return false;

  const isEnvFile =
    basename === '.env' || basename.startsWith('.env.') || basename.endsWith('.env');
  const isEnvTemplate = ENV_TEMPLATE_SUFFIXES.some((suffix) => basename.endsWith(suffix));
  if (isEnvFile && !isEnvTemplate) return true;

  if (PUBLIC_CREDENTIAL_SUFFIXES.some((suffix) => basename.endsWith(suffix))) return false;
  if (PUBLIC_PEM_BASENAMES.has(basename)) return false;

  return BLOCKED_READ_SUFFIXES.some((suffix) => basename.endsWith(suffix));
}

/**
 * Resolve a `filePath` from a hook payload, tolerating every documented shape.
 * The plugin hands the whole v2 event (or the v1 `output`) to the guard, so the
 * path can sit in any of these locations; the first non-nullish value wins:
 * - `payload.args.filePath`       v1 `tool.execute.before` output
 * - `payload.filePath`            flat v2 event `{ tool, filePath }`
 * - `payload.input.filePath`      v2 event `{ tool, input: { filePath } }`
 * - `payload.input.args.filePath` v2 event `{ tool, input: { args: { filePath } } }`
 */
function resolveReadFilePath(payload) {
  const candidates = [
    payload?.args?.filePath,
    payload?.filePath,
    payload?.input?.filePath,
    payload?.input?.args?.filePath,
  ];
  // Skip empty/whitespace strings so a blank earlier candidate cannot shadow a
  // real path in a later one (fail-closed on reads).
  return candidates.find((value) => typeof value === 'string' && value.trim() !== '');
}

/**
 * Return the block message when reading `payload` with `tool` must be denied,
 * or null when the read is allowed.
 *
 * This is the policy core: a thin wrapper over `isBlockedReadPath` that
 * normalizes both hook payload shapes through `resolveReadFilePath`. It never
 * relaxes the policy, and callers must throw on a non-null result (block, not
 * `ask`). `handleToolExecuteBefore` is the event-aware entrypoint the plugin
 * calls; this function stays path/policy-focused so it can be tested directly.
 */
export function readGuardError(tool, payload) {
  if (tool !== 'read') return null;
  const filePath = resolveReadFilePath(payload);
  if (typeof filePath === 'string' && isBlockedReadPath(filePath)) {
    return `[agents-opencode] Blocked reading sensitive file: ${filePath}. Do not read credential or secret files.`;
  }
  return null;
}

/**
 * Split a `tool.execute.before` call into its tool name and payload. Covers
 * both call forms: the whole v2 event (`{ tool, input }` or a flat
 * `{ tool, filePath }`) unwraps itself, while the split v1 pair
 * (`(tool, output)`) is used as-is.
 */
function splitToolAndPayload(toolOrEvent, payload) {
  if (payload === undefined && toolOrEvent !== null && typeof toolOrEvent === 'object') {
    return { tool: toolOrEvent.tool, payload: toolOrEvent };
  }
  return { tool: toolOrEvent, payload };
}

/**
 * Map a `tool.execute.before` event onto `readGuardError`, returning the block
 * message or null.
 *
 * This is the pure seam the plugin calls, so tests can prove the *wiring*
 * (event shape -> policy) instead of only the policy core. Two call forms cover
 * both entrypoints:
 * - whole event: `handleToolExecuteBefore(event)` for v2, where `event` is
 *   `{ tool, input }` (or a flat `{ tool, filePath }`); `tool` is read from
 *   `event.tool`.
 * - split pair: `handleToolExecuteBefore(tool, payload)` for v1, where `payload`
 *   is the hook `output` (the whole event also works); the path is resolved by
 *   `readGuardError` from either shape.
 */
export function handleToolExecuteBefore(toolOrEvent, payload) {
  const split = splitToolAndPayload(toolOrEvent, payload);
  return readGuardError(split.tool, split.payload);
}

/**
 * Build the `tool.execute.before` handler the v2 plugin registers: the same
 * block policy as `handleToolExecuteBefore`, plus rate-limited telemetry for
 * the fail-open case.
 *
 * Why telemetry: the guard is fail-open by design (the real v2 `read` payload
 * shape is unverified), so a `read` whose path cannot be resolved from any
 * documented shape proceeds unguarded. Without a signal, a payload-shape
 * mismatch would silently disable the pack's only secret-read control. When
 * that case is seen, `onUnresolvedRead` is invoked at most once per handler
 * instance (the plugin creates one handler per setup call), so the mismatch
 * becomes visible in logs without warning on every read.
 *
 * Runtime behaviour is otherwise unchanged: a blocked read still throws, and
 * telemetry failures are contained — they must never break the guard path.
 *
 * @param {() => void} [onUnresolvedRead] Called at most once, with no arguments.
 * @returns {(toolOrEvent: unknown, payload?: unknown) => void} Hook handler; throws on a blocked read.
 */
export function createReadGuardHandler(onUnresolvedRead) {
  const notify = typeof onUnresolvedRead === 'function' ? onUnresolvedRead : () => {};
  let warned = false;

  return (toolOrEvent, payload) => {
    const split = splitToolAndPayload(toolOrEvent, payload);

    if (split.tool === 'read' && resolveReadFilePath(split.payload) === undefined && !warned) {
      // Set the gate before notifying: a throwing callback must not lead to a
      // retry (and thus repeated log noise) on the next read.
      warned = true;
      try {
        notify();
      } catch {
        // Telemetry must never break the guard path.
      }
    }

    const error = readGuardError(split.tool, split.payload);
    if (error) throw new Error(error);
  };
}

/**
 * Append `lines` to `target` at most once, so re-running the injection on the
 * same array cannot duplicate the block.
 *
 * OpenCode v1 injects only during compaction (`experimental.session.compacting`),
 * but v2 runs the `context` hook for the whole agent loop (including tool-driven
 * continuations). This helper makes every push site idempotent regardless of how
 * often the runtime fires.
 *
 * Idempotency is keyed on a stable sentinel: the first line of the first block
 * entry (e.g. `## Agents Opencode Context`), which survives version bumps.
 *
 * @param {unknown} target  Candidate context array to append to.
 * @param {unknown} lines   Block lines to append (the first entry carries the sentinel).
 * @returns {boolean} true only when the target was mutated.
 */
export function injectContextOnce(target, lines) {
  if (!Array.isArray(target)) return false;
  if (!Array.isArray(lines) || lines.length === 0) return false;

  const sentinel = String(lines[0] ?? '').split('\n')[0].trim();
  if (sentinel && target.some((entry) => typeof entry === 'string' && entry.includes(sentinel))) {
    return false;
  }

  for (const line of lines) target.push(line);
  return true;
}

/**
 * Append the context block to a v2 `system` parts array at most once.
 *
 * OpenCode v2's `context` hook exposes `system` as typed parts and the
 * documented injection is `event.system.push({ type: 'text', text })`; there is
 * no string `context` array on v2 (that shape is v1's
 * `experimental.session.compacting` output). The hook fires on every agent-loop
 * model call, so idempotency is keyed on the same stable sentinel as
 * `injectContextOnce`: the first line of the block. A part counts as "already
 * injected" when its `text` contains the sentinel, regardless of its `type`, so
 * a runtime that normalizes the part type still cannot duplicate the block.
 *
 * @param {unknown} target Candidate `system` parts array to append to.
 * @param {unknown} text   Full context block (first line carries the sentinel).
 * @returns {boolean} true only when a new part was pushed; false on any
 *                    failure, including a frozen/sealed target array.
 */
export function injectSystemContextOnce(target, text) {
  if (!Array.isArray(target)) return false;
  if (typeof text !== 'string' || text.trim() === '') return false;

  const sentinel = text.split('\n')[0].trim();
  if (!sentinel) return false;

  const alreadyInjected = target.some(
    (part) =>
      part !== null &&
      typeof part === 'object' &&
      typeof part.text === 'string' &&
      part.text.includes(sentinel)
  );
  if (alreadyInjected) return false;

  try {
    target.push({ type: 'text', text });
  } catch {
    // A frozen/sealed `system` array must not throw inside the hook handler
    // (this call site has no `safeRegister` containment around it).
    return false;
  }
  return true;
}

/**
 * Run one hook/transform registration with full failure containment.
 *
 * OpenCode v2's `hook(...)` and `transform(...)` return `Promise<Registration>`,
 * so awaiting the result keeps a rejected registration (e.g. an unknown hook
 * name) from surfacing as an unhandled rejection. Every result shape is folded
 * into `cleanups`:
 * - a cleanup function is pushed as-is;
 * - a `Registration` (`{ dispose() }`) is wrapped into a cleanup that swallows
 *   disposal failures (sync throws and async rejections alike);
 * - a throw/rejection is contained and reported as `false`, so a failed
 *   registration never disables the plugin or its other registrations.
 *
 * @param {Array<() => void>} cleanups Cleanup list the caller drains on unload.
 * @param {() => unknown} register   Performs one registration.
 * @returns {Promise<boolean>} true when a registration (or cleanup) was obtained.
 */
export async function safeRegister(cleanups, register) {
  try {
    const result = await register();

    if (typeof result === 'function') {
      cleanups.push(result);
      return true;
    }

    if (result !== null && typeof result === 'object' && typeof result.dispose === 'function') {
      const registration = result;
      cleanups.push(() => {
        try {
          void Promise.resolve(registration.dispose()).catch(() => {});
        } catch {
          // ignore synchronous disposal failures
        }
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Wire a v2 event stream to `handler` and return a cleanup that aborts it.
 *
 * v2's `ctx.event.subscribe({ signal })` returns an `AsyncIterable` (documented
 * shape); it must be consumed with a signal-backed loop, not called with a
 * handler. This helper owns that loop so the wiring can be unit-tested, and:
 * - returns `undefined` (a quiet no-op) when `subscribe` is absent, throws, or
 *   produces a non-async-iterable value;
 * - never rejects: the background loop contains stream errors (normal on
 *   abort) and per-event handler failures;
 * - aborts the subscription from the returned cleanup.
 *
 * @param {unknown} stream  Candidate `ctx.event` object.
 * @param {(event: unknown) => unknown} handler Event consumer.
 * @returns {(() => void) | undefined} cleanup that aborts the subscription.
 */
export function subscribeEventStream(stream, handler) {
  const subscribe = stream?.subscribe;
  if (typeof subscribe !== 'function') return undefined;

  const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
  const onEvent = typeof handler === 'function' ? handler : () => {};

  const abort = () => {
    try {
      controller?.abort();
    } catch {
      // ignore abort failures
    }
  };

  let iterable;
  try {
    iterable = subscribe.call(stream, controller ? { signal: controller.signal } : {});
  } catch {
    abort();
    return undefined;
  }

  if (!iterable || typeof iterable[Symbol.asyncIterator] !== 'function') {
    abort();
    return undefined;
  }

  void (async () => {
    try {
      for await (const event of iterable) {
        try {
          await onEvent(event);
        } catch {
          // Per-event containment: one throwing handler must not end the loop.
        }
      }
    } catch {
      // Stream aborted or failed: nothing left to do in the background.
    }
  })();

  return abort;
}

/**
 * Resolve the pack version from installer markers first, then the pack
 * package.json. A consumer's own package.json must never win, so the
 * package fallback is gated on the package name.
 */
export function selectPackVersion({ markers = [], packageName, packageVersion } = {}) {
  for (const marker of markers) {
    if (typeof marker === 'string' && marker.trim()) return marker.trim();
  }

  if (packageName === 'agents-opencode' && typeof packageVersion === 'string' && packageVersion) {
    return packageVersion;
  }

  return 'unknown';
}
