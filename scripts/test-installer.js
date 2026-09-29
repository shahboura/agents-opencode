#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { LANGUAGE_MAP, LANGUAGE_SKILL_DIRS, NON_LANGUAGE_SKILLS, filterLanguages, isUnsafeBackupKey } = require('./lib/file-ops.js');

const repoRoot = process.cwd();
const installScript = path.join(repoRoot, 'install.js');
const shippedSkillsDir = path.join(repoRoot, '.opencode', 'skills');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listSkillDirs(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// Assert the full language partition produced by a --languages run: exactly the
// requested language dirs remain, every non-language dir is kept, and every
// non-requested language dir is gone.
function assertLanguagePartition(projectDir, requestedLanguages) {
  const skillsDir = path.join(projectDir, '.opencode', 'skills');
  const present = new Set(listSkillDirs(skillsDir));
  const requestedDirs = new Set(requestedLanguages.map((lang) => LANGUAGE_MAP[lang]));

  for (const dir of NON_LANGUAGE_SKILLS) {
    assert(present.has(dir), `Non-language skill '${dir}' must be kept`);
  }
  for (const dir of LANGUAGE_SKILL_DIRS) {
    if (requestedDirs.has(dir)) {
      assert(present.has(dir), `Requested language skill '${dir}' must remain`);
    } else {
      assert(!present.has(dir), `Non-requested language skill '${dir}' must be removed`);
    }
  }
  for (const dir of present) {
    assert(
      LANGUAGE_SKILL_DIRS.has(dir) || NON_LANGUAGE_SKILLS.has(dir),
      `Unexpected skill directory after filter: '${dir}'`
    );
  }
}

function runInstaller(args, options = {}) {
  const result = execFileSync('node', [installScript, ...args], {
    cwd: options.cwd || repoRoot,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
  });
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function listProjectBackupSessions(projectDir) {
  const backupRoot = path.join(projectDir, '.opencode', '.backups');
  if (!fs.existsSync(backupRoot)) return [];
  return fs.readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(backupRoot, entry.name))
    .sort();
}

function hasBackedUpFile(sessionDir, relativePath) {
  return fs.existsSync(path.join(sessionDir, relativePath));
}

function createDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function testNoopUninstallDoesNotBackupAgents(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'noop-project');
  createDir(projectDir);
  fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), '# test\n');

  runInstaller(['--uninstall', '--project', '.'], { cwd: projectDir });

  assert(fs.existsSync(path.join(projectDir, 'AGENTS.md')), 'AGENTS.md should remain for no-op uninstall');
  assert(listProjectBackupSessions(projectDir).length === 0, 'No backup session should be created for no-op uninstall');
}

function testProjectInstallAndUninstall(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'project-install');
  createDir(projectDir);
  fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), '# active session\n');

  runInstaller(['--project', '.'], { cwd: projectDir });

  const manifestPath = path.join(projectDir, '.opencode', '.agents-opencode-manifest.json');
  assert(fs.existsSync(manifestPath), 'Project manifest should exist after install');
  assert(fs.existsSync(path.join(projectDir, 'state', 'session-state.json')), 'Project state template should exist after install');
  assert(fs.existsSync(path.join(projectDir, 'handoff', '.gitkeep')), 'Project handoff scaffold should exist after install');

  runInstaller(['--uninstall', '--project', '.'], { cwd: projectDir });

  assert(!fs.existsSync(manifestPath), 'Project manifest should be removed after uninstall');
  assert(!fs.existsSync(path.join(projectDir, 'AGENTS.md')), 'AGENTS.md should be removed from project root on real uninstall');
  assert(!fs.existsSync(path.join(projectDir, 'state', 'session-state.json')), 'Project state template should be removed on uninstall');
  assert(!fs.existsSync(path.join(projectDir, 'handoff', '.gitkeep')), 'Project handoff scaffold should be removed on uninstall');

  const sessions = listProjectBackupSessions(projectDir);
  assert(sessions.length >= 1, 'Backup session should be created on real uninstall');

  const latestSession = sessions[sessions.length - 1];
  const sessionName = path.basename(latestSession);
  assert(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}Z--uninstall--project$/.test(sessionName), 'Backup session folder should be readable and sortable');
  assert(hasBackedUpFile(latestSession, 'AGENTS.md'), 'Backup session should include AGENTS.md');
  assert(hasBackedUpFile(latestSession, 'backup-manifest.json'), 'Backup session should include backup-manifest.json');
}

