'use strict';

const fs = require('fs');
const path = require('path');
const { toManagedPath } = require('./paths.js');

const BACKUP_DIR = '.backups';

// Language → on-demand skill directory under .opencode/skills/<dir>/.
const LANGUAGE_MAP = {
  dotnet: 'dotnet',
  python: 'python',
  typescript: 'typescript',
  flutter: 'flutter',
  go: 'go',
  java: 'java-spring',
  node: 'node-express',
  react: 'react-next',
  ruby: 'ruby-rails',
  rust: 'rust',
  sql: 'sql-migrations',
};

// Accepted but non-filterable aliases (no matching language skill directory).
// ci-cd-hygiene.instructions.md is always installed, so `cicd` is a silent no-op.
const LANGUAGE_ALIASES = new Set(['cicd']);

const LANGUAGE_SKILL_DIRS = new Set(Object.values(LANGUAGE_MAP));

// Non-language skills are never pruned by the language filter.
const NON_LANGUAGE_SKILLS = new Set([
  'adr',
  'agent-diagnostics',
  'api-documentation',
  'blogger',
  'brutal-critic',
  'code-change-impact',
  'docs-validation',
  'legal-advisor',
  'project-bootstrap',
  'refactoring',
  'security-audit',
  'ux-responsive',
]);

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

  const skillsDir = path.join(installDir, 'skills');
  if (!fs.existsSync(skillsDir)) {
    if (logWarning) logWarning('No skills directory found — skipping language filter.');
    return;
  }

  const acceptedLanguages = Object.keys(LANGUAGE_MAP).concat(Array.from(LANGUAGE_ALIASES));
  const requested = languages.split(',').map(function (l) { return l.trim().toLowerCase(); }).filter(Boolean);
  const invalid = requested.filter(function (l) { return !acceptedLanguages.includes(l); });

  if (invalid.length > 0) {
    if (logWarning) logWarning(`Unknown language(s): ${invalid.join(', ')}`);
    if (logInfo) logInfo(`Available: ${acceptedLanguages.join(', ')}`);
  }

  const valid = requested.filter(function (l) { return Object.prototype.hasOwnProperty.call(LANGUAGE_MAP, l); });
  if (valid.length === 0) {
    if (requested.some(function (l) { return LANGUAGE_ALIASES.has(l); }) && logInfo) {
      logInfo('ci-cd-hygiene.instructions.md is always installed; the cicd alias filters no skill.');
    }
    if (logWarning) logWarning('No valid languages specified — keeping all skills.');
    return;
  }

  const keepDirs = new Set(valid.map(function (l) { return LANGUAGE_MAP[l]; }));

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const removed = [];

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (!entry.isDirectory()) {
      continue;
    }
    var dirName = entry.name;
    // Never prune non-language skills or directories that are not language skills.
    if (NON_LANGUAGE_SKILLS.has(dirName) || !LANGUAGE_SKILL_DIRS.has(dirName)) {
      continue;
    }
    if (keepDirs.has(dirName)) {
      continue;
    }
    try {
      fs.rmSync(path.join(skillsDir, dirName), { recursive: true, force: true });
      removed.push(dirName);
    } catch (err) {
      if (logWarning) logWarning(`Could not remove ${dirName}: ${err.message}`);
    }
  }

  if (logSuccess) logSuccess(`✓ Applied language filter: ${valid.join(', ')}`);
  if (removed.length > 0) {
    if (logInfo) logInfo(`Removed ${removed.length} language skill(s): ${removed.join(', ')}`);
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
  getManagedSourceFiles,
  buildManagedFilesFromSource,
  installManagedTree,
  filterLanguages,
  pruneEmptyDirectories,
};
