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

// The shipped plugin file lives in `.opencode/plugins/`; both entrypoints are in
// this one file (named export for v1, default export for v2).
const PLUGIN_FILE = 'agents-opencode.ts';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Accepts "2", "2.0.4", "v2.0.7"; returns the major number or null.
function parseMajor(version) {
  if (version === undefined || version === null) return null;
  const match = String(version).trim().match(/^v?(\d+)/i);
  if (!match) return null;
  const major = Number.parseInt(match[1], 10);
  return Number.isNaN(major) ? null : major;
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
 * wins. 'auto' selects v2 only when a v2 host version is known; otherwise it
 * stays on v1 (the safe, backwards-compatible default until detection lands).
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

  const major = parseMajor(detectedVersion);
  return major !== null && major >= 2 ? 'v2' : 'v1';
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
 * Build the installer-managed portion of a config for a single target. The
 * result contains the target's keys only — never both v1 and v2 key sets.
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
  resolveTarget,
  configKeysFor,
  emitConfig,
  configPatchShape,
  revertKeysFor,
  transformAgentFrontmatter,
  transformCommandFrontmatter,
  transformSkillFrontmatter,
  pluginEntrypoints,
};
