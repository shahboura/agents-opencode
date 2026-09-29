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
// `cicd` is kept for backward compatibility: CI/CD hygiene ships as the
// always-installed instruction ci-cd-hygiene.instructions.md, so the alias
// filters no skill (using it alone keeps all skills and logs an explanation).
const LANGUAGE_ALIASES = new Set(['cicd']);

// Directory names of language skills, derived from LANGUAGE_MAP so a new
// language only needs one entry. Every shipped skill directory must appear in
// exactly one of LANGUAGE_SKILL_DIRS / NON_LANGUAGE_SKILLS; the drift test in
// scripts/test-installer.js fails when a skill directory is unclassified.
const LANGUAGE_SKILL_DIRS = new Set(Object.values(LANGUAGE_MAP));

// Non-language skills are never pruned by the language filter. Kept as the
// documented complement of LANGUAGE_SKILL_DIRS; the drift test asserts the
// partition over the on-disk tree so this set cannot silently rot.
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

// Copy every file under dirPath into the active backup session before the
// directory is recursively deleted. relativeBase is the managed root used to
// record restore paths; when omitted the session derives it from its own root.
function backupDirectoryTree(dirPath, backupSession, relativeBase, logWarning) {
  if (!backupSession || !fs.existsSync(dirPath)) {
    return 0;
  }

  let count = 0;
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      if (logWarning) logWarning(`Could not read ${current} for backup: ${err.message}`);
      continue;
    }

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (entry.isFile()) {
        try {
          const relativePath = relativeBase ? path.relative(relativeBase, absolutePath) : undefined;
          if (backupSession.backupFile(absolutePath, relativePath)) {
            count += 1;
          }
        } catch (err) {
          if (logWarning) logWarning(`Could not back up ${absolutePath}: ${err.message}`);
        }
      }
    }
  }

  return count;
}

// Prune language skill directories that were not requested. Non-language
// skills are always retained. Each pruned directory is copied into
// backupContext.backupSession before it is recursively deleted. Returns a
// summary so callers/tests can assert the effective partition.
function filterLanguages(installDir, languages, logFns, backupContext) {
  const logWarning = logFns && logFns.warning;
  const logInfo = logFns && logFns.info;
  const logSuccess = logFns && logFns.success;
  const backupSession = backupContext && backupContext.backupSession;
  const relativeBase = backupContext && backupContext.relativeBase;

  const skillsDir = path.join(installDir, 'skills');
  if (!fs.existsSync(skillsDir)) {
    if (logWarning) logWarning('No skills directory found — skipping language filter.');
    return { removed: [], failed: [], kept: [] };
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
      logInfo('The cicd alias filters no skill; ci-cd-hygiene.instructions.md is always installed.');
    }
    if (logWarning) logWarning('No valid languages specified — keeping all skills.');
    return { removed: [], failed: [], kept: [] };
  }

  const keepDirs = new Set(valid.map(function (l) { return LANGUAGE_MAP[l]; }));

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const removed = [];
  const failed = [];

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var dirName = entry.name;
    var normalizedName = dirName.toLowerCase();
    var isLanguageDir = LANGUAGE_SKILL_DIRS.has(normalizedName);

    if (!entry.isDirectory()) {
      // A symlinked/junctioned language directory is not traversed by rmSync;
      // surface it instead of silently keeping stale skills.
      if (entry.isSymbolicLink() && isLanguageDir) {
        if (logWarning) logWarning(`Skipping symlinked language skill directory: ${dirName}`);
      }
      continue;
    }

    // Only language skill directories are eligible for pruning; the
    // LANGUAGE_SKILL_DIRS / NON_LANGUAGE_SKILLS partition (enforced by the
    // drift test) guarantees non-language skills are never matched here.
    if (!isLanguageDir) {
      continue;
    }
    if (keepDirs.has(normalizedName)) {
      continue;
    }

    var dirPath = path.join(skillsDir, dirName);
    backupDirectoryTree(dirPath, backupSession, relativeBase, logWarning);

    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      removed.push(dirName);
    } catch (err) {
      failed.push(dirName);
      if (logWarning) logWarning(`Could not remove ${dirName}: ${err.message}`);
    }
  }

  if (removed.length > 0) {
    if (logInfo) logInfo(`Removed ${removed.length} language skill(s): ${removed.join(', ')}`);
  }
  if (failed.length > 0) {
    if (logWarning) logWarning(`Language filter incomplete: ${failed.length} skill(s) could not be removed: ${failed.join(', ')}`);
  } else if (removed.length === 0) {
    if (logInfo) logInfo(`No language skills needed removal (kept: ${valid.join(', ')}).`);
  } else {
    if (logSuccess) logSuccess(`✓ Applied language filter: ${valid.join(', ')}`);
  }

  return { removed, failed, kept: Array.from(keepDirs) };
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
  LANGUAGE_MAP,
  LANGUAGE_SKILL_DIRS,
  NON_LANGUAGE_SKILLS,
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
