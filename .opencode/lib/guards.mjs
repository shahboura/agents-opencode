// Pure guard helpers for the agents-opencode plugin.
// Kept dependency-free so they can be unit-tested outside the OpenCode runtime.
//
// `isBlockedReadPath` is the secret-content policy shared by the `read` and
// `grep` guards: `grep` returns matching lines, so guarding `read` alone would
// leave secrets readable through search.
//
// shortcut: grep is guarded only when its path is a secret basename; pathless,
// directory, and include-filtered greps are not inspected. Upgrade if the grep
// tool exposes a complete file set.

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
 * Decide whether a path holds secret content that `read` or `grep` must not touch.
 *
 * Policy: deny by default for secret-ish files, but allow explicit public
 * certificate/key forms and checked-in env templates. `.pem`/`.key` stay
 * blocked (dual-use private-key conventions) with a public-cert allowlist;
 * the rare false positive (e.g. Apple Keynote `.key` files) is accepted and
 * remains bypassable by design. direnv files (`.envrc`, `.envrc.*`) are blocked
 * like `.env`: direnv exports their values into the shell.
 */
export function isBlockedReadPath(filePath) {
  const basename = String(filePath ?? '').split(/[/\\]/).pop()?.toLowerCase() || '';
  if (!basename) return false;

  const isEnvSecret =
    basename === '.env' ||
    basename.startsWith('.env.') ||
    basename.endsWith('.env') ||
    basename === '.envrc' ||
    basename.startsWith('.envrc.');
  const isEnvTemplate = ENV_TEMPLATE_SUFFIXES.some((suffix) => basename.endsWith(suffix));
  if (isEnvSecret && !isEnvTemplate) return true;

  if (PUBLIC_CREDENTIAL_SUFFIXES.some((suffix) => basename.endsWith(suffix))) return false;
  if (PUBLIC_PEM_BASENAMES.has(basename)) return false;

  return BLOCKED_READ_SUFFIXES.some((suffix) => basename.endsWith(suffix));
}

/**
 * Resolve a path argument from a hook payload, tolerating every documented
 * shape. The plugin hands the whole v2 event (or the v1 `output`) to the guard,
 * so the path can sit in any of these locations; the first non-nullish value
 * wins:
 * - `payload.args[key]`       v1 `tool.execute.before` output
 * - `payload[key]`            flat v2 event `{ tool, filePath }`
 * - `payload.input[key]`      v2 event `{ tool, input: { filePath } }`
 * - `payload.input.args[key]` v2 event `{ tool, input: { args: { filePath } } }`
 *
 * `key` is `filePath` for `read` and `path` for `grep`.
 */
function resolveToolPath(payload, key) {
  const candidates = [
    payload?.args?.[key],
    payload?.[key],
    payload?.input?.[key],
    payload?.input?.args?.[key],
  ];
  // Skip empty/whitespace strings so a blank earlier candidate cannot shadow a
  // real path in a later one (fail-closed on guarded paths).
  return candidates.find((value) => typeof value === 'string' && value.trim() !== '');
}

// Argument that carries the guarded path, per tool. Shell tools are handled
// separately by `shellGuardError` (read verbs only); every other tool is
// unguarded: this is a best-effort secret-content guard, not a sandbox — an
// interpreter can reach any file regardless.
const GUARDED_PATH_KEYS = new Map([
  ['read', 'filePath'],
  ['grep', 'path'],
]);

// Shell tools can read the same files the `read` guard blocks, and `--auto`
// approves `ask`-level shell commands. This covers the common direct forms
// (wrappers and absolute paths included) but stays best-effort: globs are
// normalized, interpreters (`python -c`, `node -e`) and aliases remain
// unguarded. It is not a sandbox.
const SHELL_TOOLS = new Set(['bash', 'shell']);
const SHELL_READ_VERBS = new Set(['cat', 'head', 'tail', 'less', 'more', 'source', '.', 'grep', 'awk', 'sed']);
// For copy-like verbs only the source argument is a read; `cp .env.example .env`
// must keep working.
const SHELL_COPY_VERBS = new Set(['cp', 'mv', 'ln', 'tee', 'dd']);

function resolveShellCommand(payload) {
  const candidates = [
    payload?.args?.command,
    payload?.command,
    payload?.input?.command,
    payload?.input?.args?.command,
  ];
  return candidates.find((value) => typeof value === 'string' && value.trim() !== '');
}

