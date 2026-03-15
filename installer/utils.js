'use strict';

const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readJsonFile(filePath, labelForError, warningFn) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (typeof warningFn === 'function') {
      warningFn(`Could not parse ${labelForError}: ${err.message}`);
    }
    return null;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function listFilesRecursive(rootDir) {
  const files = [];

  function walk(currentDir, relativeBase = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = relativeBase ? path.join(relativeBase, entry.name) : entry.name;
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  walk(rootDir);
  return files;
}

function filesEqual(pathA, pathB) {
  try {
    const statA = fs.statSync(pathA);
    const statB = fs.statSync(pathB);
    if (statA.size !== statB.size) {
      return false;
    }
    const contentA = fs.readFileSync(pathA);
    const contentB = fs.readFileSync(pathB);
    return contentA.equals(contentB);
  } catch {
    return false;
  }
}

function removeDirectoryIfExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function pruneEmptyDirectories(directories, stopAtDirectory) {
  const sorted = [...directories].sort((a, b) => b.length - a.length);
  let prunedCount = 0;

  for (const dirPath of sorted) {
    if (!fs.existsSync(dirPath)) {
      continue;
    }
    if (path.resolve(dirPath) === path.resolve(stopAtDirectory)) {
      continue;
    }

    try {
      const entries = fs.readdirSync(dirPath);
      if (entries.length === 0) {
        fs.rmdirSync(dirPath);
        prunedCount += 1;
      }
    } catch {
      // ignore pruning errors
    }
  }

  return prunedCount;
}

module.exports = {
  ensureDir,
  isObject,
  readJsonFile,
  writeJsonFile,
  listFilesRecursive,
  filesEqual,
  removeDirectoryIfExists,
  pruneEmptyDirectories,
};
