'use strict';

/**
 * OpenCode install-target adapter (Workstream A, Phase 2).
 *
 * The package targets OpenCode v1 today. v1 and v2 config keys are disjoint, so
 * a single static config cannot express both; this adapter emits per-target
 * config instead of concatenating. v2 additionally auto-translates v1-shaped
 * config, agents, and commands in memory, so only the keys v2 does *not*
 * translate (notably the plugin key) have to change here.
 *
 * Grounded against the OpenCode v2 docs (config, permissions, plugins):
 *   - plugin key:     v1 `plugin`              -> v2 `plugins`
 *   - permission key: v1 `permission` (object) -> v2 `permissions`
 *                     (array of { action, resource, effect })
 *   - action renames: bash -> shell, task -> subagent, write/patch -> edit
 *   - `doom_loop` / `lsp` are not v2 permission actions
 *
 * The agent/command/skill transforms default to passthrough because v2
 * auto-translates v1 frontmatter; they exist as the seam for a future
 * explicit `--v2-native` rewrite (Phase 4/5).
 */

const { spawnSync } = require('child_process');
const os = require('os');

const TARGETS = ['v1', 'v2'];

const CONFIG_SCHEMA = 'https://opencode.ai/config.json';

const KEYS = {
  v1: { schema: CONFIG_SCHEMA, permissionKey: 'permission', pluginKey: 'plugin' },
  v2: { schema: CONFIG_SCHEMA, permissionKey: 'permissions', pluginKey: 'plugins' },
};

// The keys the installer is allowed to write/revert for each target. Kept
// disjoint so a config file never holds both the v1 and v2 key sets.
const MANAGED_KEYS = {
  v1: ['$schema', 'plugin', 'permission'],
  v2: ['$schema', 'plugins', 'permissions'],
};

// v1 permission action -> v2 permission action (identity when not listed).
const ACTION_RENAMES = { bash: 'shell', task: 'subagent', write: 'edit', patch: 'edit' };
// v1 permission actions with no v2 core equivalent (dropped on translation).
const NON_V2_ACTIONS = new Set(['doom_loop', 'lsp']);

// v1-only legacy settings that v2 marks "accepted but unsupported": v2 ignores
// them and logs `omitted unsupported legacy setting`. Grounded in the v2
// migration guide ("Accepted but unsupported fields",
// https://v2.opencode.ai/docs/migrate-v1) and proven at runtime by the v2.0.30
// sandbox for `subagent_depth` and `compaction.prune`. `logLevel` and `server`
// are the other two top-level members of the same documented set.
const V2_IGNORED_TOP_LEVEL_KEYS = ['subagent_depth', 'logLevel', 'server'];
// Nested `compaction` members with no v2 behavior (v2 uses `keep.tokens` and
// checkpoint-based compaction). `compaction` itself stays a v2 key.
const V2_IGNORED_COMPACTION_KEYS = ['prune', 'tail_turns'];

// The shipped plugin file lives in `.opencode/plugins/`; both entrypoints are in
// this one file (named export for v1, default export for v2).
const PLUGIN_FILE = 'agents-opencode.ts';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Tolerant host-version parser. Accepts "1.19.0", "2.0.4", "v2.1", and
// "opencode 2.0.4"; returns the major number, or undefined for anything without
// a recognisable version token (garbage, empty, null/undefined).
//
// A dotted token (major.minor[.patch], optional leading v) is preferred over a
// bare integer, so a leading non-version number in a banner (e.g.
// "build 2024 1.19.0") is not mistaken for the major version. The bare major is
// only used as a fallback when no dotted token exists.
function parseHostMajor(version) {
  if (version === undefined || version === null) return undefined;
  const text = String(version).trim();
  const dotted = text.match(/\bv?(\d+)\.\d+(?:\.\d+)*\b/i);
  const bare = text.match(/\bv?(\d+)\b/i);
  const match = dotted || bare;
  if (!match) return undefined;
  const major = Number.parseInt(match[1], 10);
  return Number.isNaN(major) ? undefined : major;
}

// Test/CI override and user escape hatch: a non-empty value here skips host
// probing entirely.
const HOST_VERSION_ENV = 'AGENTS_OPENCODE_HOST_VERSION';