function testConfigMergePreservesUserData(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'config-merge');
  createDir(projectDir);

  const configPath = path.join(projectDir, 'opencode.json');
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    provider: {
      anthropic: {
        options: {
          apiKey: '{env:ANTHROPIC_API_KEY}',
        },
      },
    },
    model: 'anthropic/claude-sonnet-4-5',
    permission: {
      external_directory: 'ask',
      bash: 'ask',
    },
    instructions: ['CONTRIBUTING.md'],
  });

  runInstaller(['--project', '.'], { cwd: projectDir });

  const installedConfig = readJson(configPath);
  assert(installedConfig.provider && installedConfig.provider.anthropic, 'Provider configuration should remain intact');
  assert(installedConfig.model === 'anthropic/claude-sonnet-4-5', 'Model config should remain unchanged');
  assert(Array.isArray(installedConfig.instructions) && installedConfig.instructions.includes('CONTRIBUTING.md'), 'Instructions should remain unchanged');
  assert(installedConfig.permission.external_directory === 'ask', 'Existing permission value should not be overridden');
  assert(installedConfig.permission.doom_loop === 'deny', 'Missing installer permission should be merged');

  runInstaller(['--uninstall', '--project', '.'], { cwd: projectDir });

  const revertedConfig = readJson(configPath);
  assert(revertedConfig.permission.external_directory === 'ask', 'User permission should remain after uninstall');
  assert(!('doom_loop' in (revertedConfig.permission || {})), 'Installer-added permission should be removed on uninstall');
}

function testFreshConfigContainsOnlyManagedKeys(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'fresh-config');
  createDir(projectDir);

  runInstaller(['--project', '.'], { cwd: projectDir });

  const config = readJson(path.join(projectDir, 'opencode.json'));
  const allowed = new Set(['$schema', 'plugin', 'permission']);
  for (const key of Object.keys(config)) {
    assert(allowed.has(key), `Fresh install config must not contain opinionated key '${key}'`);
  }
  assert(Array.isArray(config.plugin) && config.plugin.includes('agents-opencode'), 'Fresh config should register the plugin');
  assert(config.permission && config.permission.doom_loop === 'deny', 'Fresh config should include installer permission defaults');
  assert(!('share' in config), 'Fresh config must not set share');
  assert(!('compaction' in config), 'Fresh config must not set compaction');
  assert(!('subagent_depth' in config), 'Fresh config must not set subagent_depth');
}

function testGlobalAndProjectLifecycle(tmpRoot) {
  const homeDir = path.join(tmpRoot, 'home');
  const projectDir = path.join(tmpRoot, 'both-scopes');
  createDir(homeDir);
  createDir(projectDir);

  const env = {
    HOME: homeDir,
    USERPROFILE: homeDir,
  };
  const globalManifest = path.join(homeDir, '.config', 'opencode', '.agents-opencode-manifest.json');
  const projectManifest = path.join(projectDir, '.opencode', '.agents-opencode-manifest.json');

  runInstaller(['--global'], { cwd: projectDir, env });
  runInstaller(['--project', '.'], { cwd: projectDir, env });

  assert(fs.existsSync(globalManifest), 'Global manifest should exist after global install');
  assert(fs.existsSync(projectManifest), 'Project manifest should exist after project install');

  const globalConfigPath = path.join(homeDir, '.config', 'opencode', 'opencode.json');
  assert(fs.existsSync(globalConfigPath), 'Global install should create a config');
  const globalConfig = readJson(globalConfigPath);
  for (const key of Object.keys(globalConfig)) {
    assert(['$schema', 'plugin', 'permission'].includes(key), `Global config must not contain opinionated key '${key}'`);
  }
  assert(!fs.existsSync(path.join(homeDir, '.config', 'opencode', 'state', 'session-state.json')), 'Global install should not create project state template');
  assert(fs.existsSync(path.join(projectDir, 'state', 'session-state.json')), 'Project install should create project state template');

  runInstaller(['--update'], { cwd: projectDir, env });
  runInstaller(['--uninstall', '--all'], { cwd: projectDir, env });

  assert(!fs.existsSync(globalManifest), 'Global manifest should be removed after uninstall --all');
  assert(!fs.existsSync(projectManifest), 'Project manifest should be removed after uninstall --all');
}

