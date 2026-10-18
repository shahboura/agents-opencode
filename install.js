#!/usr/bin/env node

/**
 * OpenCode Agents Installation Script
 * Cross-platform installer for Windows, Linux, and macOS
 *
 * Hardening goals:
 * - Scope-aware install/update/uninstall (global/project/all)
 * - Non-destructive global updates (no wholesale config dir replacement)
 * - Manifest-based uninstall to remove only installer-managed files
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const pathsMod = require('./scripts/lib/paths.js');
const fileOps = require('./scripts/lib/file-ops.js');
const configMutator = require('./scripts/lib/config-mutator.js');
const opencodeTarget = require('./scripts/lib/opencode-target.js');

const PACKAGE_NAME = 'agents-opencode';
const BACKUP_DIR = '.backups';
const AGENT_DIR_LEGACY = 'agent';
const PROJECT_TEMPLATE_FILES = [
    path.join('state', 'session-state.json'),
    path.join('handoff', '.gitkeep'),
];

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
};

function log(color, prefix, message) {
    console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function info(message) {
    log(colors.blue, 'INFO', message);
}

function success(message) {
    log(colors.green, 'SUCCESS', message);
}

function warning(message) {
    log(colors.yellow, 'WARNING', message);
}

function error(message) {
    log(colors.red, 'ERROR', message);
}

function formatBackupTimestamp(date) {
    date = date || new Date();
    return date.toISOString().replace('T', '_').replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z');
}

function removeDirectoryIfExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return;
    }
    fs.rmSync(dirPath, { recursive: true, force: true });
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

function pruneBackupRetention(backupRoot, maxBackups, maxAgeDays) {
    if (typeof maxBackups === 'undefined') maxBackups = 10;
    if (typeof maxAgeDays === 'undefined') maxAgeDays = 30;
    if (!fs.existsSync(backupRoot)) {
        return 0;
    }

    let prunedCount = 0;

    const cutoffMs = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const backupDirs = fs.readdirSync(backupRoot, { withFileTypes: true })
        .filter(function (entry) { return entry.isDirectory(); })
        .map(function (entry) { return entry.name; })
        .sort()
        .reverse();

    for (var i = 0; i < backupDirs.slice(maxBackups).length; i++) {
        var dirName = backupDirs.slice(maxBackups)[i];
        removeDirectoryIfExists(path.join(backupRoot, dirName));
        prunedCount += 1;
    }

    const remainingDirs = fs.readdirSync(backupRoot, { withFileTypes: true })
        .filter(function (entry) { return entry.isDirectory(); })
        .map(function (entry) { return entry.name; });

    for (var j = 0; j < remainingDirs.length; j++) {
        var dirName2 = remainingDirs[j];
        var backupPath = path.join(backupRoot, dirName2);
        try {
            var stat = fs.statSync(backupPath);
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

function createBackupSession(paths, operation) {
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
        if (fileOps.isUnsafeBackupKey(normalizedRelativePath)) {
            throw new Error(`Refusing to back up '${normalizedRelativePath}': path escapes the backup directory.`);
        }

        const targetPath = path.join(backupDir, normalizedRelativePath);
        fileOps.ensureDir(path.dirname(targetPath));
        fs.copyFileSync(absolutePath, targetPath);
        entries.push({ path: normalizedRelativePath });
        seen.add(normalizedRelativePath);
        return true;
    }

    // Reports whether a path was already captured in this session (dedupe).
    // Lets callers confirm a complete backup when backupFile returns false.
    function has(relativePathFromRoot) {
        return Boolean(relativePathFromRoot) && seen.has(relativePathFromRoot);
    }

    function finalize() {
        if (entries.length === 0) {
            removeDirectoryIfExists(backupDir);
            return { created: false, backupDir: null, backupId: null, count: 0, prunedCount: 0 };
        }

        const manifest = {
            schemaVersion: 1,
            package: PACKAGE_NAME,
            operation,
            scope: paths.scope,
            createdAt: createdAt.toISOString(),
            rootDir: paths.rootDir,
            files: entries,
        };
        fileOps.writeJsonFile(path.join(backupDir, 'backup-manifest.json'), manifest);
        const prunedCount = pruneBackupRetention(backupRoot);

        return {
            created: true,
            backupDir,
            backupId,
            count: entries.length,
            prunedCount,
        };
    }

    return { backupFile, has, finalize };
}

function printBackupRestoreHint(backupResult) {
    if (!backupResult || !backupResult.created) {
        return;
    }
    info(`Restore hint: review ${path.join(backupResult.backupDir, 'backup-manifest.json')} and copy files back to original paths.`);
}

function validatePackageContents(sourceDir) {
    const opencodeDir = path.join(sourceDir, '.opencode');
    if (!fs.existsSync(opencodeDir)) {
        error('Invalid package structure. Missing .opencode directory.');
        return false;
    }

    const configPath = path.join(sourceDir, 'opencode.json');
    if (!fs.existsSync(configPath)) {
        error('Invalid package structure. Missing opencode.json.');
        return false;
    }

    return true;
}

function checkVersion(sourceDir) {
    try {
        const packagePath = path.join(sourceDir, 'package.json');
        if (fs.existsSync(packagePath)) {
            const packageData = fileOps.readJsonFile(packagePath, 'package.json', warning);
            if (packageData && packageData.version) {
                info(`Installing OpenCode Agents v${packageData.version}`);
                return packageData.version;
            }
        }
    } catch {
        // ignore version check errors
    }
    return null;
}

function showVersion(sourceDir) {
    try {
        const packagePath = path.join(sourceDir, 'package.json');
        if (fs.existsSync(packagePath)) {
            const packageData = fileOps.readJsonFile(packagePath, 'package.json', warning);
            if (packageData && packageData.version) {
                console.log(`OpenCode Agents v${packageData.version}`);
                console.log('Repository: https://github.com/shahboura/agents-opencode');
                return;
            }
        }
        console.log('OpenCode Agents (version unknown)');
    } catch {
        console.log('OpenCode Agents (version check failed)');
    }
}

function installProjectTemplateFiles(sourceDir, scope, paths, backupSession) {
    if (scope !== 'project') {
        return { installedCount: 0, skippedCount: 0 };
    }

    let installedCount = 0;
    let skippedCount = 0;

    for (var i = 0; i < PROJECT_TEMPLATE_FILES.length; i++) {
        var relativePath = PROJECT_TEMPLATE_FILES[i];
        var src = path.join(sourceDir, relativePath);
        if (!fs.existsSync(src)) {
            warning(`Project template source is missing: ${relativePath}`);
            continue;
        }

        var dest = path.join(paths.rootDir, relativePath);
        fileOps.ensureDir(path.dirname(dest));

        if (fs.existsSync(dest)) {
            skippedCount += 1;
            continue;
        }

        try {
            if (backupSession) {
                backupSession.backupFile(dest, relativePath);
            }
        } catch {
            // backup not required for first-write path
        }

        fs.copyFileSync(src, dest);
        installedCount += 1;
    }

    return { installedCount, skippedCount };
}

function revertInstallerConfig(targetConfigPath, configPatch, sourceConfig, onBeforeMutate) {
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

    const existing = fileOps.readJsonFile(targetConfigPath, `existing config at ${targetConfigPath}`, warning);
    if (!existing || !fileOps.isObject(existing)) {
        warning(`Could not revert config changes for ${targetConfigPath}; invalid JSON.`);
        return { changed: false, removedFile: false };
    }

    // Older manifests predate the target field; they are always v1.
    var resolvedTarget = configPatch.target === 'v2' ? 'v2' : 'v1';
    var targetKeys = opencodeTarget.configKeysFor(resolvedTarget);
    var permissionKey = configPatch.permissionKey || targetKeys.permissionKey;
    var pluginKey = configPatch.pluginKey || targetKeys.pluginKey;

    let changed = false;

    // v1 permission object: remove the installer-added subkeys.
    if (Array.isArray(configPatch.addedPermissionKeys) && fileOps.isObject(existing[permissionKey])) {
        for (var i = 0; i < configPatch.addedPermissionKeys.length; i++) {
            var key = configPatch.addedPermissionKeys[i];
            if (!(key in existing[permissionKey])) {
                continue;
            }

            var sourceValue = sourceConfig && fileOps.isObject(sourceConfig.permission) ? sourceConfig.permission[key] : undefined;
            if (sourceValue !== undefined && JSON.stringify(existing[permissionKey][key]) !== JSON.stringify(sourceValue)) {
                warning(`Keeping modified permission key '${key}' in ${targetConfigPath}; value differs from installer default.`);
                continue;
            }

            delete existing[permissionKey][key];
            changed = true;
        }

        if (Object.keys(existing[permissionKey]).length === 0) {
            delete existing[permissionKey];
            changed = true;
        }
    }

    // v2 permissions array: remove the installer-added rules.
    if (Array.isArray(configPatch.addedPermissionRules) && Array.isArray(existing[permissionKey])) {
        var addedRules = configPatch.addedPermissionRules;
        var remainingRules = existing[permissionKey].filter(function (rule) {
            return !addedRules.some(function (candidate) {
                return configMutator.deepEqualOrderInsensitive(candidate, rule);
            });
        });
        if (remainingRules.length !== existing[permissionKey].length) {
            changed = true;
        }
        if (remainingRules.length > 0) {
            existing[permissionKey] = remainingRules;
        } else {
            delete existing[permissionKey];
            changed = true;
        }
    }

    if (Array.isArray(configPatch.addedPluginEntries) && Array.isArray(existing[pluginKey])) {
        // Trust the manifest: addedPluginEntries only records entries the installer
        // itself pushed, so revert them regardless of the current source config
        // (which may no longer list a retired plugin entry).
        for (var p = 0; p < configPatch.addedPluginEntries.length; p++) {
            var pluginEntry = configPatch.addedPluginEntries[p];
            var pluginIndex = existing[pluginKey].indexOf(pluginEntry);
            if (pluginIndex === -1) {
                continue;
            }
            existing[pluginKey].splice(pluginIndex, 1);
            changed = true;
        }
        if (existing[pluginKey].length === 0) {
            delete existing[pluginKey];
            changed = true;
        }
    }

    var schemaWasCreatedByInstaller = Boolean(configPatch.createdSchema || configPatch.addedSchema);
    if (schemaWasCreatedByInstaller && sourceConfig && sourceConfig.$schema && existing.$schema === sourceConfig.$schema) {
        delete existing.$schema;
        changed = true;
    }

    if (changed) {
        if (typeof onBeforeMutate === 'function') {
            onBeforeMutate();
        }
        fileOps.writeJsonFile(targetConfigPath, existing);
    }

    return { changed, removedFile: false };
}

function writeManifest(manifestPath, manifest) {
    fileOps.ensureDir(path.dirname(manifestPath));
    fileOps.writeJsonFile(manifestPath, manifest);
}

function readManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        return null;
    }
    const manifest = fileOps.readJsonFile(manifestPath, `manifest at ${manifestPath}`, warning);
    if (!manifest || !fileOps.isObject(manifest)) {
        return null;
    }
    return manifest;
}

function backupAndRemoveAgentsMdIfPresent(agentsMdPath, backupSession) {
    if (!agentsMdPath || !fs.existsSync(agentsMdPath)) {
        return false;
    }

    if (backupSession) {
        backupSession.backupFile(agentsMdPath, 'AGENTS.md');
    }
    fs.unlinkSync(agentsMdPath);
    return true;
}

function verifyInstallation(opencodeDir, scope) {
    try {
        const requiredDirs = ['instructions', 'commands'];
        for (var i = 0; i < requiredDirs.length; i++) {
            var dir = requiredDirs[i];
            var dirPath = path.join(opencodeDir, dir);
            if (!fs.existsSync(dirPath)) {
                error(`Missing required directory '${dir}' in ${scope} installation.`);
                return false;
            }
        }

        const agentDir = pathsMod.resolveAgentDirectory(opencodeDir);

        if (!agentDir) {
            error(`Missing required agent directory ('.opencode/${pathsMod.AGENT_DIR}/') in ${scope} installation.`);
            return false;
        }

        const agents = fs.readdirSync(agentDir).filter(function (file) { return file.endsWith('.md'); });
        if (agents.length === 0) {
            error(`No agent files found in ${agentDir}`);
            return false;
        }

        return true;
    } catch (err) {
        error(`Installation verification failed: ${err.message}`);
        return false;
    }
}

/**
 * Resolve the effective target for an install/update. An explicit v1/v2 always
 * wins. Under 'auto' we prefer the target recorded by a previous install (so an
 * update never silently flips a v2 install back to v1), then fall back to the
 * adapter's host-version detection.
 */
