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
  'alignment',
  'api-documentation',
  'blogger',
  'brutal-critic',
  'code-change-impact',
  'decision-grounding',
  'legal-advisor',
  'project-bootstrap',
  'refactoring',
  'security-audit',
  'systematic-debugging',
  'test-driven-development',
  'ux-responsive',
  'verification-before-completion',
  'writing-for-agents',
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

// Win32 ignores trailing dots/spaces when resolving a name, so a segment like
// `.. ` still denotes the parent directory. Normalize the same way before the
// traversal check (but keep a bare `..` — which strips to '' — as the parent).
function isParentSegment(segment) {
  const stripped = segment.replace(/[. ]+$/, '');
  if (stripped === '..') {
    return true;
  }
  return stripped === '' && segment.replace(/ +$/, '') === '..';
}

function isUnsafeBackupKey(key) {
  if (!key) {
    return true;
  }
  // Any colon is rejected: it covers drive-absolute (`C:\x`) and drive-relative
  // (`C:foo`) keys, which escape the backup directory on Windows.
  if (key.includes(':')) {
    return true;
  }
  if (path.isAbsolute(key)) {
    return true;
  }
  if (key.startsWith('\\\\') || key.startsWith('//')) {
    return true;
  }
  return key.split(/[\\/]+/).some(isParentSegment);
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
//
// Fail-closed contract: callers may only delete dirPath when the backup is
// provably complete. The return value reports the evidence for that decision:
//   - count:   regular files confirmed present in the backup session
//   - files:   regular files encountered (the expected backup count)
//   - failed:  hard failures (unreadable subdir, backup threw/declined)
//   - skipped: entries that cannot be backed up (symlinks/junctions/sockets)
// count === files && failed === 0 && skipped === 0 means a complete backup.
function backupDirectoryTree(dirPath, backupSession, relativeBase, logWarning) {
  const result = { count: 0, files: 0, failed: 0, skipped: 0 };
  if (!backupSession || !fs.existsSync(dirPath)) {
    return result;
  }

  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      result.failed += 1;
      if (logWarning) logWarning(`Could not read ${current} for backup: ${err.message}`);
      continue;
    }

    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }

      // Symlinks/junctions/sockets are not traversed by rmSync and cannot be
      // copied verbatim — record them so a partial backup never deletes them.
      if (!entry.isFile()) {
        result.skipped += 1;
        if (logWarning) logWarning(`Skipping non-file entry during backup: ${absolutePath}`);
        continue;
      }

      result.files += 1;
      const relativePath = relativeBase ? path.relative(relativeBase, absolutePath) : undefined;
      // Resolve the key once and hand the *same* value to both the backup and
      // the dedupe probe. install.js's backupFile derives its own key when none
      // is supplied (`relativePathFromRoot || path.relative(rootDir, absolutePath)`);
      // probing with a bare `undefined` never matched, so a genuinely deduped
      // file was mis-counted as failed. The absolute path is the fallback used
      // when no relativeBase is given (a real session still rejects it as
      // unsafe, keeping the failure closed).
      const backupKey = relativePath || absolutePath;

      try {
        let backedUp = backupSession.backupFile(absolutePath, backupKey);
        if (!backedUp && typeof backupSession.has === 'function' && backupSession.has(backupKey)) {
          // backupFile returns false for a file already captured earlier in the
          // same session (dedupe) — that still counts as a complete backup.
          backedUp = true;
        }
        if (backedUp) {
          result.count += 1;
        } else {
          result.failed += 1;
          if (logWarning) logWarning(`Could not back up ${absolutePath}: backup session declined the file`);
        }
      } catch (err) {
        result.failed += 1;
        if (logWarning) logWarning(`Could not back up ${absolutePath}: ${err.message}`);
      }
    }
  }

  return result;
}