function testManifestlessUninstallRemovesCreatedConfig(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'manifestless-uninstall');
  createDir(projectDir);

  runInstaller(['--project', '.'], { cwd: projectDir });

  const configPath = path.join(projectDir, 'opencode.json');
  assert(fs.existsSync(configPath), 'Config should exist after install');

  // Simulate a legacy/manifestless state.
  fs.rmSync(path.join(projectDir, '.opencode', '.agents-opencode-manifest.json'), { force: true });

  runInstaller(['--uninstall', '--project', '.'], { cwd: projectDir });

  assert(!fs.existsSync(configPath), 'Installer-created config should be removed on manifestless uninstall');
}

function testUninstallRevertsInstallerPluginEntries(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'config-plugin-revert');
  createDir(projectDir);

  const configPath = path.join(projectDir, 'opencode.json');
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    plugin: ['my-own-plugin'],
    permission: { bash: 'ask' },
  });

  runInstaller(['--project', '.'], { cwd: projectDir });

  const installed = readJson(configPath);
  assert(Array.isArray(installed.plugin) && installed.plugin.includes('agents-opencode'), 'Installer plugin should be added');
  assert(installed.plugin.includes('my-own-plugin'), 'User plugin entry should be preserved');

  runInstaller(['--uninstall', '--project', '.'], { cwd: projectDir });

  const reverted = readJson(configPath);
  const revertedPlugins = Array.isArray(reverted.plugin) ? reverted.plugin : [];
  assert(!revertedPlugins.includes('agents-opencode'), 'Installer plugin entry should be removed on uninstall');
  assert(revertedPlugins.includes('my-own-plugin'), 'User plugin entry should remain after uninstall');
}

function testSkillClassificationCoversShippedSkills() {
  // C1: derive the expectation from the filesystem so adding a skill directory
  // without classifying it fails CI instead of silently breaking --languages.
  const dirs = listSkillDirs(shippedSkillsDir);
  assert(dirs.length > 0, 'Shipped skills directory should contain skill directories');

  for (const dir of dirs) {
    const inLanguage = LANGUAGE_SKILL_DIRS.has(dir);
    const inNonLanguage = NON_LANGUAGE_SKILLS.has(dir);
    assert(
      inLanguage !== inNonLanguage,
      `Skill '${dir}' must be classified by exactly one of LANGUAGE_SKILL_DIRS or ` +
      `NON_LANGUAGE_SKILLS (language=${inLanguage}, nonLanguage=${inNonLanguage})`
    );
  }
  for (const dir of LANGUAGE_SKILL_DIRS) {
    assert(dirs.includes(dir), `LANGUAGE_SKILL_DIRS entry '${dir}' has no matching skill directory`);
  }
  for (const dir of NON_LANGUAGE_SKILLS) {
    assert(dirs.includes(dir), `NON_LANGUAGE_SKILLS entry '${dir}' has no matching skill directory`);
  }
}

function testLanguagesFilterFullPartition(tmpRoot) {
  const single = path.join(tmpRoot, 'language-single');
  createDir(single);
  runInstaller(['--project', '.', '--languages', 'python'], { cwd: single });
  assertLanguagePartition(single, ['python']);
  assert(fs.existsSync(path.join(single, '.opencode', 'instructions', 'ci-cd-hygiene.instructions.md')), 'Always-installed instruction should remain');
  assert(fs.existsSync(path.join(single, 'opencode.json')), 'Language-filtered install should still complete cleanly');

  const multi = path.join(tmpRoot, 'language-multi');
  createDir(multi);
  runInstaller(['--project', '.', '--languages', 'python,typescript'], { cwd: multi });
  assertLanguagePartition(multi, ['python', 'typescript']);
}

function testLanguagesFilterCicdAlias(tmpRoot) {
  const aliasOnly = path.join(tmpRoot, 'language-cicd-only');
  createDir(aliasOnly);
  runInstaller(['--project', '.', '--languages', 'cicd'], { cwd: aliasOnly });

  const skillsDir = path.join(aliasOnly, '.opencode', 'skills');
  for (const dir of LANGUAGE_SKILL_DIRS) {
    assert(fs.existsSync(path.join(skillsDir, dir, 'SKILL.md')), `cicd alias should keep all language skills; missing '${dir}'`);
  }
  for (const dir of NON_LANGUAGE_SKILLS) {
    assert(fs.existsSync(path.join(skillsDir, dir, 'SKILL.md')), `cicd alias should keep non-language skill '${dir}'`);
  }
  assert(fs.existsSync(path.join(aliasOnly, '.opencode', 'instructions', 'ci-cd-hygiene.instructions.md')), 'ci-cd-hygiene instruction should remain for the cicd alias');

  // Mixing the alias with a real language still filters to that language.
  const mixed = path.join(tmpRoot, 'language-cicd-mixed');
  createDir(mixed);
  runInstaller(['--project', '.', '--languages', 'cicd,python'], { cwd: mixed });
  assertLanguagePartition(mixed, ['python']);
}