function resolveTargetForScope(requested, existingManifest, detectedVersion) {
  if (requested === 'v1' || requested === 'v2') {
    return requested;
  }

  const recorded = existingManifest && existingManifest.target;
  if (recorded === 'v1' || recorded === 'v2') {
    return recorded;
  }

  return opencodeTarget.resolveTarget({ requested: 'auto', detectedVersion });
}

// Host-version detection is memoised so a single run (including --all across
// scopes) probes the host at most once and prints one concise info line.
let hostVersionDetection;

function detectHostVersionOnce() {
    if (hostVersionDetection === undefined) {
        const version = opencodeTarget.detectHostVersion();
        hostVersionDetection = { version };
        // Print only the parsed major: the raw host string is attacker-influenced
        // (it comes from `opencode` stdout/stderr) and could carry ANSI/control chars.
        const major = opencodeTarget.parseHostMajor(version);
        if (typeof major === 'number') {
            const resolved = opencodeTarget.resolveTarget({ requested: 'auto', detectedVersion: version });
            info(`Detected OpenCode major ${major} → target ${resolved}`);
        } else {
            info('OpenCode host not detected → target v1');
        }
    }
    return hostVersionDetection.version;
}

function globalInstallExists(dirPath) {
    if (fs.existsSync(path.join(dirPath, pathsMod.MANIFEST_FILE))) {
        return true;
    }
    return !!pathsMod.resolveAgentDirectory(dirPath);
}