function normalizeShellToken(token) {
  const assignment = token.match(/^-{1,2}[^=]+=(.+)$/);
  const value = assignment ? assignment[1] : token;
  return value
    .replace(/^['"]|['"]$/g, '')
    .replace(/^\\/, '')
    .replace(/[*?[\]{}]/g, '');
}

function shellGuardError(payload) {
  const command = resolveShellCommand(payload);
  if (!command) return null;
  // `<` is input redirection (`cat<.env`), not a command separator.
  for (const segment of command.replace(/</g, ' ').split(/[;&|\n]+/)) {
    const tokens = segment
      .trim()
      .split(/\s+/)
      .map(normalizeShellToken)
      .filter(Boolean);
    if (tokens.length === 0) continue;
    // Find the first token that is a read/copy verb, skipping wrappers and any
    // options they take (`sudo -u x cat .env`, `FOO=1 cat .env`).
    let verbIndex = -1;
    for (let index = 0; index < tokens.length; index += 1) {
      const candidate = tokens[index].split(/[/\\]/).pop()?.toLowerCase() || '';
      if (SHELL_READ_VERBS.has(candidate) || SHELL_COPY_VERBS.has(candidate)) {
        verbIndex = index;
        break;
      }
    }
    if (verbIndex === -1) continue;
    const verb = tokens[verbIndex].split(/[/\\]/).pop()?.toLowerCase() || '';
    const args = tokens.slice(verbIndex + 1).filter((token) => !token.startsWith('-'));
    if (SHELL_READ_VERBS.has(verb)) {
      for (const arg of args) {
        if (isBlockedReadPath(arg)) {
          return `[agents-opencode] Blocked shell read of sensitive file: ${arg}. Use the environment variable instead of reading the file.`;
        }
      }
    } else if (SHELL_COPY_VERBS.has(verb) && args.length > 0 && isBlockedReadPath(args[0])) {
      return `[agents-opencode] Blocked shell copy of sensitive file: ${args[0]}. Use the environment variable instead of copying the file.`;
    }
  }
  return null;
}

/**
 * Return the block message when `tool` would surface secret content from
 * `payload`, or null when the call is allowed.
 *
 * This is the policy core: a thin wrapper over `isBlockedReadPath` that
 * normalizes both hook payload shapes through `resolveToolPath` for the two
 * content-reading tools. `grep` is guarded alongside `read` because it returns
 * matching lines and every agent has unrestricted `grep`. It never relaxes the
 * policy, and callers must throw on a non-null result (block, not `ask`).
 * `handleToolExecuteBefore` is the event-aware entrypoint the plugin calls;
 * this function stays path/policy-focused so it can be tested directly.
 */
export function readGuardError(tool, payload) {
  if (SHELL_TOOLS.has(tool)) {
    return shellGuardError(payload);
  }
  const pathKey = GUARDED_PATH_KEYS.get(tool);
  if (!pathKey) return null;
  const filePath = resolveToolPath(payload, pathKey);
  if (typeof filePath === 'string' && isBlockedReadPath(filePath)) {
    return `[agents-opencode] Blocked reading sensitive file: ${filePath}. Do not read or search credential or secret files.`;
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
 * (event shape -> policy) instead of only the policy core. The same seam covers
 * `read` and `grep` secret-content checks, plus best-effort shell read/copy
 * forms; other tools pass through unguarded. Two call forms cover both entrypoints:
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
 * block policy as `handleToolExecuteBefore` (secret-content guard, `read` and
 * `grep`), plus rate-limited telemetry for the fail-open case.
 *
 * Why telemetry: the guard is fail-open by design (the real v2 `read` payload
 * shape is unverified), so a `read` whose path cannot be resolved from any
 * documented shape proceeds unguarded. Without a signal, a payload-shape
 * mismatch would silently disable the pack's only secret-content control. When
 * that case is seen, `onUnresolvedRead` is invoked at most once per handler
 * instance (the plugin creates one handler per setup call), so the mismatch
 * becomes visible in logs without warning on every read. `grep` gets no
 * telemetry: its `path` is optional by design (a pathless grep searches the
 * working directory), so "unresolved" is normal there.
 *
 * Runtime behaviour is otherwise unchanged: a blocked `read`/`grep` still
 * throws, and telemetry failures are contained — they must never break the
 * guard path.
 *
 * @param {() => void} [onUnresolvedRead] Called at most once, with no arguments.
 * @returns {(toolOrEvent: unknown, payload?: unknown) => void} Hook handler; throws on a blocked call.
 */
export function createReadGuardHandler(onUnresolvedRead) {
  const notify = typeof onUnresolvedRead === 'function' ? onUnresolvedRead : () => {};
  let warned = false;

  return (toolOrEvent, payload) => {
    const split = splitToolAndPayload(toolOrEvent, payload);

    if (
      split.tool === 'read' &&
      resolveToolPath(split.payload, 'filePath') === undefined &&
      !warned
    ) {
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