function testLanguagesFilterIdempotent(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'language-idempotent');
  createDir(projectDir);

  runInstaller(['--project', '.', '--languages', 'python'], { cwd: projectDir });
  const first = listSkillDirs(path.join(projectDir, '.opencode', 'skills'));

  runInstaller(['--project', '.', '--languages', 'python'], { cwd: projectDir });
  const second = listSkillDirs(path.join(projectDir, '.opencode', 'skills'));

  assert(JSON.stringify(first) === JSON.stringify(second), 'Re-running --languages must be idempotent');
  assertLanguagePartition(projectDir, ['python']);
}

function testLanguagesFilterBacksUpPrunedSkills(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'language-backup');
  createDir(projectDir);
  runInstaller(['--project', '.', '--languages', 'python'], { cwd: projectDir });

  const sessions = listProjectBackupSessions(projectDir);
  assert(sessions.length >= 1, 'Pruning skills should create a backup session');
  const latestSession = sessions[sessions.length - 1];
  assert(hasBackedUpFile(latestSession, path.join('.opencode', 'skills', 'rust', 'SKILL.md')), 'Pruned language skill file should be backed up before deletion');
  assert(!fs.existsSync(path.join(projectDir, '.opencode', 'skills', 'rust')), 'Pruned language skill directory should be removed');
}

function testLanguagesFilterUnknownKeepsAllSkills(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'language-filter-unknown');
  createDir(projectDir);

  runInstaller(['--project', '.', '--languages', 'klingon'], { cwd: projectDir });

  const skillsDir = path.join(projectDir, '.opencode', 'skills');
  assert(fs.existsSync(path.join(skillsDir, 'python', 'SKILL.md')), 'Unknown language should keep all skills');
  assert(fs.existsSync(path.join(skillsDir, 'rust', 'SKILL.md')), 'Unknown language should keep all skills');
}

// --- Unit coverage for the fail-closed prune path (S-1/C8/C9/C10/S-2) ---

function createSkillsTree(rootDir, dirs) {
  const skillsDir = path.join(rootDir, 'skills');
  for (const dir of dirs) {
    createDir(path.join(skillsDir, dir));
    fs.writeFileSync(path.join(skillsDir, dir, 'SKILL.md'), `# ${dir}\n`);
  }
  return skillsDir;
}

function createLogCapture() {
  const logs = { warning: [], info: [], success: [] };
  return {
    logs,
    logFns: {
      warning: (message) => logs.warning.push(message),
      info: (message) => logs.info.push(message),
      success: (message) => logs.success.push(message),
    },
  };
}

function createMockBackupSession(options = {}) {
  const failPaths = new Set(options.failPaths || []);
  const seen = new Set(options.preseedPaths || []);
  const backedUp = [];
  return {
    backedUp,
    backupFile(absolutePath, relativePath) {
      const key = relativePath || absolutePath;
      if (failPaths.has(key)) {
        throw new Error('simulated backup failure');
      }
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      backedUp.push(key);
      return true;
    },
    has(relativePath) {
      return Boolean(relativePath) && seen.has(relativePath);
    },
  };
}

function testFilterLanguagesReportsCleanSuccess(tmpRoot) {
  const installDir = path.join(tmpRoot, 'filter-success');
  createSkillsTree(installDir, ['python', 'rust', 'docs-validation']);
  const { logs, logFns } = createLogCapture();
  const session = createMockBackupSession();

  const result = filterLanguages(installDir, 'python', logFns, {
    backupSession: session,
    relativeBase: installDir,
  });

  assert(JSON.stringify(result.removed) === JSON.stringify(['rust']), `Expected only rust removed, got ${JSON.stringify(result.removed)}`);
  assert(result.failed.length === 0, 'Clean success should report no failures');
  assert(result.skipped.length === 0, 'Clean success should report no skips');
  assert(!fs.existsSync(path.join(installDir, 'skills', 'rust')), 'Backed-up dir should be removed');
  assert(fs.existsSync(path.join(installDir, 'skills', 'python')), 'Requested language dir should remain');
  assert(fs.existsSync(path.join(installDir, 'skills', 'docs-validation')), 'Non-language dir should remain');
  assert(session.backedUp.includes(path.join('skills', 'rust', 'SKILL.md')), 'Pruned file should be backed up');
  assert(logs.success.some((message) => message.includes('Applied language filter')), 'Clean success should log success');
  assert(!logs.warning.some((message) => message.includes('not removed')), 'Clean success should not warn');
}

