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
  'See https://agnts.elkodr.com/troubleshooting/#agent-refuses-to-read-a-file-that-looks-like-a-secret; .env.example lists the expected variable names.';

// A quoted literal is a real path argument; an unquoted identifier is code.
const QUOTES = ["'", '"', '`'];

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
const NEW_READER_VERBS = new Set(['rg', 'bat', 'xxd', 'base64', 'od', 'strings']);
const SHELL_READ_VERBS = new Set(['cat', 'head', 'tail', 'less', 'more', 'source', '.', 'grep', 'awk', 'sed', 'rg', 'bat', 'xxd', 'base64', 'od', 'strings']);
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

// grep/sed/awk take a pattern/script operand that is text, never a file path.
// Only the remaining operands (and explicit file options) are reads, so a grep
// pattern containing `.env`/`.key` must not block the command.
const PATTERN_VERBS = new Set(['grep', 'sed', 'awk', 'rg']);

// Short options whose value is the pattern/script, a pattern file, or a value
// that must be consumed so it cannot be mistaken for a positional operand.
const PATTERN_SHORT_OPTIONS = { grep: new Set(['e']), sed: new Set(['e']), awk: new Set(['e']), rg: new Set(['e']) };
const FILE_SHORT_OPTIONS = { grep: new Set(['f']), sed: new Set(['f']), awk: new Set(['f', 'E', 'i']), rg: new Set(['f']) };
const GLOB_SHORT_OPTIONS = { rg: new Set(['g']) };
const VALUE_SHORT_OPTIONS = { grep: new Set(['A', 'B', 'C', 'd', 'D', 'm']), awk: new Set(['v', 'F']), rg: new Set(['A', 'B', 'C', 'm', 'M', 'j', 't', 'T', 'r']) };

// Long options by role: pattern/script text, a file read (`--exclude-from`
// reads its file), or a content filter (`--include` surfaces matching files).
const PATTERN_LONG_OPTIONS = { grep: new Set(['regexp']), sed: new Set(['expression']), awk: new Set(['source']), rg: new Set(['regexp']) };
const FILE_LONG_OPTIONS = new Set(['file', 'exclude-from', 'exec', 'ignore-file']);
const FILTER_LONG_OPTIONS = new Set(['include', 'glob']);
// Long options whose value must be consumed but is not a read.
const VALUE_LONG_OPTIONS = new Set([
  'after-context', 'before-context', 'context', 'max-count', 'exclude', 'exclude-dir',
  'label', 'binary-files', 'devices', 'directories',
  'field-separator', 'assign', 'line-length',
  'type', 'type-not', 'iglob', 'max-depth', 'max-filesize', 'sort', 'sortr',
  'threads', 'encoding', 'pre', 'pre-glob', 'colors', 'context', 'after-context',
  'before-context', 'max-count', 'replace',
]);

function hasPatternOption(verb, rawArgs) {
  for (const raw of rawArgs) {
    const probe =
      raw.length > 2 && (raw[0] === '"' || raw[0] === '\'') && raw[raw.length - 1] === raw[0]
        ? raw.slice(1, -1)
        : raw;
    if (probe === '--') return false;
    if (probe.startsWith('--')) {
      const name = probe.slice(2).split('=')[0];
      if (PATTERN_LONG_OPTIONS[verb]?.has(name) || FILE_LONG_OPTIONS.has(name)) return true;
      continue;
    }
    if (probe.startsWith('-') && probe.length > 1) {
      for (const flag of probe.slice(1)) {
        if (PATTERN_SHORT_OPTIONS[verb]?.has(flag) || FILE_SHORT_OPTIONS[verb]?.has(flag)) return true;
      }
    }
  }
  return false;
}