function isSameRealPath(a, b) {
    try {
        return fs.realpathSync(a) === fs.realpathSync(b);
    } catch {
        // A missing (or otherwise unreadable) path cannot be proven the same.
        return false;
    }
}

// Advising "remove those files" through a directory symlink deletes its target,
// so name the link instead whenever the legacy path is one.
function legacyCleanupClause(legacyDir) {
    let isLink = false;
    try {
        isLink = fs.lstatSync(legacyDir).isSymbolicLink();
    } catch {
        // Not a readable path: fall back to the regular advice.
    }
    const fileAdvice = 'remove the old files manually once you no longer need them.';
    if (!isLink) {
        return fileAdvice;
    }
    try {
        return `remove the symlink itself (${legacyDir}), not its target ${fs.realpathSync(legacyDir)}.`;
    } catch {
        // The link itself is the only safe thing to remove.
        return `remove the symlink itself (${legacyDir}).`;
    }
}

function warnOnGlobalConfigSplit() {
    const resolvedDir = pathsMod.getGlobalConfigDir();
    const legacyDir = pathsMod.getLegacyGlobalConfigDir();
    if (resolvedDir === legacyDir) {
        return;
    }

    const legacyInstalled = globalInstallExists(legacyDir);
    const resolvedInstalled = globalInstallExists(resolvedDir);

    // A symlinked legacy dir (e.g. ~/.config/opencode -> $XDG_CONFIG_HOME/opencode)
    // is the same physical install; warning would advise deleting the active one.
    if (legacyInstalled && resolvedInstalled && isSameRealPath(legacyDir, resolvedDir)) {
        return;
    }

    if (legacyInstalled && !resolvedInstalled) {
        warning(`A previous global install was found at the legacy path: ${legacyDir}`);
        warning(`OpenCode reads its global config from: ${resolvedDir} (XDG_CONFIG_HOME is set).`);
        warning(`OpenCode will NOT see the install at ${legacyDir}. Re-run the global install to populate ${resolvedDir}; ${legacyCleanupClause(legacyDir)}`);
    } else if (legacyInstalled && resolvedInstalled) {
        warning(`Global installs were found at BOTH the active path and the legacy path.`);
        warning(`Active: ${resolvedDir} (XDG_CONFIG_HOME is set) - OpenCode reads this one.`);
        warning(`Legacy: ${legacyDir} - stale and will not be seen by OpenCode; ${legacyCleanupClause(legacyDir)}`);
    }
    // resolved-only is the expected XDG layout: stay silent.
}

