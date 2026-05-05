'use strict';

const fs = require('fs');
const path = require('path');
const { toManagedPath } = require('./paths.js');

const BACKUP_DIR = '.backups';

const LANGUAGE_MAP = {
  dotnet: 'dotnet-clean-architecture.instructions.md',
  python: 'python-best-practices.instructions.md',
  typescript: 'typescript-strict.instructions.md',
  flutter: 'flutter.instructions.md',
  go: 'go.instructions.md',
  java: 'java-spring-boot.instructions.md',
  node: 'node-express.instructions.md',
  react: 'react-next.instructions.md',
  ruby: 'ruby-on-rails.instructions.md',
  rust: 'rust.instructions.md',
  sql: 'sql-migrations.instructions.md',
  cicd: 'ci-cd-hygiene.instructions.md',
};

const LANGUAGE_INSTRUCTIONS = new Set(Object.values(LANGUAGE_MAP));

const ALWAYS_KEEP = [
  'blogger.instructions.md',
  'brutal-critic.instructions.md',
  'ci-cd-hygiene.instructions.md',
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonFile(filePath, labelForError, logWarning) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (logWarning) {
      logWarning(`Could not parse ${labelForError}: ${err.message}`);
    }
    return null;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function removeIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  fs.unlinkSync(filePath);
  return true;
}

function removeManagedFile(absolutePath, relativePathFromRoot, paths, backupSession) {
  if (!fs.existsSync(absolutePath)) {
    return { removed: false, directory: null };
  }
  backupSession.backupFile(absolutePath, relativePathFromRoot || path.relative(paths.rootDir, absolutePath));
  fs.unlinkSync(absolutePath);
  return { removed: true, directory: path.dirname(absolutePath) };
}

function listFilesRecursive(rootDir) {
  const files = [];

  function walk(currentDir, relativeBase) {
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

  walk(rootDir, '');
  return files;
}

function getManagedSourceFiles(sourceOpencodeDir) {
  const allFiles = listFilesRecursive(sourceOpencodeDir);
  return allFiles.filter((relativePath) => {
    if (relativePath.includes(`node_modules${path.sep}`) || relativePath === 'node_modules') {
      return false;
    }

    if (relativePath === BACKUP_DIR || relativePath.startsWith(`${BACKUP_DIR}${path.sep}`)) {
      return false;
    }

    if (/\.backup\./.test(relativePath)) {
      return false;
    }

    return true;
  });
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

function buildManagedFilesFromSource(scope, sourceFiles, paths) {
  const managedFiles = [];

  for (const relativeFile of sourceFiles) {
    const managedPath = toManagedPath(scope, relativeFile);
    const absoluteManagedPath = path.join(paths.rootDir, managedPath);
    if (fs.existsSync(absoluteManagedPath)) {
      managedFiles.push(managedPath);
    }
  }

  return managedFiles;
}

function installManagedTree(sourceOpencodeDir, sourceFiles, destinationOpencodeDir, scope, backupSession, logWarning) {
  ensureDir(destinationOpencodeDir);

  let copiedCount = 0;
  let skippedCount = 0;
  let backupCount = 0;

  for (const relativeFile of sourceFiles) {
    const src = path.join(sourceOpencodeDir, relativeFile);
    const dest = path.join(destinationOpencodeDir, relativeFile);
    const destParent = path.dirname(dest);
    ensureDir(destParent);

    if (fs.existsSync(dest)) {
      if (filesEqual(src, dest)) {
        skippedCount += 1;
        continue;
      }

      try {
        if (backupSession && backupSession.backupFile(dest, toManagedPath(scope, relativeFile))) {
          backupCount += 1;
        }
      } catch (err) {
        if (logWarning) {
          logWarning(`Could not back up existing file ${dest}: ${err.message}`);
        }
      }
    }

    fs.copyFileSync(src, dest);
    copiedCount += 1;
  }

  return {
    copiedCount,
    skippedCount,
    backupCount,
  };
}

function filterLanguages(installDir, languages, logFns) {
  const logWarning = logFns && logFns.warning;
  const logInfo = logFns && logFns.info;
  const logSuccess = logFns && logFns.success;

  const instructionsDir = path.join(installDir, 'instructions');
  if (!fs.existsSync(instructionsDir)) {
    if (logWarning) logWarning('No instructions directory found — skipping language filter.');
    return;
  }

  const validLanguages = Object.keys(LANGUAGE_MAP);
  const requested = languages.split(',').map(function (l) { return l.trim().toLowerCase(); }).filter(Boolean);
  const invalid = requested.filter(function (l) { return !validLanguages.includes(l); });

  if (invalid.length > 0) {
    if (logWarning) logWarning(`Unknown language(s): ${invalid.join(', ')}`);
    if (logInfo) logInfo(`Available: ${validLanguages.join(', ')}`);
  }

  const valid = requested.filter(function (l) { return validLanguages.includes(l); });
  if (valid.length === 0) {
    if (logWarning) logWarning('No valid languages specified — keeping all instruction files.');
    return;
  }

  const keepFiles = new Set(ALWAYS_KEEP);
  for (var i = 0; i < valid.length; i++) {
    if (LANGUAGE_MAP[valid[i]]) {
      keepFiles.add(LANGUAGE_MAP[valid[i]]);
    }
  }

  const allFiles = fs.readdirSync(instructionsDir);
  const removed = [];

  for (var j = 0; j < allFiles.length; j++) {
    var file = allFiles[j];
    if (keepFiles.has(file) || !LANGUAGE_INSTRUCTIONS.has(file)) {
      continue;
    }
    try {
      fs.unlinkSync(path.join(instructionsDir, file));
      removed.push(file);
    } catch (err) {
      if (logWarning) logWarning(`Could not remove ${file}: ${err.message}`);
    }
  }

  if (logSuccess) logSuccess(`✓ Applied language filter: ${valid.join(', ')}`);
  if (removed.length > 0) {
    if (logInfo) logInfo(`Removed ${removed.length} instruction file(s): ${removed.join(', ')}`);
  }
}

function pruneEmptyDirectories(directories, stopAtDirectory) {
  const sorted = Array.from(directories).sort(function (a, b) { return b.length - a.length; });
  let prunedCount = 0;

  for (var i = 0; i < sorted.length; i++) {
    var dirPath = sorted[i];
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
  isObject,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  removeIfExists,
  removeManagedFile,
  listFilesRecursive,
  getManagedSourceFiles,
  filesEqual,
  buildManagedFilesFromSource,
  installManagedTree,
  filterLanguages,
  pruneEmptyDirectories,
};
