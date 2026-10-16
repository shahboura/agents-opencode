'use strict';

const fs = require('fs');
const path = require('path');
const { readJsonFile, writeJsonFile, isObject } = require('./file-ops.js');
const opencodeTarget = require('./opencode-target.js');

// Only installer-managed keys are ever written into a user's config. Opinionated
// package defaults (share, compaction, subagent_depth, watcher, provider, ...)
// must never leak into a user's project or global configuration. The managed key
// set is target-specific (v1: plugin/permission, v2: plugins/permissions) and is
// sourced from scripts/lib/opencode-target.js so v1 and v2 keys never co-exist.

// Plugin entries the installer added in earlier versions and must still strip on
// cleanup even though they are no longer present in the source config.
const RETIRED_PLUGIN_ENTRIES = ['agents-opencode'];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Order-insensitive deep equality for installer-shaped detection. Objects
// compare by key/value regardless of key order (keys sorted recursively), while
// arrays stay order-sensitive. A plain JSON.stringify comparison would flip
// detection whenever object key order differs.
function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = canonicalize(value[key]);
    }
    return sorted;
  }
  return value;
}

function deepEqualOrderInsensitive(a, b) {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}

// Callers without a target keep the historical v1 behavior.
function resolveTargetOrDefault(target) {
  return opencodeTarget.resolveTarget({
    requested: target === undefined || target === null ? 'v1' : target,
  });
}

function otherTarget(target) {
  return target === 'v1' ? 'v2' : 'v1';
}

// Remove the *other* target's installer-shaped managed keys so a config file
// never holds both the v1 and v2 key sets. Only values the installer itself
// would have produced are removed; user-owned values are left untouched.
// Returns true when anything was stripped so the caller can persist the change.
function stripOtherTargetKeys(existing, target, sourceConfig, logWarning) {
  const other = opencodeTarget.configKeysFor(otherTarget(target));
  let changed = false;

  if (existing[other.permissionKey] !== undefined) {
    let installerShaped = false;
    if (other.permissionKey === 'permission') {
      installerShaped =
        isObject(existing.permission) &&
        isObject(sourceConfig.permission) &&
        deepEqualOrderInsensitive(existing.permission, sourceConfig.permission);
    } else {
      const derived = opencodeTarget.emitConfig(sourceConfig, 'v2').permissions;
      installerShaped =
        Array.isArray(existing.permissions) &&
        Array.isArray(derived) &&
        deepEqualOrderInsensitive(existing.permissions, derived);
    }
    if (installerShaped) {
      delete existing[other.permissionKey];
      changed = true;
      if (logWarning) {
        logWarning(`Stripped installer-managed '${other.permissionKey}' from config while switching to target '${target}'.`);
      }
    }
  }

  if (
    Array.isArray(existing[other.pluginKey]) &&
    Array.isArray(sourceConfig.plugin) &&
    deepEqualOrderInsensitive(existing[other.pluginKey], sourceConfig.plugin)
  ) {
    delete existing[other.pluginKey];
    changed = true;
  }

  // A retired installer plugin entry must not survive a target switch on either
  // plugin key, even when the source config no longer lists it (mirrors the
  // manifestless cleanup path). This closes the v1->v2 leak where a stale v1
  // `plugin` entry would otherwise sit alongside the v2 `plugins` key. An entry
  // still managed for the current target (present in the source config) is not
  // stale, so it is left for the merge to keep/re-add.
  const retiredOnly = RETIRED_PLUGIN_ENTRIES.filter(
    (entry) => !(Array.isArray(sourceConfig.plugin) && sourceConfig.plugin.includes(entry))
  );
  for (const pluginKey of ['plugin', 'plugins']) {
    if (retiredOnly.length === 0 || !Array.isArray(existing[pluginKey])) {
      continue;
    }
    const remaining = existing[pluginKey].filter((entry) => !retiredOnly.includes(entry));
    if (remaining.length !== existing[pluginKey].length) {
      changed = true;
      if (logWarning) {
        logWarning(`Stripped retired installer plugin entry from '${pluginKey}' while switching to target '${target}'.`);
      }
      if (remaining.length > 0) {
        existing[pluginKey] = remaining;
      } else {
        delete existing[pluginKey];
      }
    }
  }

  return changed;
}