// Prune language skill directories that were not requested. Non-language
// skills are always retained. Each pruned directory is copied into
// backupContext.backupSession before it is recursively deleted. Returns a
// summary so callers/tests can assert the effective partition.
//
// Fail-closed: a language directory is deleted only when its backup is complete
// (see backupDirectoryTree) and a backup session exists. Anything else — no
// session, partial backup, or a skipped symlinked dir — is kept and reported in
// `failed`/`skipped`; the success log is suppressed whenever either is non-empty.
function filterLanguages(installDir, languages, logFns, backupContext) {
  const logWarning = logFns && logFns.warning;
  const logInfo = logFns && logFns.info;
  const logSuccess = logFns && logFns.success;
  const backupSession = backupContext && backupContext.backupSession;
  const relativeBase = backupContext && backupContext.relativeBase;

  const skillsDir = path.join(installDir, 'skills');
  if (!fs.existsSync(skillsDir)) {
    if (logWarning) logWarning('No skills directory found — skipping language filter.');
    return { removed: [], failed: [], skipped: [], kept: [] };
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
    return { removed: [], failed: [], skipped: [], kept: [] };
  }

  const keepDirs = new Set(valid.map(function (l) { return LANGUAGE_MAP[l]; }));

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const removed = [];
  const failed = [];
  const skipped = [];
  const noBackupSession = !backupSession;

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var dirName = entry.name;
    var normalizedName = dirName.toLowerCase();
    var isLanguageDir = LANGUAGE_SKILL_DIRS.has(normalizedName);

    if (!entry.isDirectory()) {
      // A symlinked/junctioned language directory is not traversed by rmSync;
      // surface and record it instead of silently keeping stale skills.
      if (entry.isSymbolicLink() && isLanguageDir) {
        skipped.push(dirName);
        if (logWarning) logWarning(`Skipping symlinked language skill directory (kept): ${dirName}`);
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

    if (noBackupSession) {
      failed.push(dirName);
      if (logWarning) logWarning(`Not removing ${dirName}: no backup session (pruning skipped to avoid data loss).`);
      continue;
    }

    var backup = backupDirectoryTree(dirPath, backupSession, relativeBase, logWarning);
    var backupComplete = backup.failed === 0 && backup.skipped === 0 && backup.count === backup.files;
    if (!backupComplete) {
      failed.push(dirName);
      if (logWarning) {
        logWarning(
          `Not removing ${dirName}: backup incomplete (${backup.count}/${backup.files} file(s) backed up, ` +
          `${backup.failed} failure(s), ${backup.skipped} skipped entry(ies)).`
        );
      }
      continue;
    }

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
    if (logWarning) logWarning(`Language filter incomplete: ${failed.length} skill(s) not removed: ${failed.join(', ')}`);
  }
  if (skipped.length > 0) {
    if (logWarning) logWarning(`Language filter skipped ${skipped.length} symlinked skill dir(s): ${skipped.join(', ')}`);
  }

  // Never report success when anything was skipped or failed.
  if (failed.length === 0 && skipped.length === 0) {
    if (removed.length > 0) {
      if (logSuccess) logSuccess(`✓ Applied language filter: ${valid.join(', ')}`);
    } else {
      if (logInfo) logInfo(`No language skills needed removal (kept: ${valid.join(', ')}).`);
    }
  }

  return { removed, failed, skipped, kept: Array.from(keepDirs) };
}

// Lower-case skill directory names recorded in a previous manifest, taken from
// managed paths of the form `.../skills/<name>/...`.
function managedSkillNames(manifest, installDir) {
  const names = new Set();
  const installNorm = path.resolve(installDir).replace(/\\/g, '/').replace(/\/+$/, '');
  for (const managedPath of manifest.managedFiles) {
    const norm = String(managedPath).replace(/\\/g, '/');
    // Relative-to-install form used by global manifests.
    if (norm.startsWith('skills/')) {
      const name = norm.slice('skills/'.length).split('/')[0].toLowerCase();
      if (name) names.add(name);
      continue;
    }
    const marker = '/skills/';
    const index = norm.lastIndexOf(marker);
    if (index === -1) {
      continue;
    }
    const prefix = norm.slice(0, index);
    // Anchor to this install's directory: an absolute path must resolve inside
    // installDir; a project-relative path must end in `.opencode`. Without this,
    // an unrelated `.../skills/<name>/` entry could target the wrong directory.
    const absolute = path.isAbsolute(norm);
    const underInstall = absolute
      ? prefix === installNorm || prefix.startsWith(`${installNorm}/`)
      : prefix === '.opencode' || prefix === './.opencode';
    if (!underInstall) {
      continue;
    }
    const name = norm.slice(index + marker.length).split('/')[0].toLowerCase();
    if (name) names.add(name);
  }
  return names;
}

// Prune skill directories that a previous install managed but the current
// package no longer ships (e.g. a retired skill). Only names recorded in
// previousManifest.managedFiles are candidates, so user-created skills are
// never touched. Same fail-closed backup rule as filterLanguages: a directory
// is deleted only after a complete backup; symlinks, a missing backup session
// and partial backups are kept and reported in `failed`/`skipped`.
function pruneRemovedSkills(sourceSkillNames, installDir, previousManifest, logFns, backupContext) {
  const result = { removed: [], failed: [], skipped: [] };
  // Fail closed inside the helper too: an empty source list means "unknown",
  // not "all skills retired". The caller also guards, but a direct call must
  // never turn an empty list into a full wipe.
  if (!Array.isArray(sourceSkillNames) || sourceSkillNames.length === 0) {
    return result;
  }
  if (!previousManifest || !Array.isArray(previousManifest.managedFiles)) {
    return result;
  }

  const sourceNames = new Set((sourceSkillNames || []).map(function (name) { return String(name).toLowerCase(); }));
  const candidates = managedSkillNames(previousManifest, installDir);
  for (const name of sourceNames) {
    candidates.delete(name);
  }
  if (candidates.size === 0) {
    return result;
  }

  const skillsDir = path.join(installDir, 'skills');
  if (!fs.existsSync(skillsDir)) {
    return result;
  }

  const logWarning = logFns && logFns.warning;
  const logInfo = logFns && logFns.info;
  const backupSession = backupContext && backupContext.backupSession;
  const relativeBase = backupContext && backupContext.relativeBase;

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    const dirName = entry.name;
    if (!candidates.has(dirName.toLowerCase())) {
      continue;
    }

    if (entry.isSymbolicLink()) {
      result.skipped.push(dirName);
      if (logWarning) logWarning(`Skipping symlinked retired skill directory (kept): ${dirName}`);
      continue;
    }
    if (!entry.isDirectory()) {
      continue;
    }

    const dirPath = path.join(skillsDir, dirName);

    if (!backupSession) {
      result.failed.push(dirName);
      if (logWarning) logWarning(`Not removing retired skill ${dirName}: no backup session (pruning skipped to avoid data loss).`);
      continue;
    }

    const backup = backupDirectoryTree(dirPath, backupSession, relativeBase, logWarning);
    if (backup.failed !== 0 || backup.skipped !== 0 || backup.count !== backup.files) {
      result.failed.push(dirName);
      if (logWarning) {
        logWarning(
          `Not removing retired skill ${dirName}: backup incomplete (${backup.count}/${backup.files} file(s) backed up, ` +
          `${backup.failed} failure(s), ${backup.skipped} skipped entry(ies)); the directory is left in place and unmanaged.`
        );
      }
      continue;
    }

    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      result.removed.push(dirName);
    } catch (err) {
      result.failed.push(dirName);
      if (logWarning) logWarning(`Could not remove retired skill ${dirName}: ${err.message}`);
    }
  }

  if (result.removed.length > 0 && logInfo) {
    logInfo(`Removed ${result.removed.length} retired skill(s): ${result.removed.join(', ')} — see DEPRECATIONS.md`);
  }
  if (result.failed.length > 0 && logWarning) {
    logWarning(`Retired-skill prune incomplete: ${result.failed.length} skill(s) not removed: ${result.failed.join(', ')}`);
  }

  return result;
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
  isUnsafeBackupKey,
  getManagedSourceFiles,
  buildManagedFilesFromSource,
  installManagedTree,
  filterLanguages,
  pruneRemovedSkills,
  pruneEmptyDirectories,
};