function testFilterLanguagesFailsClosedOnIncompleteBackup(tmpRoot) {
  const installDir = path.join(tmpRoot, 'filter-failure');
  createSkillsTree(installDir, ['python', 'rust', 'docs-validation']);
  const { logs, logFns } = createLogCapture();
  const session = createMockBackupSession({ failPaths: [path.join('skills', 'rust', 'SKILL.md')] });

  const result = filterLanguages(installDir, 'python', logFns, {
    backupSession: session,
    relativeBase: installDir,
  });

  assert(result.removed.length === 0, 'Incomplete backup must not remove anything');
  assert(result.failed.includes('rust'), 'Dir with a backup failure should be recorded');
  assert(fs.existsSync(path.join(installDir, 'skills', 'rust')), 'Dir with incomplete backup must be kept');
  assert(!logs.success.some((message) => message.includes('Applied language filter')), 'No success log when backup is incomplete');
  assert(logs.warning.some((message) => message.includes('Not removing rust')), 'Warning should name the skipped dir');
  assert(logs.warning.some((message) => message.includes('backup incomplete')), 'Warning should explain the incomplete backup');
}

function testFilterLanguagesFailsClosedWithoutBackupSession(tmpRoot) {
  const installDir = path.join(tmpRoot, 'filter-no-session');
  createSkillsTree(installDir, ['python', 'rust']);
  const { logs, logFns } = createLogCapture();

  const result = filterLanguages(installDir, 'python', logFns, {});

  assert(result.removed.length === 0, 'No backup session must not remove anything');
  assert(result.failed.includes('rust'), 'No session should record the dir as not removed');
  assert(fs.existsSync(path.join(installDir, 'skills', 'rust')), 'No session must keep the dir');
  assert(!logs.success.some((message) => message.includes('Applied language filter')), 'No success log without a session');
  assert(logs.warning.some((message) => message.includes('no backup session')), 'Warning should explain the missing session');
}

function testFilterLanguagesRecordsSkippedSymlink(tmpRoot) {
  const installDir = path.join(tmpRoot, 'filter-symlink');
  createSkillsTree(installDir, ['python']);
  const skillsDir = path.join(installDir, 'skills');
  const targetDir = path.join(tmpRoot, 'symlink-target');
  createDir(targetDir);

  let linked = false;
  try {
    fs.symlinkSync(targetDir, path.join(skillsDir, 'rust'), 'junction');
    linked = true;
  } catch {
    // Symlink creation can require elevation; the rest of the suite still runs.
  }
  if (!linked) {
    console.log('  (skipped symlink assertion: cannot create symlink/junction on this platform)');
    return;
  }

  const { logs, logFns } = createLogCapture();
  const session = createMockBackupSession();
  const result = filterLanguages(installDir, 'python', logFns, {
    backupSession: session,
    relativeBase: installDir,
  });

  assert(result.skipped.includes('rust'), 'Symlinked language dir should be recorded as skipped');
  assert(result.removed.length === 0, 'Symlinked language dir should not be removed');
  assert(!logs.success.some((message) => message.includes('Applied language filter')), 'No success log when a dir is skipped');
  assert(logs.warning.some((message) => message.includes('symlinked')), 'Warning should mention the symlink skip');
}

// C-5: a file already captured earlier in the session (dedupe) must still count
// as a complete backup, so the pruned directory is not falsely kept.
function testFilterLanguagesDedupeCountsAsCompleteBackup(tmpRoot) {
  const installDir = path.join(tmpRoot, 'filter-dedupe');
  createSkillsTree(installDir, ['python', 'rust', 'docs-validation']);
  const { logs, logFns } = createLogCapture();
  const session = createMockBackupSession({
    preseedPaths: [path.join('skills', 'rust', 'SKILL.md')],
  });

  const result = filterLanguages(installDir, 'python', logFns, {
    backupSession: session,
    relativeBase: installDir,
  });

  assert(result.removed.includes('rust'), 'Deduped backup should count as complete and be removed');
  assert(result.failed.length === 0, 'Deduped backup should not be reported as a failure');
  assert(!fs.existsSync(path.join(installDir, 'skills', 'rust')), 'Deduped directory should be pruned');
  assert(logs.success.some((message) => message.includes('Applied language filter')), 'Dedupe path should log success');
}