function installScope(options) {
  const {
    sourceDir,
    sourceConfig,
    sourceOpencodeDir,
    sourceManagedFiles,
    sourceVersion,
    operation,
    scope,
    projectDir,
    languages,
    targetRequested,
  } = options;

  const paths = pathsMod.getScopePaths(scope, projectDir);
  const existingManifest = readManifest(paths.manifestPath);

    if (scope === 'project' && !fs.existsSync(paths.rootDir)) {
        error(`Project directory does not exist: ${paths.rootDir}`);
        return false;
    }

    if (!configMutator.checkLegacyAgentDir(paths.opencodeDir, {
        error: error,
        PACKAGE_NAME: PACKAGE_NAME,
        AGENT_DIR_LEGACY: AGENT_DIR_LEGACY,
        AGENT_DIR: pathsMod.AGENT_DIR,
    })) {
        return false;
    }

    if (scope === 'global') {
        warnOnGlobalConfigSplit();
    }

    // Host detection runs only after the structural guards above, so a doomed
    // invocation never spawns the `opencode --version` probe. Explicit v1/v2 and
    // a manifest-recorded target both win: only a fresh 'auto' install with no
    // recorded target probes the host (once per run).
    const recordedTarget = existingManifest && (existingManifest.target === 'v1' || existingManifest.target === 'v2')
        ? existingManifest.target
        : null;
    const explicitTarget = targetRequested === 'v1' || targetRequested === 'v2';
    const detectedVersion = !explicitTarget && !recordedTarget ? detectHostVersionOnce() : undefined;
    const resolvedTarget = resolveTargetForScope(targetRequested, existingManifest, detectedVersion);

    fileOps.ensureDir(paths.opencodeDir);

    info(`Installing ${PACKAGE_NAME} (${scope}) at ${paths.rootDir}`);

    const backupSession = createBackupSession(paths, operation || 'install');

    const treeResult = fileOps.installManagedTree(sourceOpencodeDir, sourceManagedFiles, paths.opencodeDir, scope, backupSession, warning);
    success(`✓ Installed/updated ${treeResult.copiedCount} file(s); ${treeResult.skippedCount} unchanged`);

    const templateResult = installProjectTemplateFiles(sourceDir, scope, paths, backupSession);
    if (scope === 'project') {
        if (templateResult.installedCount > 0) {
            success(`✓ Installed ${templateResult.installedCount} project template file(s)`);
        }
        if (templateResult.skippedCount > 0) {
            info(`Skipped ${templateResult.skippedCount} existing project template file(s)`);
        }
    }

    if (languages) {
        fileOps.filterLanguages(paths.opencodeDir, languages, { warning: warning, info: info, success: success }, {
            backupSession: backupSession,
            relativeBase: paths.rootDir,
        });
    }

    let configBackedUp = false;
    const backupConfigBeforeWrite = function () {
        if (configBackedUp || !fs.existsSync(paths.configPath)) {
            return;
        }
        if (backupSession.backupFile(paths.configPath, 'opencode.json')) {
            configBackedUp = true;
        }
    };

    info(`Install target: ${resolvedTarget}`);
    const configPatch = configMutator.mergeInstallerConfig(paths.configPath, sourceConfig, backupConfigBeforeWrite, warning, resolvedTarget);
    if (configPatch.skipped) {
        warning('Config merge skipped due to invalid existing JSON; continuing with agent files only.');
    } else if (configPatch.createdFile) {
        success(`✓ Created config: ${paths.configPath}`);
    } else if (configPatch.changed) {
        success(`✓ Updated config safely: ${paths.configPath}`);
    } else {
        info(`No config changes needed in ${paths.configPath}`);
    }

    if (fs.existsSync(paths.versionPath)) {
        backupSession.backupFile(paths.versionPath, path.relative(paths.rootDir, paths.versionPath));
    }
    fs.writeFileSync(paths.versionPath, `${sourceVersion || 'unknown'}\n`);

    const managedFiles = fileOps.buildManagedFilesFromSource(scope, sourceManagedFiles, paths);
    if (scope === 'project') {
        for (var i = 0; i < PROJECT_TEMPLATE_FILES.length; i++) {
            var templateRelativePath = PROJECT_TEMPLATE_FILES[i];
            var absoluteTemplatePath = path.join(paths.rootDir, templateRelativePath);
            if (fs.existsSync(absoluteTemplatePath)) {
                managedFiles.push(templateRelativePath);
            }
        }
    }
    const manifest = {
        schemaVersion: 1,
        package: PACKAGE_NAME,
        scope,
        target: resolvedTarget,
        rootDir: paths.rootDir,
        sourceVersion: sourceVersion || 'unknown',
        updatedAt: new Date().toISOString(),
        managedFiles,
        configPatch,
    };

    const effectiveConfigPatch = configMutator.mergeConfigPatches(existingManifest ? existingManifest.configPatch : null, configPatch);

    if (existingManifest && existingManifest.installedAt) {
        manifest.installedAt = existingManifest.installedAt;
    } else {
        manifest.installedAt = manifest.updatedAt;
    }
    manifest.configPatch = effectiveConfigPatch;

    if (fs.existsSync(paths.manifestPath)) {
        backupSession.backupFile(paths.manifestPath, path.relative(paths.rootDir, paths.manifestPath));
    }
    writeManifest(paths.manifestPath, manifest);

    const backupResult = backupSession.finalize();
    if (backupResult.created) {
        info(`Backup saved: ${backupResult.backupDir} (${backupResult.count} file(s))`);
        printBackupRestoreHint(backupResult);
        if (backupResult.prunedCount > 0) {
            info(`Pruned ${backupResult.prunedCount} old backup session(s) by retention policy.`);
        }
    }

    if (treeResult.backupCount > 0) {
        info(`Backed up ${treeResult.backupCount} overwritten managed file(s).`);
    }

    if (!verifyInstallation(paths.opencodeDir, scope)) {
        error(`❌ ${scope} installation verification failed.`);
        return false;
    }

    success(`✅ ${scope} installation completed successfully.`);
    info(`Manifest: ${paths.manifestPath}`);
    return true;
}

