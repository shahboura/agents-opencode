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

// One hint appended to every secret-block message, so a user can tell a false
// positive from a real guard.
const SENSITIVE_READ_HINT =
  'See https://agnts.elkodr.com/troubleshooting/#agent-refuses-to-read-a-file-that-looks-like-a-secret';

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
// approves `ask`-level shell commands. This covers direct forms (wrappers,
// absolute paths, and direct interpreter references) but stays best-effort:
// encoded or computed paths and aliases still bypass. It is not a sandbox.
const SHELL_TOOLS = new Set(['bash', 'shell']);
const SHELL_READ_VERBS = new Set(['cat', 'head', 'tail', 'less', 'more', 'source', '.', 'grep', 'awk', 'sed']);
// For copy-like verbs only the source argument is a read; `cp .env.example .env`
// must keep working.
const SHELL_COPY_VERBS = new Set(['cp', 'mv', 'ln', 'tee', 'dd']);
// Interpreters can read any file from code, so a blocked path anywhere in the
// command is treated as a read. This catches `python -c` and heredocs; encoded
// or computed paths still bypass (best-effort guard, not a sandbox).
const SHELL_INTERPRETER_VERBS = new Set(['python', 'python3', 'node', 'nodejs', 'perl', 'ruby', 'deno', 'bun']);
// Commands that run another command; the interpreter can sit after them.
const SHELL_WRAPPERS = new Set(['sudo', 'env', 'command', 'nohup', 'time', 'exec']);

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