// Classify the operands of grep/sed/awk: pattern/script text is skipped, file
// operands are returned for the secret-path check.
function readVerbOperands(verb, rawArgs) {
  const paths = [];
  let patternAssigned = hasPatternOption(verb, rawArgs);
  let positionalOnly = false;

  for (let index = 0; index < rawArgs.length; index += 1) {
    const raw = rawArgs[index];
    // A quoted option is still an option: strip one quote layer for detection.
    const probe =
      raw.length > 2 && (raw[0] === '"' || raw[0] === '\'') && raw[raw.length - 1] === raw[0]
        ? raw.slice(1, -1)
        : raw;
    if (!positionalOnly && probe === '--') {
      positionalOnly = true;
      continue;
    }
    if (!positionalOnly && probe.startsWith('--')) {
      const name = probe.slice(2).split('=')[0];
      const inline = probe.includes('=') ? probe.slice(probe.indexOf('=') + 1) : null;
      const takeValue = () => (inline === null ? rawArgs[++index] : inline);
      if (PATTERN_LONG_OPTIONS[verb]?.has(name)) {
        takeValue();
        patternAssigned = true;
      } else if (FILE_LONG_OPTIONS.has(name) || FILTER_LONG_OPTIONS.has(name)) {
        const value = takeValue();
        if (value) paths.push(value);
      } else if (VALUE_LONG_OPTIONS.has(name)) {
        takeValue();
      }
      continue;
    }
    if (!positionalOnly && probe.startsWith('-') && probe.length > 1) {
      const chars = probe.slice(1);
      for (let position = 0; position < chars.length; position += 1) {
        const flag = chars[position];
        const isPattern = PATTERN_SHORT_OPTIONS[verb]?.has(flag);
        const isFile = FILE_SHORT_OPTIONS[verb]?.has(flag);
        const isValue = VALUE_SHORT_OPTIONS[verb]?.has(flag);
        const isGlob = GLOB_SHORT_OPTIONS[verb]?.has(flag);
        if (!isPattern && !isFile && !isValue && !isGlob) continue;
        const attached = chars.slice(position + 1);
        const value = attached || rawArgs[++index];
        if (isPattern) {
          patternAssigned = true;
        } else if ((isFile || isGlob) && value) {
          paths.push(String(value).replace(/^(['"]?)!/, '$1'));
        }
        break;
      }
      continue;
    }
    if (!patternAssigned) {
      patternAssigned = true;
      continue;
    }
    paths.push(raw);
  }
  return paths;
}

// Split one segment into argument tokens, keeping quoted spans (including the
// quotes) as a single token. The previous quote-stripping split broke grep
// patterns into fragments, so `"...process.env"` became a fake path.
function splitArgs(segment) {
  const tokens = [];
  let current = '';
  let quote = null;
  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index];
    if (quote) {
      current += char;
      if (char === '\\' && quote === '"' && index + 1 < segment.length) {
        current += segment[index + 1];
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
    if (char === '\\' && index + 1 < segment.length) {
      current += char + segment[index + 1];
      index += 1;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) tokens.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

function shellGuardError(payload) {
  const command = resolveShellCommand(payload);
  if (!command) return null;
  // Command substitution inside a quoted operand still runs; scan its body.
  for (const match of command.matchAll(/\$\(([^()]*)\)/g)) {
    const substituted = shellGuardError({ args: { command: match[1] } });
    if (substituted) return substituted;
  }
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
      const candidate = normalizeShellToken(token);
      if (!isBlockedReadPath(candidate)) continue;
      // `.key`/`.pem` identifiers are code (`o.key`), not paths, unless the raw
      // command quotes them or the token carries a path separator. `.env`,
      // `.envrc`, and credential filenames stay blocked unconditionally.
      const basename = candidate.split(/[/\\]/).pop()?.toLowerCase() || '';
      const ambiguous = basename.endsWith('.key');
      if (ambiguous) {
        // shortcut: a bare unquoted .key argv path (perl -ne 'print' x.key) is not
        // inspected; quoted, path-like, and option values still block.
        const words = command.split(/\s+/);
        const unquoted = words.map((word) => word.replace(/^['"]|['"]$/g, ''));
        const optionValue =
          unquoted.some((word) => /^-{1,2}[^=]+=/.test(word) && word.endsWith('=' + token)) ||
          unquoted.some((word, index) => /^-{1,2}[^=]+$/.test(word) && words[index + 1] === token);
        const pathLike = /[/\\]/.test(token) || token.startsWith('-') || optionValue;
        const quoted = QUOTES.some((quote) => command.includes(quote + token));
        if (!pathLike && !quoted) continue;
      }
      return `[agents-opencode] Blocked shell read of sensitive file: ${candidate}. Use the environment variable instead of reading the file. ${SENSITIVE_READ_HINT}`;
    }
  }
  // `<` is input redirection (`cat<.env`), not a command separator.
  for (const segment of splitShellSegments(command.replace(/</g, ' '))) {
    // Naive tokens keep the previous verb detection for wrapped command
    // strings (`bash -c 'cat .env'`), where the quoted body hides the verb.
    const naiveTokens = segment
      .trim()
      .split(/\s+/)
      .flatMap((token) => (token.length > 2 ? token.replace(/^['"]|['"]$/g, '') : token).split(/[;|&()`]+/))
      .filter(Boolean);
    if (naiveTokens.length === 0) continue;
    const tokens = naiveTokens.map(normalizeShellToken);
    // Find the first token that is a read/copy verb, skipping wrappers and any
    // options they take (`sudo -u x cat .env`, `FOO=1 cat .env`).
    let verbIndex = -1;
    for (let index = 0; index < tokens.length; index += 1) {
      const candidate = tokens[index].split(/[/\\]/).pop()?.toLowerCase() || '';
      if (NEW_READER_VERBS.has(candidate) && index > 0) {
        const lead = tokens.find((token, position) => position < index && !/^[A-Za-z_][\w]*=/.test(token));
        const leadName = lead ? lead.split(/[/\\]/).pop()?.toLowerCase() || '' : '';
        const executes = !lead || SHELL_WRAPPERS.has(leadName) ||
          ['bash', 'sh', 'zsh', 'dash', 'timeout', 'xargs', 'nice', 'then', 'do', 'if', 'while', 'until', '!', '{', 'eval', 'find', 'parallel', 'su', 'busybox'].includes(leadName) ||
          /^\d*[<>]/.test(lead);
        if (!executes) continue;
      }
      if (SHELL_READ_VERBS.has(candidate) || SHELL_COPY_VERBS.has(candidate)) {
        verbIndex = index;
        break;
      }
    }
    if (verbIndex === -1) continue;
    const verb = tokens[verbIndex].split(/[/\\]/).pop()?.toLowerCase() || '';
    const rawArgs = naiveTokens.slice(verbIndex + 1);
    const args = tokens.slice(verbIndex + 1).filter((token) => !token.startsWith('-'));
    if (SHELL_READ_VERBS.has(verb)) {
      // Pattern verbs re-parse with quotes preserved so a pattern is not split
      // into fake paths. When the verb sits inside a quoted command string the
      // quote-aware pass finds none, so classify the naive operands the same
      // way instead of treating the pattern as a file.
      let targets = PATTERN_VERBS.has(verb) ? readVerbOperands(verb, rawArgs) : args;
      if (PATTERN_VERBS.has(verb)) {
        const quotedTokens = splitArgs(segment);
        const quotedVerbIndex = quotedTokens.findIndex(
          (token) => (normalizeShellToken(token).split(/[/\\]/).pop()?.toLowerCase() || '') === verb,
        );
        // A quoted literal later in the line is not the verb; requiring the
        // same position keeps the naive operands instead of dropping the read.
        // The quoted parse is authoritative only when it names a real file
        // operand; an empty result means a quoted body hid the read, so keep
        // the conservative naive operands.
        if (quotedVerbIndex === verbIndex && !segment.includes('$(')) {
          const quotedPaths = readVerbOperands(verb, quotedTokens.slice(quotedVerbIndex + 1));
          if (quotedPaths.length > 0) targets = quotedPaths;
        }
      }
      for (const target of targets) {
        const candidate = normalizeShellToken(target);
        if (isBlockedReadPath(candidate)) {
          return `[agents-opencode] Blocked shell read of sensitive file: ${candidate}. Use the environment variable instead of reading the file. ${SENSITIVE_READ_HINT}`;
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
 * entry, which is fixed text.
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