function uninstallScope(options) {
    const {
        sourceConfig,
        sourceManagedFiles,
        scope,
        projectDir,
    } = options;

    const paths = pathsMod.getScopePaths(scope, projectDir);
    const manifest = readManifest(paths.manifestPath);

    let removedFiles = 0;
    let prunedDirs = 0;
    let configChanged = false;
    let removedConfigFile = false;
    const touchedDirectories = new Set();
    const backupSession = createBackupSession(paths, 'uninstall');
    let configBackedUp = false;

    if (!configMutator.checkLegacyAgentDir(paths.opencodeDir, {
        error: error,
        PACKAGE_NAME: PACKAGE_NAME,
        AGENT_DIR_LEGACY: AGENT_DIR_LEGACY,
        AGENT_DIR: pathsMod.AGENT_DIR,
    })) {
        return false;
    }

    const backupConfigBeforeMutate = function () {
        if (configBackedUp || !fs.existsSync(paths.configPath)) {
            return;
        }
        if (backupSession.backupFile(paths.configPath, 'opencode.json')) {
            configBackedUp = true;
        }
    };

    if (manifest && Array.isArray(manifest.managedFiles)) {
        info(`Using manifest uninstall for ${scope} scope.`);

        for (var i = 0; i < manifest.managedFiles.length; i++) {
            var managedPath = manifest.managedFiles[i];
            var absolutePath = path.join(paths.rootDir, managedPath);
            var result = fileOps.removeManagedFile(absolutePath, managedPath, paths, backupSession);
            if (result.removed) {
                removedFiles += 1;
                touchedDirectories.add(result.directory);
            }
        }

        const revertResult = revertInstallerConfig(paths.configPath, manifest.configPatch, sourceConfig, backupConfigBeforeMutate);
        configChanged = revertResult.changed;
        removedConfigFile = revertResult.removedFile;

        if (fs.existsSync(paths.versionPath)) {
            backupSession.backupFile(paths.versionPath, path.relative(paths.rootDir, paths.versionPath));
        }
        if (fileOps.removeIfExists(paths.versionPath)) {
            removedFiles += 1;
        }
        if (fs.existsSync(paths.manifestPath)) {
            backupSession.backupFile(paths.manifestPath, path.relative(paths.rootDir, paths.manifestPath));
        }
        if (fileOps.removeIfExists(paths.manifestPath)) {
            removedFiles += 1;
            touchedDirectories.add(path.dirname(paths.manifestPath));
        }
    } else {
        warning(`No install manifest found for ${scope}. Attempting safe cleanup.`);

        const managedFiles = sourceManagedFiles
            .map(function (relative) { return pathsMod.toManagedPath(scope, relative); });

        for (var j = 0; j < managedFiles.length; j++) {
            var managedPath2 = managedFiles[j];
            var absolutePath2 = path.join(paths.rootDir, managedPath2);
            var result2 = fileOps.removeManagedFile(absolutePath2, managedPath2, paths, backupSession);
            if (result2.removed) {
                removedFiles += 1;
                touchedDirectories.add(result2.directory);
            }
        }

        const cleanupResult = configMutator.manifestlessCleanup(paths.configPath, sourceConfig, backupConfigBeforeMutate, warning);
        configChanged = cleanupResult.changed;
        removedConfigFile = cleanupResult.removedFile;

        if (fs.existsSync(paths.versionPath)) {
            backupSession.backupFile(paths.versionPath, path.relative(paths.rootDir, paths.versionPath));
        }
        if (fileOps.removeIfExists(paths.versionPath)) {
            removedFiles += 1;
        }
    }

    prunedDirs += fileOps.pruneEmptyDirectories(touchedDirectories, paths.rootDir);

    if (scope === 'project' && fs.existsSync(paths.opencodeDir)) {
        try {
            const entries = fs.readdirSync(paths.opencodeDir);
            if (entries.length === 0) {
                fs.rmdirSync(paths.opencodeDir);
                prunedDirs += 1;
            }
        } catch {
            // ignore
        }
    }

    if (removedFiles === 0 && !configChanged && !removedConfigFile) {
        warning(`No ${PACKAGE_NAME} installation artifacts found for ${scope} scope at ${paths.rootDir}.`);
        return true;
    }

    if (scope === 'project') {
        if (backupAndRemoveAgentsMdIfPresent(paths.agentsMdPath, backupSession)) {
            success('✅ Backed up AGENTS.md and removed installer session file from project root.');
        }
    }

    const backupResult = backupSession.finalize();
    if (backupResult.created) {
        info(`Backup saved: ${backupResult.backupDir} (${backupResult.count} file(s))`);
        printBackupRestoreHint(backupResult);
        if (backupResult.prunedCount > 0) {
            info(`Pruned ${backupResult.prunedCount} old backup session(s) by retention policy.`);
        }
    }

    if (removedConfigFile) {
        success(`✅ Removed config file: ${paths.configPath}`);
    } else if (configChanged) {
        success(`✅ Reverted installer-managed config entries in: ${paths.configPath}`);
    }

    success(`✅ Removed ${removedFiles} managed file(s) for ${scope} scope.`);
    if (prunedDirs > 0) {
        info(`Pruned ${prunedDirs} empty directory(ies).`);
    }

    return true;
}

