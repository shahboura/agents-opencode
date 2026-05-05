'use strict';

const fs = require('fs');
const path = require('path');
const { readJsonFile, writeJsonFile, isObject } = require('./file-ops.js');

function mergeInstallerConfig(targetConfigPath, sourceConfig, onBeforeWrite, logWarning) {
  const patch = {
    createdFile: false,
    addedPermissionKeys: [],
    addedPluginEntries: [],
    createdSchema: false,
    skipped: false,
    changed: false,
  };

  const sourceConfigForInstall = Object.assign({}, (sourceConfig || {}));
  delete sourceConfigForInstall.instructions;

  if (!fs.existsSync(targetConfigPath)) {
    writeJsonFile(targetConfigPath, sourceConfigForInstall);
    patch.createdFile = true;
    patch.changed = true;
    if (isObject(sourceConfigForInstall.permission)) {
      patch.addedPermissionKeys = Object.keys(sourceConfigForInstall.permission);
    }
    if (Array.isArray(sourceConfigForInstall.plugin)) {
      patch.addedPluginEntries = sourceConfigForInstall.plugin.slice();
    }
    patch.createdSchema = !!sourceConfigForInstall.$schema;
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

  if (isObject(sourceConfigForInstall.permission)) {
    if (existing.permission === undefined) {
      existing.permission = {};
    }

    if (!isObject(existing.permission)) {
      if (logWarning) {
        logWarning(`Skipping permission merge for ${targetConfigPath}; existing permission is not an object.`);
      }
    } else {
      const sourceKeys = Object.keys(sourceConfigForInstall.permission);
      for (var i = 0; i < sourceKeys.length; i++) {
        var key = sourceKeys[i];
        if (!(key in existing.permission)) {
          existing.permission[key] = sourceConfigForInstall.permission[key];
          patch.addedPermissionKeys.push(key);
          patch.changed = true;
        }
      }
    }
  }

  if (Array.isArray(sourceConfigForInstall.plugin)) {
    if (!Array.isArray(existing.plugin)) {
      existing.plugin = [];
    }
    for (var j = 0; j < sourceConfigForInstall.plugin.length; j++) {
      var entry = sourceConfigForInstall.plugin[j];
      if (!existing.plugin.includes(entry)) {
        existing.plugin.push(entry);
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

  return {
    ...base,
    ...prior,
    ...next,
    createdFile: Boolean(prior.createdFile || next.createdFile),
    addedPermissionKeys: [...permissionKeys],
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
    const sourceKeys = Object.keys(sourceConfig.permission);
    for (var i = 0; i < sourceKeys.length; i++) {
      var key = sourceKeys[i];
      if (!(key in config.permission)) {
        continue;
      }
      if (JSON.stringify(config.permission[key]) === JSON.stringify(sourceConfig.permission[key])) {
        return true;
      }
    }
  }

  return false;
}

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

  if (JSON.stringify(existing) === JSON.stringify(sourceConfig)) {
    if (typeof onBeforeMutate === 'function') {
      onBeforeMutate();
    }
    fs.unlinkSync(configPath);
    return { changed: true, removedFile: true };
  }

  let changed = false;

  if (isObject(sourceConfig.permission) && isObject(existing.permission)) {
    const sourcePermKeys = Object.keys(sourceConfig.permission);
    for (var i = 0; i < sourcePermKeys.length; i++) {
      var key = sourcePermKeys[i];
      if (!(key in existing.permission)) {
        continue;
      }
      if (JSON.stringify(existing.permission[key]) === JSON.stringify(sourceConfig.permission[key])) {
        delete existing.permission[key];
        changed = true;
      }
    }
    if (Object.keys(existing.permission).length === 0) {
      delete existing.permission;
      changed = true;
    }
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
  var logError = opts.error;
  var pkgName = opts.PACKAGE_NAME;
  var AGENT_DIR_LEGACY = opts.AGENT_DIR_LEGACY;
  var AGENT_DIR = opts.AGENT_DIR;
  var legacyDir = path.join(opencodeDir, AGENT_DIR_LEGACY);
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
};
