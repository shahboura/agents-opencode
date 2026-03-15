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

const PACKAGE_NAME = 'agents-opencode';
const MANIFEST_FILE = '.agents-opencode-manifest.json';
const VERSION_FILE = '.opencode-agents-version';
const BACKUP_DIR = '.backups';

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

function getHomeDir() {
    return os.homedir();
}

function getGlobalConfigDir() {
    return path.join(getHomeDir(), '.config', 'opencode');
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readJsonFile(filePath, labelForError) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        warning(`Could not parse ${labelForError}: ${err.message}`);
        return null;
    }
}

function writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function formatBackupTimestamp(date = new Date()) {
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
            package: PACKAGE_NAME,
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
            const packageData = readJsonFile(packagePath, 'package.json');
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
            const packageData = readJsonFile(packagePath, 'package.json');
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

function getManagedSourceFiles(sourceOpencodeDir) {
    const allFiles = listFilesRecursive(sourceOpencodeDir);
    return allFiles.filter((relativePath) => {
        // Never manage transient dependency installs from local development
        if (relativePath.includes(`node_modules${path.sep}`) || relativePath === 'node_modules') {
            return false;
        }

        // Never treat backup snapshots as source-managed content
        if (relativePath === BACKUP_DIR || relativePath.startsWith(`${BACKUP_DIR}${path.sep}`)) {
            return false;
        }

        // Avoid re-managing backup artifacts if present
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

function getScopePaths(scope, projectDir) {
    if (scope === 'global') {
        const rootDir = getGlobalConfigDir();
        return {
            scope,
            rootDir,
            opencodeDir: rootDir,
            manifestPath: path.join(rootDir, MANIFEST_FILE),
            versionPath: path.join(rootDir, VERSION_FILE),
            configPath: path.join(rootDir, 'opencode.json'),
            agentsMdPath: null,
        };
    }

    const resolvedProjectDir = path.resolve(projectDir || process.cwd());
    return {
        scope,
        rootDir: resolvedProjectDir,
        opencodeDir: path.join(resolvedProjectDir, '.opencode'),
        manifestPath: path.join(resolvedProjectDir, '.opencode', MANIFEST_FILE),
        versionPath: path.join(resolvedProjectDir, VERSION_FILE),
        configPath: path.join(resolvedProjectDir, 'opencode.json'),
        agentsMdPath: path.join(resolvedProjectDir, 'AGENTS.md'),
    };
}

function toManagedPath(scope, relativeOpencodeFile) {
    if (scope === 'global') {
        return relativeOpencodeFile;
    }
    return path.join('.opencode', relativeOpencodeFile);
}

function installManagedTree(sourceOpencodeDir, sourceFiles, destinationOpencodeDir, scope, backupSession) {
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
                warning(`Could not back up existing file ${dest}: ${err.message}`);
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

function mergeInstallerConfig(targetConfigPath, sourceConfig, onBeforeWrite) {
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

    const existing = readJsonFile(targetConfigPath, `existing config at ${targetConfigPath}`);
    if (!existing || !isObject(existing)) {
        warning(`Skipping config merge for ${targetConfigPath} because existing config is invalid JSON.`);
        patch.skipped = true;
        return patch;
    }

    if (isObject(sourceConfigForInstall.permission)) {
        if (existing.permission === undefined) {
            existing.permission = {};
        }

        if (!isObject(existing.permission)) {
            warning(`Skipping permission merge for ${targetConfigPath}; existing permission is not an object.`);
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

    const existing = readJsonFile(targetConfigPath, `existing config at ${targetConfigPath}`);
    if (!existing || !isObject(existing)) {
        warning(`Could not revert config changes for ${targetConfigPath}; invalid JSON.`);
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
                warning(`Keeping modified permission key '${key}' in ${targetConfigPath}; value differs from installer default.`);
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

function writeManifest(manifestPath, manifest) {
    ensureDir(path.dirname(manifestPath));
    writeJsonFile(manifestPath, manifest);
}

function readManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        return null;
    }
    const manifest = readJsonFile(manifestPath, `manifest at ${manifestPath}`);
    if (!manifest || !isObject(manifest)) {
        return null;
    }
    return manifest;
}

function removeIfExists(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }
    fs.unlinkSync(filePath);
    return true;
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
        const requiredDirs = ['agent', 'instructions', 'commands'];
        for (const dir of requiredDirs) {
            const dirPath = path.join(opencodeDir, dir);
            if (!fs.existsSync(dirPath)) {
                error(`Missing required directory '${dir}' in ${scope} installation.`);
                return false;
            }
        }

        const agentDir = path.join(opencodeDir, 'agent');
        const agents = fs.readdirSync(agentDir).filter(file => file.endsWith('.md'));
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

function legacyConfigCleanup(configPath, sourceConfig, onBeforeMutate) {
    if (!fs.existsSync(configPath)) {
        return { changed: false, removedFile: false };
    }

    const existing = readJsonFile(configPath, `existing config at ${configPath}`);
    if (!existing || !isObject(existing)) {
        warning(`Skipping legacy config cleanup; invalid JSON at ${configPath}.`);
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

function loadSourceConfig(sourceDir) {
    const sourceConfigPath = path.join(sourceDir, 'opencode.json');
    const sourceConfig = readJsonFile(sourceConfigPath, 'package opencode.json');
    if (!sourceConfig || !isObject(sourceConfig)) {
        error('Could not parse package opencode.json.');
        process.exit(1);
    }
    return sourceConfig;
}

function configLooksManaged(configPath, sourceConfig) {
    if (!fs.existsSync(configPath)) {
        return false;
    }

    const config = readJsonFile(configPath, `config at ${configPath}`);
    if (!config || !isObject(config)) {
        return false;
    }

    if (isObject(sourceConfig.permission) && isObject(config.permission)) {
        for (const [key, sourceValue] of Object.entries(sourceConfig.permission)) {
            if (!(key in config.permission)) {
                continue;
            }
            if (JSON.stringify(config.permission[key]) === JSON.stringify(sourceValue)) {
                return true;
            }
        }
    }

    return false;
}

function installScope(options) {
    const {
        sourceConfig,
        sourceOpencodeDir,
        sourceManagedFiles,
        sourceVersion,
        operation,
        scope,
        projectDir,
        languages,
    } = options;

    const paths = getScopePaths(scope, projectDir);
    const existingManifest = readManifest(paths.manifestPath);

    if (scope === 'project' && !fs.existsSync(paths.rootDir)) {
        error(`Project directory does not exist: ${paths.rootDir}`);
        return false;
    }

    ensureDir(paths.opencodeDir);

    info(`Installing ${PACKAGE_NAME} (${scope}) at ${paths.rootDir}`);

    const backupSession = createBackupSession(paths, operation || 'install');

    const treeResult = installManagedTree(sourceOpencodeDir, sourceManagedFiles, paths.opencodeDir, scope, backupSession);
    success(`✓ Installed/updated ${treeResult.copiedCount} file(s); ${treeResult.skippedCount} unchanged`);

    if (languages) {
        filterLanguages(paths.opencodeDir, languages);
    }

    let configBackedUp = false;
    const backupConfigBeforeWrite = () => {
        if (configBackedUp || !fs.existsSync(paths.configPath)) {
            return;
        }
        if (backupSession.backupFile(paths.configPath, 'opencode.json')) {
            configBackedUp = true;
        }
    };

    const configPatch = mergeInstallerConfig(paths.configPath, sourceConfig, backupConfigBeforeWrite);
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

    const managedFiles = buildManagedFilesFromSource(scope, sourceManagedFiles, paths);
    const manifest = {
        schemaVersion: 1,
        package: PACKAGE_NAME,
        scope,
        rootDir: paths.rootDir,
        sourceVersion: sourceVersion || 'unknown',
        updatedAt: new Date().toISOString(),
        managedFiles,
        configPatch,
    };

    const effectiveConfigPatch = mergeConfigPatches(existingManifest ? existingManifest.configPatch : null, configPatch);

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

    const paths = getScopePaths(scope, projectDir);
    const manifest = readManifest(paths.manifestPath);

    let removedFiles = 0;
    let prunedDirs = 0;
    let configChanged = false;
    let removedConfigFile = false;
    const touchedDirectories = new Set();
    const backupSession = createBackupSession(paths, 'uninstall');
    let configBackedUp = false;

    const backupConfigBeforeMutate = () => {
        if (configBackedUp || !fs.existsSync(paths.configPath)) {
            return;
        }
        if (backupSession.backupFile(paths.configPath, 'opencode.json')) {
            configBackedUp = true;
        }
    };

    const removeManagedFile = (absolutePath, relativePathFromRoot) => {
        if (!fs.existsSync(absolutePath)) {
            return;
        }
        backupSession.backupFile(absolutePath, relativePathFromRoot || path.relative(paths.rootDir, absolutePath));
        fs.unlinkSync(absolutePath);
        removedFiles += 1;
        touchedDirectories.add(path.dirname(absolutePath));
    };

    if (manifest && Array.isArray(manifest.managedFiles)) {
        info(`Using manifest uninstall for ${scope} scope.`);

        for (const managedPath of manifest.managedFiles) {
            const absolutePath = path.join(paths.rootDir, managedPath);
            removeManagedFile(absolutePath, managedPath);
        }

        const revertResult = revertInstallerConfig(paths.configPath, manifest.configPatch, sourceConfig, backupConfigBeforeMutate);
        configChanged = revertResult.changed;
        removedConfigFile = revertResult.removedFile;

        if (fs.existsSync(paths.versionPath)) {
            backupSession.backupFile(paths.versionPath, path.relative(paths.rootDir, paths.versionPath));
        }
        if (removeIfExists(paths.versionPath)) {
            removedFiles += 1;
        }
        if (fs.existsSync(paths.manifestPath)) {
            backupSession.backupFile(paths.manifestPath, path.relative(paths.rootDir, paths.manifestPath));
        }
        if (removeIfExists(paths.manifestPath)) {
            removedFiles += 1;
            touchedDirectories.add(path.dirname(paths.manifestPath));
        }
    } else {
        warning(`No install manifest found for ${scope}. Attempting safe legacy cleanup.`);

        const legacyManagedFiles = sourceManagedFiles
            .map(relative => toManagedPath(scope, relative));

        for (const legacyManagedPath of legacyManagedFiles) {
            const absolutePath = path.join(paths.rootDir, legacyManagedPath);
            removeManagedFile(absolutePath, legacyManagedPath);
        }

        const legacyConfigResult = legacyConfigCleanup(paths.configPath, sourceConfig, backupConfigBeforeMutate);
        configChanged = legacyConfigResult.changed;
        removedConfigFile = legacyConfigResult.removedFile;

        if (fs.existsSync(paths.versionPath)) {
            backupSession.backupFile(paths.versionPath, path.relative(paths.rootDir, paths.versionPath));
        }
        if (removeIfExists(paths.versionPath)) {
            removedFiles += 1;
        }
    }

    prunedDirs += pruneEmptyDirectories(touchedDirectories, paths.rootDir);

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
    const paths = getScopePaths(scope, projectDir);
    const manifestExists = fs.existsSync(paths.manifestPath);

    if (manifestExists) {
        return true;
    }

    return fs.existsSync(path.join(paths.opencodeDir, 'agent')) || configLooksManaged(paths.configPath, sourceConfig);
}

function showStatus(sourceConfig) {
    const globalInstalled = isInstalled('global', undefined, sourceConfig);
    const projectInstalled = isInstalled('project', process.cwd(), sourceConfig);

    console.log('OpenCode Agents installation status:\n');
    console.log(`- Global (~/.config/opencode): ${globalInstalled ? 'installed' : 'not installed'}`);
    console.log(`- Project (${process.cwd()}): ${projectInstalled ? 'installed' : 'not installed'}`);
    console.log('\nConfig precedence reminder: project config overrides global config.');
}

// Language-to-instruction file mapping
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

// Content-focused instruction files that are always kept
const ALWAYS_KEEP = [
    'blogger.instructions.md',
    'brutal-critic.instructions.md',
    'ci-cd-hygiene.instructions.md',
];

function filterLanguages(installDir, languages) {
    const instructionsDir = path.join(installDir, 'instructions');
    if (!fs.existsSync(instructionsDir)) {
        warning('No instructions directory found — skipping language filter.');
        return;
    }

    const validLanguages = Object.keys(LANGUAGE_MAP);
    const requested = languages.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
    const invalid = requested.filter(l => !validLanguages.includes(l));

    if (invalid.length > 0) {
        warning(`Unknown language(s): ${invalid.join(', ')}`);
        info(`Available: ${validLanguages.join(', ')}`);
    }

    const valid = requested.filter(l => validLanguages.includes(l));
    if (valid.length === 0) {
        warning('No valid languages specified — keeping all instruction files.');
        return;
    }

    const keepFiles = new Set(ALWAYS_KEEP);
    for (const lang of valid) {
        if (LANGUAGE_MAP[lang]) {
            keepFiles.add(LANGUAGE_MAP[lang]);
        }
    }

    const allFiles = fs.readdirSync(instructionsDir);
    const removed = [];

    for (const file of allFiles) {
        if (keepFiles.has(file) || !LANGUAGE_INSTRUCTIONS.has(file)) {
            continue;
        }
        try {
            fs.unlinkSync(path.join(instructionsDir, file));
            removed.push(file);
        } catch (err) {
            warning(`Could not remove ${file}: ${err.message}`);
        }
    }

    success(`✓ Applied language filter: ${valid.join(', ')}`);
    if (removed.length > 0) {
        info(`Removed ${removed.length} instruction file(s): ${removed.join(', ')}`);
    }
}

function parseArgs(argv) {
    const parsed = {
        global: false,
        project: null,
        update: false,
        uninstall: false,
        all: false,
        languages: null,
        status: false,
        version: false,
        help: false,
    };

    const args = [...argv];
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

function showUsage(exitCode = 0) {
    console.log(`
🤖 OpenCode Agents Installation Script

USAGE:
    node install.js [OPTIONS]

INSTALL OPTIONS:
    -g, --global                Install agents globally (available in all projects)
    -p, --project [DIR]         Install agents for project directory (defaults to current directory)
    -l, --languages LANGS       Filter language instruction reference files (comma-separated)

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
    node install.js --global --languages python,typescript
    node install.js --update                    # updates detected installs (global and/or current project)
    node install.js --update --all              # force update both scopes
    node install.js --uninstall                 # uninstall current project scope (default)
    node install.js --uninstall --global        # uninstall global scope
    node install.js --uninstall --all           # uninstall both scopes
    node install.js --status
    npx agents-opencode --global

INSTALLATION LOCATIONS:
    Global:  ~/.config/opencode/
    Project: <project>/.opencode/

NOTES:
    - Config updates are merged safely (non-destructive).
    - Uninstall removes only installer-managed files using a manifest.
    - Project backups: <project>/.opencode/.backups/<timestamp>--<operation>--<scope>/
    - Global backups:  ~/.config/opencode/.backups/<timestamp>--<operation>--<scope>/
    - Retention: keeps latest 10 sessions and prunes sessions older than 30 days.
    - --languages filters instruction reference files; skill loading remains on-demand.

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

    const sourceManagedFiles = getManagedSourceFiles(sourceOpencodeDir);

    const sourceConfig = loadSourceConfig(sourceDir);

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
        for (const scope of scopes) {
            const projectDir = scope === 'project' ? (parsed.project || process.cwd()) : null;
            info(`Uninstalling ${PACKAGE_NAME} from ${scope} scope...`);
            const ok = uninstallScope({ sourceConfig, sourceManagedFiles, scope, projectDir });
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

        for (const scope of scopes) {
            const projectDir = scope === 'project' ? (parsed.project || process.cwd()) : null;
            const ok = installScope({
                sourceConfig,
                sourceOpencodeDir,
                sourceManagedFiles,
                sourceVersion: version,
                operation: 'update',
                scope,
                projectDir,
                languages: parsed.languages,
            });
            if (!ok) {
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
        const ok = installScope({
            sourceConfig,
            sourceOpencodeDir,
            sourceManagedFiles,
            sourceVersion: version,
            operation: 'install',
            scope: 'global',
            projectDir: null,
            languages: parsed.languages,
        });
        if (!ok) {
            process.exit(1);
        }
    } else {
        const ok = installScope({
            sourceConfig,
            sourceOpencodeDir,
            sourceManagedFiles,
            sourceVersion: version,
            operation: 'install',
            scope: 'project',
            projectDir: parsed.project || process.cwd(),
            languages: parsed.languages,
        });
        if (!ok) {
            process.exit(1);
        }
    }

    info('\n🎯 Next steps:');
    info("1. Run 'opencode' to start using the agents");
    info("2. Type '@' to see available agents");
    info("3. Try: @codebase Create a user API endpoint");
    info('\n📚 Documentation: https://github.com/shahboura/agents-opencode');
}

if (require.main === module) {
    main();
}