function isInstalled(scope, projectDir, sourceConfig) {
    const paths = pathsMod.getScopePaths(scope, projectDir);
    const manifestExists = fs.existsSync(paths.manifestPath);

    if (manifestExists) {
        return true;
    }

    return !!pathsMod.resolveAgentDirectory(paths.opencodeDir) || configMutator.configLooksManaged(paths.configPath, sourceConfig, warning);
}

function showStatus(sourceConfig) {
    const globalInstalled = isInstalled('global', undefined, sourceConfig);
    const projectInstalled = isInstalled('project', process.cwd(), sourceConfig);

    console.log('OpenCode Agents installation status:\n');
    console.log(`- Global (${pathsMod.getGlobalConfigDir()}): ${globalInstalled ? 'installed' : 'not installed'}`);
    console.log(`- Project (${process.cwd()}): ${projectInstalled ? 'installed' : 'not installed'}`);
    console.log('\nConfig precedence reminder: project config overrides global config.');

    warnOnGlobalConfigSplit();
}

function parseArgs(argv) {
    const parsed = {
        global: false,
        project: null,
        update: false,
        uninstall: false,
        all: false,
        languages: null,
        target: 'auto',
        status: false,
        version: false,
        help: false,
    };

    const args = argv.slice();
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        switch (arg) {
            case '-g':
            case '--global':
                parsed.global = true;
                break;
            case '-p':
            case '--project': {
                const next = args[i + 1];
                if (!next || next.startsWith('-')) {
                    parsed.project = process.cwd();
                } else {
                    parsed.project = next;
                    i += 1;
                }
                break;
            }
            case '--all':
                parsed.all = true;
                break;
            case '-U':
            case '--update':
                parsed.update = true;
                break;
            case '-u':
            case '--uninstall':
                parsed.uninstall = true;
                break;
            case '-l':
            case '--languages': {
                const next = args[i + 1];
                if (!next || next.startsWith('-')) {
                    throw new Error('--languages requires a comma-separated language list');
                }
                parsed.languages = next;
                i += 1;
                break;
            }
            case '--target': {
                const next = args[i + 1];
                if (!next || next.startsWith('-')) {
                    throw new Error('--target requires one of: v1, v2, auto');
                }
                try {
                    opencodeTarget.resolveTarget({ requested: next });
                } catch (err) {
                    throw new Error(err.message);
                }
                parsed.target = next.toLowerCase();
                i += 1;
                break;
            }
            case '--status':
                parsed.status = true;
                break;
            case '-v':
            case '--version':
                parsed.version = true;
                break;
            case '-h':
            case '--help':
                parsed.help = true;
                break;
            default:
                throw new Error(`Unknown option: ${arg}`);
        }
    }

    return parsed;
}