function splitShellSegments(command) {
  const segments = [];
  let current = '';
  let quote = null;
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (quote) {
      current += char;
      if (char === '\\' && quote === '"' && index + 1 < command.length) {
        current += command[index + 1];
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === '\\' && index + 1 < command.length) {
      current += char + command[index + 1];
      index += 1;
      continue;
    }
    if (char === ';' || char === '&' || char === '|' || char === '\n' || char === '(' || char === ')' || char === '`') {
      if (current.trim()) segments.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) segments.push(current);
  return segments;
}

function shellGuardError(payload) {
  const command = resolveShellCommand(payload);
  if (!command) return null;
  // Input redirection is a read even when the command word takes no path
  // argument (`tee out < .env`). Ignore `<` inside quotes, then check before
  // stripping it for tokenizing.
  const unquoted = command.replace(/(['"])(?:\\.|(?!\1)[^\\])*\1/g, ' ');
  for (const segment of splitShellSegments(unquoted)) {
    for (const match of segment.matchAll(/<\s*([^\s;&|]+)/g)) {
      const target = normalizeShellToken(match[1].replace(/^<+/, ''));
      if (isBlockedReadPath(target)) {
        return `[agents-opencode] Blocked shell read of sensitive file: ${target}. Use the environment variable instead of reading the file. ${SENSITIVE_READ_HINT}`;
      }
    }
  }
  // The quote strip above hides a quoted target (`dd < ".env"`), so scan the
  // raw command for that form as well.
  for (const match of command.matchAll(/<\s*(['"])([^'"]+)\1/g)) {
    const target = normalizeShellToken(match[2]);
    if (isBlockedReadPath(target)) {
      return `[agents-opencode] Blocked shell read of sensitive file: ${target}. Use the environment variable instead of reading the file. ${SENSITIVE_READ_HINT}`;
    }
  }
  // Only a command word can be an interpreter: `git commit -m "node .env"` and
  // `echo node .env` mention one. A wrapper (`sudo`, `env`, `command`) runs the
  // next command, so an interpreter after it still counts.
  const isInterpreter = (word) =>
    SHELL_INTERPRETER_VERBS.has(
      normalizeShellToken(word).split(/[/\\]/).pop()?.toLowerCase().replace(/[0-9.]+$/, '') || '',
    );
  const hasInterpreter = splitShellSegments(command).some((segment) => {
    const words = segment.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return false;
    const first = normalizeShellToken(words[0]).split(/[/\\]/).pop()?.toLowerCase() || '';
    if (SHELL_WRAPPERS.has(first)) return words.slice(1).some(isInterpreter);
    return isInterpreter(words[0]);
  });
  if (hasInterpreter) {
    for (const token of command.split(/[^A-Za-z0-9._/\\-]+/)) {
      // `process.env` is an identifier, not a file path.
      if (/^[A-Za-z_$][\w$]*\.env$/.test(token)) continue;
      if (isBlockedReadPath(normalizeShellToken(token))) {
        return `[agents-opencode] Blocked shell read of sensitive file: ${normalizeShellToken(token)}. Use the environment variable instead of reading the file. ${SENSITIVE_READ_HINT}`;
      }
    }
  }
  // `<` is input redirection (`cat<.env`), not a command separator.
  for (const segment of splitShellSegments(command.replace(/</g, ' '))) {
    const rawTokens = segment
      .trim()
      .split(/\s+/)
      .flatMap((token) => token.replace(/^['"]|['"]$/g, '').split(/[;|&()`]+/))
      .filter(Boolean);
    if (rawTokens.length === 0) continue;
    const tokens = rawTokens.map(normalizeShellToken);
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
    const rawArgs = rawTokens.slice(verbIndex + 1);
    const args = tokens.slice(verbIndex + 1).filter((token) => !token.startsWith('-'));
    if (SHELL_READ_VERBS.has(verb)) {
      for (const arg of args) {
        if (isBlockedReadPath(arg)) {
          return `[agents-opencode] Blocked shell read of sensitive file: ${arg}. Use the environment variable instead of reading the file. ${SENSITIVE_READ_HINT}`;
        }
      }
      continue;
    }
    if (!SHELL_COPY_VERBS.has(verb)) continue;
    if (verb === 'dd') {
      // `dd if=.env` anywhere in the argument list is a read, regardless of order.
      for (const raw of rawArgs) {
        const input = raw.match(/^if=(.+)$/);
        if (input && isBlockedReadPath(normalizeShellToken(input[1]))) {
          return `[agents-opencode] Blocked shell copy of sensitive file: ${input[1]}. Use the environment variable instead of copying the file. ${SENSITIVE_READ_HINT}`;
        }
      }
      continue;
    }
    // For cp/mv/ln, the last positional is the destination unless a target
    // directory was supplied (`-t`, `-rt`, `-t/dir`, `--target-directory`,
    // `--target-dir=/dir`). With a target directory every positional is a source.
    let targetDirValue = null;
    for (let index = 0; index < rawArgs.length; index += 1) {
      const raw = rawArgs[index];
      // GNU long-option abbreviations (`--target-dir`, `--target-direct`).
      const long = raw.match(/^--target-[a-z]+(?:=(.*))?$/);
      if (long) {
        if (long[1] !== undefined) {
          targetDirValue = normalizeShellToken(long[1]);
        } else {
          targetDirValue = rawArgs[index + 1] ? normalizeShellToken(rawArgs[index + 1]) : null;
          index += 1;
        }
        continue;
      }
      // Short option with `t`: attached value (`-tdir`, `-rt/tmp`) or the next
      // argument (`-t`, `-rt`).
      const short = raw.match(/^-[a-zA-Z]*t(.*)$/);
      if (short) {
        if (short[1]) {
          targetDirValue = normalizeShellToken(short[1]);
        } else {
          targetDirValue = rawArgs[index + 1] ? normalizeShellToken(rawArgs[index + 1]) : null;
          index += 1;
        }
      }
    }
    let sources;
    if (targetDirValue) {
      // Drop the target-directory operand, not every positional with that value.
      const targetIndex = args.indexOf(targetDirValue);
      sources = targetIndex === -1 ? args : [...args.slice(0, targetIndex), ...args.slice(targetIndex + 1)];
    } else {
      sources = args.slice(0, -1);
    }
    for (const source of sources) {
      if (isBlockedReadPath(source)) {
        return `[agents-opencode] Blocked shell copy of sensitive file: ${source}. Use the environment variable instead of copying the file. ${SENSITIVE_READ_HINT}`;
      }
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
    return `[agents-opencode] Blocked reading sensitive file: ${filePath}. Do not read or search credential or secret files. ${SENSITIVE_READ_HINT}`;
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
 * Replace (or clear) one model-facing system part by text prefix.
 *
 * The static pack block is injected once via `injectSystemContextOnce`; the
 * context-budget band must change as the session grows, so it lives in its own
 * part and is replaced on every request. This also makes the update correct if
 * the host reuses the `system` array across requests instead of rebuilding it.
 *
 * @param {unknown} target      Candidate `system` parts array.
 * @param {string[]|string} prefixes Part text prefixes to replace/remove.
 * @param {string} [text]       New part text; omit/blank to only remove.
 * @returns {boolean} true when a part was pushed (false on clear/no-op/failure).
 */
export function replaceSystemContextPart(target, prefixes, text) {
  if (!Array.isArray(target)) return false;

  const markers = (Array.isArray(prefixes) ? prefixes : [prefixes]).filter(
    (prefix) => typeof prefix === 'string' && prefix.length > 0
  );
  if (markers.length === 0) return false;

  try {
    for (let index = target.length - 1; index >= 0; index -= 1) {
      const part = target[index];
      if (
        part !== null &&
        typeof part === 'object' &&
        typeof part.text === 'string' &&
        markers.some((marker) => part.text.startsWith(marker))
      ) {
        target.splice(index, 1);
      }
    }
  } catch {
    // A frozen/sealed array cannot be updated; leave it untouched.
    return false;
  }

  if (typeof text !== 'string' || text.trim() === '') return false;

  try {
    target.push({ type: 'text', text });
    return true;
  } catch {
    return false;
  }
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
 * Session context-budget bands. Sorted high-to-low; `line()` reports the
 * highest band reached and never downgrades within a session (so a transient
 * token report cannot hide an earlier warning). Reset happens on compaction.
 */
const CONTEXT_BANDS = [
  { min: 0.5, key: 'stop', text: 'Context budget 50%+ — stop new work and hand off.' },
  { min: 0.4, key: 'handoff', text: 'Context budget 40%+ — write the handoff or delegate before the next phase.' },
  { min: 0.3, key: 'ask', text: 'Context budget 30%+ — ask the user: continue, delegate, or hand off.' },
];

/** Sum the token fields the host uses for measured context. */
function tokenTotal(tokens) {
  if (!tokens || typeof tokens !== 'object') return 0;
  const num = (value) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  const cache = tokens.cache && typeof tokens.cache === 'object' ? tokens.cache : {};
  return num(tokens.input) + num(tokens.output) + num(tokens.reasoning) + num(cache.read) + num(cache.write);
}

/**
 * Track measured context per session from completed assistant messages.
 *
 * The host emits `message.updated` several times per message while streaming;
 * only a completed message is counted, and a repeated `messageID` is ignored.
 * A large negative step (>50% drop) is treated as an in-band compaction and
 * clears the band; an explicit compaction/reset event also clears it.
 *
 * `line()` returns at most one band line plus a one-shot per-call warning. The
 * text is static per band (no exact percentage) so the system prefix only
 * changes when a band changes.
 *
 * @param {{bands?: Array<{min: number, text: string}>, perCallFraction?: number}} [options]
 */
export function createContextBudgetTracker(options = {}) {
  const bands =
    Array.isArray(options.bands) && options.bands.length > 0 ? options.bands : CONTEXT_BANDS;
  const perCallFraction =
    typeof options.perCallFraction === 'number' && options.perCallFraction > 0
      ? options.perCallFraction
      : 0.025;
  const perCallPercent = Number((perCallFraction * 100).toFixed(1));
  const sessions = new Map();

  const reset = (sessionID) => {
    if (typeof sessionID === 'string' && sessionID) sessions.delete(sessionID);
  };

  const note = (event) => {
    try {
      if (!event || typeof event !== 'object') return false;

      const eventSessionID = event?.properties?.sessionID;
      if (
        (event.type === 'session.compacted' ||
          event.type === 'session.compaction.ended' ||
          event.type === 'session.deleted') &&
        typeof eventSessionID === 'string'
      ) {
        reset(eventSessionID);
        return false;
      }

      if (event.type !== 'message.updated') return false;
      const info = event?.properties?.info ?? event?.info;
      if (!info || info.role !== 'assistant') return false;

      const messageID = typeof info.id === 'string' ? info.id : '';
      const sessionID =
        typeof info.sessionID === 'string' ? info.sessionID : eventSessionID;
      if (!messageID || !sessionID || !info.time?.completed) return false;

      const used = tokenTotal(info.tokens);
      if (used <= 0) return false;

      const state =
        sessions.get(sessionID) ?? { messageID: '', used: 0, band: -1, delta: 0 };
      if (state.messageID === messageID) return false;

      const previousUsed = state.used;
      const delta = previousUsed > 0 ? used - previousUsed : 0;
      state.messageID = messageID;
      state.used = used;
      state.delta = delta > 0 ? delta : 0;
      // A >50% drop is compaction (even if the host's reset event is missed);
      // a small drop is a token-report correction and keeps the earlier band.
      if (delta < 0 && used < previousUsed * 0.5) state.band = -1;
      sessions.set(sessionID, state);
      return true;
    } catch {
      return false;
    }
  };

  const line = (sessionID, limit) => {
    try {
      const state = sessions.get(sessionID);
      if (!state || !Number.isFinite(limit) || limit <= 0) return undefined;

      let index = -1;
      for (let i = 0; i < bands.length; i += 1) {
        if (state.used >= limit * bands[i].min) {
          index = i;
          break;
        }
      }

      const delta = state.delta;
      state.delta = 0;
      const deltaText =
        delta > limit * perCallFraction
          ? `Last step added ~${Math.round(delta / 1000)}k tokens (>${perCallPercent}% of the window) — extract or delegate the next one.`
          : undefined;

      // No band yet: still surface a large single-step warning, if any. An
      // existing band is kept (never downgrade within a session) until a
      // compaction reset.
      if (index === -1 && state.band === -1) return deltaText;
      if (index !== -1 && (state.band === -1 || index < state.band)) state.band = index;

      const bandText = state.band === -1 ? undefined : bands[state.band]?.text;
      return [bandText, deltaText].filter(Boolean).join('\n') || undefined;
    } catch {
      return undefined;
    }
  };

  return { note, line, reset };
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