// C3: with relativeBase omitted the session derives its own key; the dedupe
// probe must use that same key so an already-captured file is not mis-counted
// as a failed backup (which would falsely keep the pruned directory).
function testFilterLanguagesDedupeWithoutRelativeBase(tmpRoot) {
  const installDir = path.join(tmpRoot, 'filter-dedupe-nobase');
  createSkillsTree(installDir, ['python', 'rust', 'docs-validation']);
  const { logs, logFns } = createLogCapture();
  const skillFile = path.join(installDir, 'skills', 'rust', 'SKILL.md');
  // With relativeBase omitted the mock session keys entries by absolute path.
  const session = createMockBackupSession({ preseedPaths: [skillFile] });

  const result = filterLanguages(installDir, 'python', logFns, {
    backupSession: session,
  });

  assert(result.removed.includes('rust'), 'Deduped backup without relativeBase should count as complete');
  assert(result.failed.length === 0, 'Deduped backup without relativeBase should not be reported as a failure');
  assert(!fs.existsSync(path.join(installDir, 'skills', 'rust')), 'Deduped directory should be pruned without relativeBase');
  assert(logs.success.some((message) => message.includes('Applied language filter')), 'Dedupe without relativeBase should log success');
}

// S-7: backup keys that escape the backup directory must be rejected.
function testIsUnsafeBackupKeyRejectsEscapes() {
  assert(isUnsafeBackupKey('..'), 'A bare parent segment must be rejected');
  assert(isUnsafeBackupKey(path.join('skills', '..', '..', 'etc', 'passwd')), 'Embedded traversal must be rejected');
  assert(isUnsafeBackupKey('skills\\..\\x'), 'Windows traversal must be rejected');
  assert(isUnsafeBackupKey('/etc/passwd'), 'POSIX absolute path must be rejected');
  assert(isUnsafeBackupKey('C:\\Windows\\system32'), 'Windows drive-absolute path must be rejected');
  assert(isUnsafeBackupKey('//server/share/file'), 'UNC/server path must be rejected');
  assert(isUnsafeBackupKey(''), 'An empty key must be rejected');
  assert(isUnsafeBackupKey('C:foo'), 'Windows drive-relative path must be rejected');
  assert(isUnsafeBackupKey('.. '), 'A parent segment with a trailing space must be rejected');
  assert(isUnsafeBackupKey('skills/.. '), 'An embedded parent segment with a trailing space must be rejected');
  assert(!isUnsafeBackupKey('AGENTS.md'), 'A simple relative path must be allowed');
  assert(
    !isUnsafeBackupKey(path.join('.opencode', 'skills', 'rust', 'SKILL.md')),
    'A nested relative path must be allowed'
  );
}

function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-installer-'));

  try {
    console.log('Running installer lifecycle tests...');

    testNoopUninstallDoesNotBackupAgents(tmpRoot);
    testProjectInstallAndUninstall(tmpRoot);
    testConfigMergePreservesUserData(tmpRoot);
    testFreshConfigContainsOnlyManagedKeys(tmpRoot);
    testManifestlessUninstallRemovesCreatedConfig(tmpRoot);
    testUninstallRevertsInstallerPluginEntries(tmpRoot);
    testSkillClassificationCoversShippedSkills();
    testLanguagesFilterFullPartition(tmpRoot);
    testLanguagesFilterCicdAlias(tmpRoot);
    testLanguagesFilterIdempotent(tmpRoot);
    testLanguagesFilterBacksUpPrunedSkills(tmpRoot);
    testLanguagesFilterUnknownKeepsAllSkills(tmpRoot);
    testFilterLanguagesReportsCleanSuccess(tmpRoot);
    testFilterLanguagesFailsClosedOnIncompleteBackup(tmpRoot);
    testFilterLanguagesFailsClosedWithoutBackupSession(tmpRoot);
    testFilterLanguagesRecordsSkippedSymlink(tmpRoot);
    testFilterLanguagesDedupeCountsAsCompleteBackup(tmpRoot);
    testFilterLanguagesDedupeWithoutRelativeBase(tmpRoot);
    testIsUnsafeBackupKeyRejectsEscapes();
    testGlobalAndProjectLifecycle(tmpRoot);

    console.log('✅ Installer lifecycle tests passed');
  } catch (err) {
    console.error('❌ Installer lifecycle tests failed');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

main();