function getRequestedScopes(parsed, mode, sourceConfig) {
    const scopes = [];

    if (parsed.all) {
        scopes.push('global');
        scopes.push('project');
    } else {
        if (parsed.global) {
            scopes.push('global');
        }
        if (parsed.project !== null) {
            scopes.push('project');
        }
    }

    if (scopes.length === 0) {
        if (mode === 'uninstall') {
            return ['project']; // backward-compatible default
        }
        if (mode === 'update') {
            const inferred = [];
            if (isInstalled('global', undefined, sourceConfig)) {
                inferred.push('global');
            }
            if (isInstalled('project', process.cwd(), sourceConfig)) {
                inferred.push('project');
            }
            return inferred;
        }
    }

    return [...new Set(scopes)];
}

function showUsage(exitCode) {
    if (typeof exitCode === 'undefined') exitCode = 0;
    console.log(`
🤖 OpenCode Agents Installation Script

USAGE:
    node install.js [OPTIONS]

INSTALL OPTIONS:
    -g, --global                Install agents globally (available in all projects)
    -p, --project [DIR]         Install agents for project directory (defaults to current directory)
    -l, --languages LANGS       Keep only these language skills (comma-separated)
                                Choices: dotnet, python, typescript, flutter, go, java,
                                node, react, ruby, rust, sql. Pruned dirs are backed up.
    --target TARGET             OpenCode target: v1, v2, or auto (default: auto).
                                v1 writes 'plugin'/'permission'; v2 writes
                                'permissions' (and 'plugins' only if the source config
                                lists a plugin entry). Never both in one config.
                                auto detects the installed OpenCode version and
                                selects v2 when its major version is >= 2, else v1;
                                it falls back to v1 when OpenCode is not detected.
                                Set AGENTS_OPENCODE_HOST_VERSION to override.

LIFECYCLE OPTIONS:
    -U, --update                Update existing installation(s)
    -u, --uninstall             Uninstall installation(s)
    --all                       Target both global and project scopes (for update/uninstall)
    --status                    Show whether global/project installations are detected

GENERAL:
    -v, --version               Show version information
    -h, --help                  Show this help message

EXAMPLES:
    node install.js --global
    node install.js --project .
    node install.js --global --languages python,typescript  # keep only Python/TypeScript language skills
    node install.js --global --target v2         # emit v2 keys (permissions; plugins only if a plugin entry exists)
    node install.js --global --target auto       # default; detects OpenCode (v2 if major >= 2, else v1)
    node install.js --update                    # updates detected installs (global and/or current project)
    node install.js --update --all              # force update both scopes
    node install.js --uninstall                 # uninstall current project scope (default)
    node install.js --uninstall --global        # uninstall global scope
    node install.js --uninstall --all           # uninstall both scopes
    node install.js --status
    npx agents-opencode --global

INSTALLATION LOCATIONS:
    Global:  ${pathsMod.getGlobalConfigDir()}
    Project: <project>/.opencode/

NOTES:
    - Config updates are merged safely (non-destructive).
    - Uninstall removes only installer-managed files using a manifest.
    - Project backups: <project>/.opencode/.backups/<timestamp>--<operation>--<scope>/
    - Global backups:  ${path.join(pathsMod.getGlobalConfigDir(), '.backups')}/<timestamp>--<operation>--<scope>/
    - Retention: keeps latest 10 sessions and prunes sessions older than 30 days.
    - --languages prunes non-requested language skills; non-language skills always remain.
    - --languages backs up each pruned skill directory into the backup session first.
    - v2 conformance is validated separately from installing; run
      'npm run validate:opencode-schema:v2' (the installer does not run it).
    - The 'cicd' alias is accepted for backward compatibility but filters no skill;
      ci-cd-hygiene.instructions.md is always installed (not a language skill).

For more information, visit: https://github.com/shahboura/agents-opencode
`);
    process.exit(exitCode);
}