function mergeInstallerConfig(targetConfigPath, sourceConfig, onBeforeWrite, logWarning, target) {
  const resolvedTarget = resolveTargetOrDefault(target);
  const keys = opencodeTarget.configKeysFor(resolvedTarget);
  const patch = opencodeTarget.configPatchShape(resolvedTarget);

  const sourceConfigForInstall = Object.assign({}, (sourceConfig || {}));
  delete sourceConfigForInstall.instructions;

  const createdConfig = opencodeTarget.emitConfig(sourceConfigForInstall, resolvedTarget);

  if (!fs.existsSync(targetConfigPath)) {
    writeJsonFile(targetConfigPath, createdConfig);
    patch.createdFile = true;
    patch.changed = true;
    if (resolvedTarget === 'v1' && isObject(createdConfig.permission)) {
      patch.addedPermissionKeys = Object.keys(createdConfig.permission);
    }
    if (resolvedTarget === 'v2' && Array.isArray(createdConfig.permissions)) {
      patch.addedPermissionRules = clone(createdConfig.permissions);
    }
    if (Array.isArray(createdConfig[keys.pluginKey])) {
      patch.addedPluginEntries = createdConfig[keys.pluginKey].slice();
    }
    patch.createdSchema = !!createdConfig.$schema;
    return patch;
  }

  const existing = readJsonFile(targetConfigPath, `existing config at ${targetConfigPath}`, logWarning);
  if (!existing || !isObject(existing)) {
    if (logWarning) {
      logWarning(`Skipping config merge for ${targetConfigPath} because existing config is invalid JSON.`);
    }
    patch.skipped = true;
    return patch;
  }

  // Drop the other target's installer-shaped keys first so the resulting file
  // never carries both the v1 and v2 key sets. The strip mutates `existing`, so
  // it must mark the patch changed in order for that mutation to be written.
  if (stripOtherTargetKeys(existing, resolvedTarget, sourceConfigForInstall, logWarning)) {
    patch.changed = true;
  }

  // User-owned v1-only legacy settings (`subagent_depth`, `compaction.prune`,
  // ...) are deliberately preserved on every target. The installer never writes
  // them, and value-equality with the package's own values cannot prove
  // installer authorship — our docs tell users to set exactly those values
  // (site/src/content/docs/customization.md), so stripping them would silently
  // undo the documented happy path (e.g. disabling nested delegation).

  const otherKeys = opencodeTarget.configKeysFor(otherTarget(resolvedTarget));
  const userOwnsOtherPermission = existing[otherKeys.permissionKey] !== undefined;

  if (userOwnsOtherPermission) {
    // The user owns the OTHER target's permission key. Writing this target's
    // permission key would leave the v1 and v2 permission keys co-existing in the
    // file, so skip and warn: the config must never carry both key sets. On a v2
    // target this is also unnecessary (v2 auto-translates a v1 `permission` object
    // in memory), but on any target the XOR invariant wins.
    if (logWarning) {
      logWarning(
        `Skipping '${keys.permissionKey}' merge for ${targetConfigPath}; ` +
        `user-owned '${otherKeys.permissionKey}' is present and writing both v1 and v2 ` +
        `permission keys would break the v1/v2 key invariant.`
      );
    }
  } else if (resolvedTarget === 'v1') {
    if (isObject(createdConfig.permission)) {
      if (existing.permission === undefined) {
        existing.permission = {};
      }

      if (!isObject(existing.permission)) {
        if (logWarning) {
          logWarning(`Skipping permission merge for ${targetConfigPath}; existing permission is not an object.`);
        }
      } else {
        for (const key of Object.keys(createdConfig.permission)) {
          if (!(key in existing.permission)) {
            existing.permission[key] = createdConfig.permission[key];
            patch.addedPermissionKeys.push(key);
            patch.changed = true;
          }
        }
      }
    }
  } else if (Array.isArray(createdConfig.permissions) && createdConfig.permissions.length > 0) {
    if (existing.permissions === undefined) {
      existing.permissions = [];
    }
    if (!Array.isArray(existing.permissions)) {
      // Mirror the v1 guard: never clobber a user's non-array value.
      if (logWarning) {
        logWarning(`Skipping permissions merge for ${targetConfigPath}; existing permissions is not an array.`);
      }
    } else {
      for (const rule of createdConfig.permissions) {
        const alreadyPresent = existing.permissions.some((entry) => deepEqualOrderInsensitive(entry, rule));
        if (!alreadyPresent) {
          existing.permissions.push(clone(rule));
          patch.addedPermissionRules.push(clone(rule));
          patch.changed = true;
        }
      }
    }
  }

  const pluginEntries = createdConfig[keys.pluginKey];
  if (Array.isArray(pluginEntries)) {
    if (!Array.isArray(existing[keys.pluginKey])) {
      existing[keys.pluginKey] = [];
    }
    for (const entry of pluginEntries) {
      if (!existing[keys.pluginKey].includes(entry)) {
        existing[keys.pluginKey].push(entry);
        patch.addedPluginEntries.push(entry);
        patch.changed = true;
      }
    }
  }

  if (patch.changed) {
    if (typeof onBeforeWrite === 'function') {
      onBeforeWrite();
    }
    writeJsonFile(targetConfigPath, existing);
  }

  return patch;
}