function readEnvOverride(env) {
  if (!env) return undefined;
  const value = env[HOST_VERSION_ENV];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * Detect the installed OpenCode host version.
 *
 * An explicit AGENTS_OPENCODE_HOST_VERSION override (options.env, then
 * process.env) wins — this is the hermetic test/CI hook and a user escape hatch.
 * Otherwise the fixed `opencode --version` command is run. Any failure (missing
 * binary, non-zero exit, timeout) resolves to undefined; this never throws.
 *
 * PATH trust assumption: we execute whatever `opencode` the user's PATH resolves
 * to (the tool being extended) — acceptable for an installer. We deliberately do
 * NOT spawn from the current working directory: `cwd` is pinned to the user's
 * home so on Windows `cmd.exe` cannot resolve a repo-local
 * `opencode.cmd`/`opencode.bat` shim ahead of PATH (its CWD-before-PATH
 * precedence), which a hostile repository could otherwise abuse to run code.
 */
function detectHostVersion(options) {
  const override = readEnvOverride(options && options.env) || readEnvOverride(process.env);
  if (override !== undefined) return override;

  try {
    const base = {
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
      // Never spawn from CWD: prevents a repo-local shim from winning PATH
      // resolution on Windows (see the PATH trust note above).
      cwd: os.homedir(),
      // Capture stderr too: `opencode --version` might write the version there,
      // and detection must not silently fail if stdout is empty.
      stdio: ['ignore', 'pipe', 'pipe'],
    };
    const result = process.platform === 'win32'
      // On Windows the `opencode` shim is a .cmd/.ps1, so a shell is required. A
      // single fixed command string (no args array, no interpolation) keeps this
      // injection-safe and avoids Node's DEP0190 warning.
      ? spawnSync('opencode --version', { ...base, shell: true })
      : spawnSync('opencode', ['--version'], base);

    if (result.error || result.status !== 0) return undefined;
    const stdout = result.stdout === undefined || result.stdout === null ? '' : String(result.stdout);
    const stderr = result.stderr === undefined || result.stderr === null ? '' : String(result.stderr);
    const text = (stdout.trim() !== '' ? stdout : stderr).trim();
    return text !== '' ? text : undefined;
  } catch {
    return undefined;
  }
}

function assertTarget(target) {
  if (!TARGETS.includes(target)) {
    throw new Error(`Unknown target '${target}'. Expected one of: ${TARGETS.join(', ')}.`);
  }
  return target;
}

/**
 * Resolve the effective install target.
 *
 * `requested` is 'v1' | 'v2' | 'auto' (default 'auto'). An explicit v1/v2 always
 * wins. 'auto' selects v2 when the detected host major is >= 2; otherwise it
 * stays on v1 (the safe, backwards-compatible default, including when no host
 * version is known).
 */
function resolveTarget({ requested, detectedVersion } = {}) {
  const requestedValue =
    requested === undefined || requested === null ? 'auto' : String(requested).toLowerCase();

  if (requestedValue !== 'auto') {
    if (!TARGETS.includes(requestedValue)) {
      throw new Error(`Unknown target '${requested}'. Expected one of: v1, v2, auto.`);
    }
    return requestedValue;
  }

  const major = parseHostMajor(detectedVersion);
  return typeof major === 'number' && major >= 2 ? 'v2' : 'v1';
}

function configKeysFor(target) {
  const t = assertTarget(target);
  return {
    schema: KEYS[t].schema,
    permissionKey: KEYS[t].permissionKey,
    pluginKey: KEYS[t].pluginKey,
    managedKeys: MANAGED_KEYS[t].slice(),
  };
}

// Translate a v1 permission object into v2 ordered rules, dropping actions that
// have no v2 equivalent and de-duplicating rules that collapse (write+patch).
function v1PermissionToV2Rules(permission) {
  const rules = [];
  const seen = new Set();

  const push = (action, resource, effect) => {
    const rule = { action, resource, effect };
    const key = JSON.stringify(rule);
    if (!seen.has(key)) {
      seen.add(key);
      rules.push(rule);
    }
  };

  for (const [action, value] of Object.entries(permission)) {
    if (NON_V2_ACTIONS.has(action)) continue;
    const mapped = ACTION_RENAMES[action] || action;
    if (typeof value === 'string') {
      push(mapped, '*', value);
    } else if (isPlainObject(value)) {
      for (const [resource, effect] of Object.entries(value)) {
        if (typeof effect === 'string') push(mapped, resource, effect);
      }
    }
  }

  return rules;
}

/**
 * Remove the v1-only legacy settings a v2 host ignores with a warning:
 * top-level `subagent_depth`, `logLevel`, `server`, and the nested
 * `compaction.prune` / `compaction.tail_turns`. `compaction` is only dropped
 * when no v2 members remain. Mutates and returns the given config.
 */
function stripV2IgnoredKeys(config) {
  if (!isPlainObject(config)) return config;

  for (const key of V2_IGNORED_TOP_LEVEL_KEYS) {
    delete config[key];
  }

  if (isPlainObject(config.compaction)) {
    for (const key of V2_IGNORED_COMPACTION_KEYS) {
      delete config.compaction[key];
    }
    if (Object.keys(config.compaction).length === 0) {
      delete config.compaction;
    }
  }

  return config;
}

/**
 * Build the installer-managed portion of a config for a single target. The
 * result contains the target's keys only — never both v1 and v2 key sets.
 *
 * The emitted key set is closed (`$schema`, the plugin key, the permission
 * key), so the v1-only legacy settings can never reach the output on their own:
 * the `stripV2IgnoredKeys` call below is a defensive invariant, not a
 * transformation the current emission depends on. It keeps a future emission
 * change (e.g. copying source keys) from reintroducing the sandbox-proven
 * `omitted unsupported legacy setting` warnings for `subagent_depth` and
 * `compaction.prune`. The v1 output is byte-for-byte unchanged.
 */
function emitConfig(sourceConfig, target) {
  const t = assertTarget(target);
  const keys = KEYS[t];
  const source = isPlainObject(sourceConfig) ? sourceConfig : {};

  const emitted = {
    $schema:
      typeof source.$schema === 'string' && source.$schema ? source.$schema : CONFIG_SCHEMA,
  };

  if (Array.isArray(source.plugin) && source.plugin.length > 0) {
    emitted[keys.pluginKey] = source.plugin.slice();
  }

  if (isPlainObject(source.permission)) {
    if (t === 'v1') {
      emitted.permission = clone(source.permission);
    } else {
      const rules = v1PermissionToV2Rules(source.permission);
      if (rules.length > 0) emitted.permissions = rules;
    }
  }

  if (t === 'v2') {
    stripV2IgnoredKeys(emitted);
  }

  return emitted;
}

/**
 * Canonical revert/patch metadata for a target. install.js records this in the
 * manifest so uninstall can revert exactly the keys the installer added.
 */
function configPatchShape(target) {
  const t = assertTarget(target);
  const keys = KEYS[t];
  return {
    target: t,
    permissionKey: keys.permissionKey,
    pluginKey: keys.pluginKey,
    createdFile: false,
    addedPermissionKeys: [],
    addedPermissionRules: [],
    addedPluginEntries: [],
    createdSchema: false,
    skipped: false,
    changed: false,
  };
}

function revertKeysFor(target) {
  return configKeysFor(target).managedKeys;
}

// Default passthrough: v2 translates v1 frontmatter in memory. These are the
// seam for a future explicit `--v2-native` rewrite (Phase 4/5).
function transformAgentFrontmatter(text, target) {
  assertTarget(target);
  return text;
}

function transformCommandFrontmatter(text, target) {
  assertTarget(target);
  return text;
}

function transformSkillFrontmatter(text, target) {
  assertTarget(target);
  return text;
}

function pluginEntrypoints(target) {
  const t = assertTarget(target);
  return t === 'v1'
    ? { file: PLUGIN_FILE, exportName: 'AgentsOpencodePlugin' }
    : { file: PLUGIN_FILE, exportName: 'default' };
}

module.exports = {
  TARGETS,
  parseHostMajor,
  detectHostVersion,
  resolveTarget,
  configKeysFor,
  emitConfig,
  stripV2IgnoredKeys,
  V2_IGNORED_TOP_LEVEL_KEYS,
  V2_IGNORED_COMPACTION_KEYS,
  configPatchShape,
  revertKeysFor,
  transformAgentFrontmatter,
  transformCommandFrontmatter,
  transformSkillFrontmatter,
  pluginEntrypoints,
};