function main() {
    const sourceDir = __dirname;
    const sourceOpencodeDir = path.join(sourceDir, '.opencode');
    let parsed;

    try {
        parsed = parseArgs(process.argv.slice(2));
    } catch (err) {
        error(err.message);
        showUsage(1);
        return;
    }

    if (parsed.help || process.argv.slice(2).length === 0) {
        showUsage(0);
        return;
    }

    if (parsed.version) {
        showVersion(sourceDir);
        return;
    }

    if (!validatePackageContents(sourceDir)) {
        process.exit(1);
    }

    const sourceManagedFiles = fileOps.getManagedSourceFiles(sourceOpencodeDir);

    let sourceConfig;
    try {
        sourceConfig = configMutator.loadSourceConfig(sourceDir, warning);
    } catch (err) {
        error(err.message);
        process.exit(1);
    }

    if (parsed.status) {
        showStatus(sourceConfig);
        return;
    }

    if (parsed.uninstall && parsed.update) {
        error('Cannot combine --uninstall and --update.');
        process.exit(1);
    }

    if (parsed.uninstall) {
        if (parsed.languages) {
            warning('--languages is ignored during uninstall.');
        }

        const scopes = getRequestedScopes(parsed, 'uninstall', sourceConfig);
        for (var i = 0; i < scopes.length; i++) {
            var scope = scopes[i];
            var projectDir = scope === 'project' ? (parsed.project || process.cwd()) : null;
            info(`Uninstalling ${PACKAGE_NAME} from ${scope} scope...`);
            var ok = uninstallScope({ sourceConfig: sourceConfig, sourceManagedFiles: sourceManagedFiles, scope: scope, projectDir: projectDir });
            if (!ok) {
                process.exit(1);
            }
        }

        success('Uninstallation completed!');
        return;
    }

    if (parsed.update) {
        const version = checkVersion(sourceDir);
        const scopes = getRequestedScopes(parsed, 'update', sourceConfig);

        if (scopes.length === 0) {
            error('No existing installation found. Use --global or --project to install first.');
            process.exit(1);
        }

        info('🔄 Updating OpenCode Agents installation...');
        if (version) {
            info(`📦 Updating to version ${version}`);
        }

        for (var j = 0; j < scopes.length; j++) {
            var scope2 = scopes[j];
            var projectDir2 = scope2 === 'project' ? (parsed.project || process.cwd()) : null;
            var ok2 = installScope({
                sourceDir: sourceDir,
                sourceConfig: sourceConfig,
                sourceOpencodeDir: sourceOpencodeDir,
                sourceManagedFiles: sourceManagedFiles,
                sourceVersion: version,
                operation: 'update',
                scope: scope2,
                projectDir: projectDir2,
                languages: parsed.languages,
                targetRequested: parsed.target,
            });
            if (!ok2) {
                process.exit(1);
            }
        }

        success('Update completed!');
        return;
    }

    // install mode
    if (parsed.global && parsed.project !== null) {
        error('Choose one install target: --global or --project (not both).');
        process.exit(1);
    }
    if (!parsed.global && parsed.project === null) {
        error('Install target required: use --global or --project [DIR].');
        showUsage(1);
        return;
    }

    const version = checkVersion(sourceDir);
    info('🚀 Starting OpenCode Agents installation...');
    if (version) {
        info(`📦 Installing version ${version}`);
    }

    if (parsed.global) {
        var ok3 = installScope({
            sourceDir: sourceDir,
            sourceConfig: sourceConfig,
            sourceOpencodeDir: sourceOpencodeDir,
            sourceManagedFiles: sourceManagedFiles,
            sourceVersion: version,
            operation: 'install',
            scope: 'global',
            projectDir: null,
            languages: parsed.languages,
            targetRequested: parsed.target,
        });
        if (!ok3) {
            process.exit(1);
        }
    } else {
        var ok4 = installScope({
            sourceDir: sourceDir,
            sourceConfig: sourceConfig,
            sourceOpencodeDir: sourceOpencodeDir,
            sourceManagedFiles: sourceManagedFiles,
            sourceVersion: version,
            operation: 'install',
            scope: 'project',
            projectDir: parsed.project || process.cwd(),
            languages: parsed.languages,
            targetRequested: parsed.target,
        });
        if (!ok4) {
            process.exit(1);
        }
    }

    info('\n🎯 Next steps:');
    info("1. Run 'opencode' to start using the agents");
    info("2. Type '@' to see available agents");
    info("3. Try: @orchestrator Create a user API endpoint");
    info('\n📚 Documentation: https://github.com/shahboura/agents-opencode');
}

if (require.main === module) {
    main();
}