function mergeConfigPatches(existingPatch, currentPatch) {
  const base = {
    createdFile: false,
    addedPermissionKeys: [],
    addedPermissionRules: [],
    addedPluginEntries: [],
    createdSchema: false,
    skipped: false,
    changed: false,
  };

  const prior = isObject(existingPatch) ? existingPatch : {};
  const next = isObject(currentPatch) ? currentPatch : {};

  const permissionKeys = new Set([
    ...(Array.isArray(prior.addedPermissionKeys) ? prior.addedPermissionKeys : []),
    ...(Array.isArray(next.addedPermissionKeys) ? next.addedPermissionKeys : []),
  ]);

  const permissionRules = new Set([
    ...(Array.isArray(prior.addedPermissionRules) ? prior.addedPermissionRules : []).map((rule) => JSON.stringify(rule)),
    ...(Array.isArray(next.addedPermissionRules) ? next.addedPermissionRules : []).map((rule) => JSON.stringify(rule)),
  ]);

  const pluginEntries = new Set([
    ...(Array.isArray(prior.addedPluginEntries) ? prior.addedPluginEntries : []),
    ...(Array.isArray(next.addedPluginEntries) ? next.addedPluginEntries : []),
  ]);

  return {
    ...base,
    ...prior,
    ...next,
    createdFile: Boolean(prior.createdFile || next.createdFile),
    addedPermissionKeys: [...permissionKeys],
    addedPermissionRules: [...permissionRules].map((rule) => JSON.parse(rule)),
    addedPluginEntries: [...pluginEntries],
    createdSchema: Boolean(prior.createdSchema || next.createdSchema || prior.addedSchema || next.addedSchema),
    skipped: Boolean(prior.skipped || next.skipped),
    changed: Boolean(prior.changed || next.changed),
  };
}

function loadSourceConfig(sourceDir, logWarning) {
  const sourceConfigPath = path.join(sourceDir, 'opencode.json');
  const sourceConfig = readJsonFile(sourceConfigPath, 'package opencode.json', logWarning);
  if (!sourceConfig || !isObject(sourceConfig)) {
    throw new Error('Could not parse package opencode.json.');
  }
  return sourceConfig;
}

function configLooksManaged(configPath, sourceConfig, logWarning) {
  if (!fs.existsSync(configPath)) {
    return false;
  }

  const config = readJsonFile(configPath, `config at ${configPath}`, logWarning);
  if (!config || !isObject(config)) {
    return false;
  }

  if (isObject(sourceConfig.permission) && isObject(config.permission)) {
    for (const key of Object.keys(sourceConfig.permission)) {
      if (!(key in config.permission)) {
        continue;
      }
      if (deepEqualOrderInsensitive(config.permission[key], sourceConfig.permission[key])) {
        return true;
      }
    }
  }

  return false;
}

