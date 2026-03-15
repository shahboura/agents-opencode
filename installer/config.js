'use strict';

const fs = require('fs');
const { isObject, writeJsonFile, readJsonFile } = require('./utils');

function mergeInstallerConfig(targetConfigPath, sourceConfig, onBeforeWrite, warningFn) {
  const patch = {
    createdFile: false,
    addedPermissionKeys: [],
    createdSchema: false,
    skipped: false,
    changed: false,
  };

  const sourceConfigForInstall = {
    ...(sourceConfig || {}),
  };
  delete sourceConfigForInstall.instructions;

  if (!fs.existsSync(targetConfigPath)) {
    writeJsonFile(targetConfigPath, sourceConfigForInstall);
    patch.createdFile = true;
    patch.changed = true;
    if (isObject(sourceConfigForInstall.permission)) {
      patch.addedPermissionKeys = Object.keys(sourceConfigForInstall.permission);
    }
    patch.createdSchema = !!sourceConfigForInstall.$schema;
    return patch;
  }

  const existing = readJsonFile(targetConfigPath, `existing config at ${targetConfigPath}`, warningFn);
  if (!existing || !isObject(existing)) {
    if (typeof warningFn === 'function') {
      warningFn(`Skipping config merge for ${targetConfigPath} because existing config is invalid JSON.`);
    }
    patch.skipped = true;
    return patch;
  }

  if (isObject(sourceConfigForInstall.permission)) {
    if (existing.permission === undefined) {
      existing.permission = {};
    }

    if (!isObject(existing.permission)) {
      if (typeof warningFn === 'function') {
        warningFn(`Skipping permission merge for ${targetConfigPath}; existing permission is not an object.`);
      }
    } else {
      for (const [key, value] of Object.entries(sourceConfigForInstall.permission)) {
        if (!(key in existing.permission)) {
          existing.permission[key] = value;
          patch.addedPermissionKeys.push(key);
          patch.changed = true;
        }
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

function revertInstallerConfig(targetConfigPath, configPatch, sourceConfig, onBeforeMutate, warningFn) {
  if (!configPatch) {
    return { changed: false, removedFile: false };
  }

  if (!fs.existsSync(targetConfigPath)) {
    return { changed: false, removedFile: false };
  }

  if (configPatch.createdFile) {
    if (typeof onBeforeMutate === 'function') {
      onBeforeMutate();
    }
    fs.unlinkSync(targetConfigPath);
    return { changed: true, removedFile: true };
  }

  const existing = readJsonFile(targetConfigPath, `existing config at ${targetConfigPath}`, warningFn);
  if (!existing || !isObject(existing)) {
    if (typeof warningFn === 'function') {
      warningFn(`Could not revert config changes for ${targetConfigPath}; invalid JSON.`);
    }
    return { changed: false, removedFile: false };
  }

  let changed = false;

  if (Array.isArray(configPatch.addedPermissionKeys) && isObject(existing.permission)) {
    for (const key of configPatch.addedPermissionKeys) {
      if (!(key in existing.permission)) {
        continue;
      }

      const sourceValue = sourceConfig && isObject(sourceConfig.permission) ? sourceConfig.permission[key] : undefined;
      if (sourceValue !== undefined && JSON.stringify(existing.permission[key]) !== JSON.stringify(sourceValue)) {
        if (typeof warningFn === 'function') {
          warningFn(`Keeping modified permission key '${key}' in ${targetConfigPath}; value differs from installer default.`);
        }
        continue;
      }

      delete existing.permission[key];
      changed = true;
    }

    if (Object.keys(existing.permission).length === 0) {
      delete existing.permission;
      changed = true;
    }
  }

  const schemaWasCreatedByInstaller = Boolean(configPatch.createdSchema || configPatch.addedSchema);
  if (schemaWasCreatedByInstaller && sourceConfig && sourceConfig.$schema && existing.$schema === sourceConfig.$schema) {
    delete existing.$schema;
    changed = true;
  }

  if (changed) {
    if (typeof onBeforeMutate === 'function') {
      onBeforeMutate();
    }
    writeJsonFile(targetConfigPath, existing);
  }

  return { changed, removedFile: false };
}

function legacyConfigCleanup(configPath, sourceConfig, onBeforeMutate, warningFn) {
  if (!fs.existsSync(configPath)) {
    return { changed: false, removedFile: false };
  }

  const existing = readJsonFile(configPath, `existing config at ${configPath}`, warningFn);
  if (!existing || !isObject(existing)) {
    if (typeof warningFn === 'function') {
      warningFn(`Skipping legacy config cleanup; invalid JSON at ${configPath}.`);
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
    for (const [key, sourceValue] of Object.entries(sourceConfig.permission)) {
      if (!(key in existing.permission)) {
        continue;
      }
      if (JSON.stringify(existing.permission[key]) === JSON.stringify(sourceValue)) {
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

module.exports = {
  mergeInstallerConfig,
  mergeConfigPatches,
  revertInstallerConfig,
  legacyConfigCleanup,
};
