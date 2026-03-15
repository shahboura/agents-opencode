'use strict';

const fs = require('fs');
const path = require('path');
const { ensureDir, writeJsonFile, removeDirectoryIfExists } = require('./utils');

const BACKUP_DIR = '.backups';

function formatBackupTimestamp(date = new Date()) {
  return date.toISOString().replace('T', '_').replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z');
}

function getBackupRoot(paths) {
  return paths.scope === 'project'
    ? path.join(paths.opencodeDir, BACKUP_DIR)
    : path.join(paths.rootDir, BACKUP_DIR);
}

function resolveUniqueBackupLocation(backupRoot, baseBackupId) {
  let backupId = baseBackupId;
  let backupDir = path.join(backupRoot, backupId);
  let counter = 1;

  while (fs.existsSync(backupDir)) {
    backupId = `${baseBackupId}--${String(counter).padStart(2, '0')}`;
    backupDir = path.join(backupRoot, backupId);
    counter += 1;
  }

  return { backupId, backupDir };
}

function pruneBackupRetention(backupRoot, maxBackups = 10, maxAgeDays = 30) {
  if (!fs.existsSync(backupRoot)) {
    return 0;
  }

  let prunedCount = 0;
  const cutoffMs = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  const backupDirs = fs.readdirSync(backupRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
    .reverse();

  for (const dirName of backupDirs.slice(maxBackups)) {
    removeDirectoryIfExists(path.join(backupRoot, dirName));
    prunedCount += 1;
  }

  const remainingDirs = fs.readdirSync(backupRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  for (const dirName of remainingDirs) {
    const backupPath = path.join(backupRoot, dirName);
    try {
      const stat = fs.statSync(backupPath);
      if (stat.mtimeMs < cutoffMs) {
        removeDirectoryIfExists(backupPath);
        prunedCount += 1;
      }
    } catch {
      // ignore retention errors
    }
  }

  return prunedCount;
}

function createBackupSession(paths, operation, packageName) {
  const createdAt = new Date();
  const stamp = formatBackupTimestamp(createdAt);
  const baseBackupId = `${stamp}--${operation}--${paths.scope}`;
  const backupRoot = getBackupRoot(paths);
  const { backupId, backupDir } = resolveUniqueBackupLocation(backupRoot, baseBackupId);
  const entries = [];
  const seen = new Set();

  function backupFile(absolutePath, relativePathFromRoot) {
    if (!fs.existsSync(absolutePath)) {
      return false;
    }

    const normalizedRelativePath = relativePathFromRoot || path.relative(paths.rootDir, absolutePath);
    if (!normalizedRelativePath || seen.has(normalizedRelativePath)) {
      return false;
    }

    const targetPath = path.join(backupDir, normalizedRelativePath);
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(absolutePath, targetPath);
    entries.push({ path: normalizedRelativePath });
    seen.add(normalizedRelativePath);
    return true;
  }

  function finalize() {
    if (entries.length === 0) {
      removeDirectoryIfExists(backupDir);
      return { created: false, backupDir: null, backupId: null, count: 0, prunedCount: 0 };
    }

    const manifest = {
      schemaVersion: 1,
      package: packageName,
      operation,
      scope: paths.scope,
      createdAt: createdAt.toISOString(),
      rootDir: paths.rootDir,
      files: entries,
    };
    writeJsonFile(path.join(backupDir, 'backup-manifest.json'), manifest);
    const prunedCount = pruneBackupRetention(backupRoot);

    return {
      created: true,
      backupDir,
      backupId,
      count: entries.length,
      prunedCount,
    };
  }

  return { backupFile, finalize };
}

function printBackupRestoreHint(backupResult, infoFn) {
  if (!backupResult || !backupResult.created || typeof infoFn !== 'function') {
    return;
  }

  infoFn(`Restore hint: review ${path.join(backupResult.backupDir, 'backup-manifest.json')} and copy files back to original paths.`);
}

module.exports = {
  BACKUP_DIR,
  createBackupSession,
  printBackupRestoreHint,
};