// Best-effort cleanup when no manifest is available. It cannot know which
// target was installed, so it strips installer-shaped keys for *both* targets
// (v1 permission/plugin and v2 permissions/plugins) rather than assuming v1.
function manifestlessCleanup(configPath, sourceConfig, onBeforeMutate, logWarning) {
  if (!fs.existsSync(configPath)) {
    return { changed: false, removedFile: false };
  }

  const existing = readJsonFile(configPath, `existing config at ${configPath}`, logWarning);
  if (!existing || !isObject(existing)) {
    if (logWarning) {
      logWarning(`Skipping manifestless config cleanup; invalid JSON at ${configPath}.`);
    }
    return { changed: false, removedFile: false };
  }

  if (deepEqualOrderInsensitive(existing, sourceConfig)) {
    if (typeof onBeforeMutate === 'function') {
      onBeforeMutate();
    }
    fs.unlinkSync(configPath);
    return { changed: true, removedFile: true };
  }

  let changed = false;

  // v1: strip installer-shaped permission subkeys.
  if (isObject(sourceConfig.permission) && isObject(existing.permission)) {
    for (const key of Object.keys(sourceConfig.permission)) {
      if (!(key in existing.permission)) {
        continue;
      }
      if (deepEqualOrderInsensitive(existing.permission[key], sourceConfig.permission[key])) {
        delete existing.permission[key];
        changed = true;
      }
    }
    if (Object.keys(existing.permission).length === 0) {
      delete existing.permission;
      changed = true;
    }
  }

  // v2: strip installer-shaped permission rules.
  const derivedV2Rules = opencodeTarget.emitConfig(sourceConfig, 'v2').permissions || [];
  if (Array.isArray(derivedV2Rules) && derivedV2Rules.length > 0 && Array.isArray(existing.permissions)) {
    const remainingRules = existing.permissions.filter(
      (rule) => !derivedV2Rules.some((candidate) => deepEqualOrderInsensitive(candidate, rule))
    );
    if (remainingRules.length !== existing.permissions.length) {
      changed = true;
    }
    if (remainingRules.length > 0) {
      existing.permissions = remainingRules;
    } else {
      delete existing.permissions;
    }
  }

  const managedPlugins = new Set([
    ...(Array.isArray(sourceConfig.plugin) ? sourceConfig.plugin : []),
    ...RETIRED_PLUGIN_ENTRIES,
  ]);
  for (const pluginKey of ['plugin', 'plugins']) {
    if (managedPlugins.size > 0 && Array.isArray(existing[pluginKey])) {
      const remainingPlugins = existing[pluginKey].filter((entry) => !managedPlugins.has(entry));
      if (remainingPlugins.length !== existing[pluginKey].length) {
        changed = true;
      }
      if (remainingPlugins.length > 0) {
        existing[pluginKey] = remainingPlugins;
      } else {
        delete existing[pluginKey];
      }
    }
  }

  if (sourceConfig.$schema && existing.$schema === sourceConfig.$schema) {
    delete existing.$schema;
    changed = true;
  }

  // A config left empty after stripping installer-managed values was created by
  // the installer; remove it instead of leaving an orphan that still registers the
  // pack. User-owned keys (provider, model, share, ...) keep the file in place.
  if (Object.keys(existing).length === 0) {
    if (typeof onBeforeMutate === 'function') {
      onBeforeMutate();
    }
    fs.unlinkSync(configPath);
    return { changed: true, removedFile: true };
  }

  if (changed) {
    if (typeof onBeforeMutate === 'function') {
      onBeforeMutate();
    }
    writeJsonFile(configPath, existing);
  }

  return { changed, removedFile: false };
}

function checkLegacyAgentDir(opencodeDir, opts) {
  const logError = opts.error;
  const pkgName = opts.PACKAGE_NAME;
  const AGENT_DIR_LEGACY = opts.AGENT_DIR_LEGACY;
  const AGENT_DIR = opts.AGENT_DIR;
  const legacyDir = path.join(opencodeDir, AGENT_DIR_LEGACY);
  if (fs.existsSync(legacyDir)) {
    if (logError) {
      logError(`Legacy '.opencode/${AGENT_DIR_LEGACY}/' directory detected.`);
      logError(`v2.0.0+ only supports '.opencode/${AGENT_DIR}/' (plural).`);
      logError('');
      logError(`Migration: mv ${legacyDir} ${path.join(opencodeDir, AGENT_DIR)}`);
      logError(`Then re-run: npx ${pkgName}`);
    }
    return false;
  }
  return true;
}

module.exports = {
  mergeInstallerConfig,
  mergeConfigPatches,
  loadSourceConfig,
  configLooksManaged,
  manifestlessCleanup,
  checkLegacyAgentDir,
  deepEqualOrderInsensitive,
};
