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
  if (payload === undefined && toolOrEvent !== null && typeof toolOrEvent === 'object') {
    return readGuardError(toolOrEvent.tool, toolOrEvent);
  }
  return readGuardError(toolOrEvent, payload);
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
