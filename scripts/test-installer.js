#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { LANGUAGE_MAP, LANGUAGE_SKILL_DIRS, NON_LANGUAGE_SKILLS, filterLanguages, isUnsafeBackupKey } = require('./lib/file-ops.js');
const configMutator = require('./lib/config-mutator.js');
const opencodeTarget = require('./lib/opencode-target.js');

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
  // Spawn node by absolute path so tests that deliberately restrict the child
  // PATH (to hide an ambient `opencode`) can still launch the installer.
  // Default the host-version override so no test depends on an ambient
  // `opencode` binary; individual tests override or clear it explicitly.
  const result = execFileSync(process.execPath, [installScript, ...args], {
    cwd: options.cwd || repoRoot,
    env: { ...process.env, AGENTS_OPENCODE_HOST_VERSION: '1.19.0', ...(options.env || {}) },
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
  assert(!('plugin' in config), 'Fresh config should not register a plugin entry (the local plugin auto-loads)');
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
    // Pin XDG so this test is hermetic: CI runners set XDG_CONFIG_HOME, which
    // would otherwise move the global install off ~/.config/opencode and break
    // the assertions below. Empty is treated as unset (legacy path).
    XDG_CONFIG_HOME: '',
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

function testInstallerPreservesUserPluginEntries(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'config-plugin-preserve');
  createDir(projectDir);

  const configPath = path.join(projectDir, 'opencode.json');
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    plugin: ['my-own-plugin'],
    permission: { bash: 'ask' },
  });

  runInstaller(['--project', '.'], { cwd: projectDir });

  const installed = readJson(configPath);
  const installedPlugins = Array.isArray(installed.plugin) ? installed.plugin : [];
  assert(installedPlugins.includes('my-own-plugin'), 'User plugin entry should be preserved on install');
  assert(!installedPlugins.includes('agents-opencode'), 'Installer should not add a plugin entry (local plugin auto-loads)');

  runInstaller(['--uninstall', '--project', '.'], { cwd: projectDir });

  const reverted = readJson(configPath);
  const revertedPlugins = Array.isArray(reverted.plugin) ? reverted.plugin : [];
  assert(revertedPlugins.includes('my-own-plugin'), 'User plugin entry should remain after uninstall');
}

function testUninstallRevertsLegacyInstallerPluginEntry(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'legacy-plugin-revert');
  createDir(projectDir);

  const configPath = path.join(projectDir, 'opencode.json');
  const manifestPath = path.join(projectDir, '.opencode', '.agents-opencode-manifest.json');

  // Pre-existing user config → the installer does not own the file.
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    permission: { bash: 'ask' },
  });

  runInstaller(['--project', '.'], { cwd: projectDir });

  // Simulate a legacy install (pre-retirement) that recorded the plugin entry.
  const legacyConfig = readJson(configPath);
  legacyConfig.plugin = ['agents-opencode', 'my-own-plugin'];
  writeJson(configPath, legacyConfig);

  const legacyManifest = readJson(manifestPath);
  legacyManifest.configPatch = Object.assign({}, legacyManifest.configPatch, {
    addedPluginEntries: ['agents-opencode'],
  });
  writeJson(manifestPath, legacyManifest);

  runInstaller(['--uninstall', '--project', '.'], { cwd: projectDir });

  const reverted = readJson(configPath);
  const plugins = Array.isArray(reverted.plugin) ? reverted.plugin : [];
  assert(!plugins.includes('agents-opencode'), 'Legacy installer plugin entry should be reverted on uninstall');
  assert(plugins.includes('my-own-plugin'), 'User plugin entry should remain after legacy uninstall');
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

// --- Workstream A Phase 2: dual-target (v1/v2) config emission ---

function testDualTargetConfig(tmpRoot) {
  const v2Dir = path.join(tmpRoot, 'target-v2');
  createDir(v2Dir);

  runInstaller(['--project', '.', '--target', 'v2'], { cwd: v2Dir });

  const v2Config = readJson(path.join(v2Dir, 'opencode.json'));
  assert(!('plugin' in v2Config), 'v2 install must not write the v1 plugin key');
  assert(!('permission' in v2Config), 'v2 install must not write the v1 permission key');
  assert(Array.isArray(v2Config.permissions), 'v2 install should write a v2 permissions array');
  assert(!('plugin' in v2Config && 'plugins' in v2Config), 'must not co-write plugin and plugins');
  assert(!('permission' in v2Config && 'permissions' in v2Config), 'must not co-write permission and permissions');
  for (const key of Object.keys(v2Config)) {
    assert(['$schema', 'plugins', 'permissions'].includes(key), `v2 config must not contain unexpected key '${key}'`);
  }

  const v2Manifest = readJson(path.join(v2Dir, '.opencode', '.agents-opencode-manifest.json'));
  assert(v2Manifest.target === 'v2', 'manifest should record resolved target v2');

  runInstaller(['--uninstall', '--project', '.'], { cwd: v2Dir });
  assert(!fs.existsSync(path.join(v2Dir, 'opencode.json')), 'installer-created v2 config should be removed on uninstall');

  const v1Dir = path.join(tmpRoot, 'target-v1');
  createDir(v1Dir);
  runInstaller(['--project', '.', '--target', 'v1'], { cwd: v1Dir });

  const v1Config = readJson(path.join(v1Dir, 'opencode.json'));
  assert(v1Config.permission && v1Config.permission.doom_loop === 'deny', 'v1 install keeps the permission object');
  assert(!('permissions' in v1Config), 'v1 install must not write permissions');
  assert(!('plugins' in v1Config), 'v1 install must not write plugins');
}

function testTargetAutoDefaultsToV1(tmpRoot) {
  const dir = path.join(tmpRoot, 'target-auto');
  const homeDir = path.join(tmpRoot, 'target-auto-home');
  createDir(dir);
  createDir(homeDir);

  // Pin the detected host so this assertion never depends on an ambient
  // `opencode` binary (the detection override is the hermetic escape hatch).
  runInstaller(['--project', '.', '--target', 'auto'], {
    cwd: dir,
    env: { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: '', AGENTS_OPENCODE_HOST_VERSION: '1.19.0' },
  });

  const config = readJson(path.join(dir, 'opencode.json'));
  assert(config.permission && config.permission.doom_loop === 'deny', 'auto target should emit the v1 permission object for a v1 host');
  assert(!('permissions' in config), 'auto target should not emit v2 permissions for a v1 host');
}

// Auto detection: an override reporting a v2 host must select the v2 key set.
function testTargetAutoDetectsV2Host(tmpRoot) {
  const dir = path.join(tmpRoot, 'target-auto-v2');
  const homeDir = path.join(tmpRoot, 'target-auto-v2-home');
  createDir(dir);
  createDir(homeDir);

  const output = runInstaller(['--project', '.', '--target', 'auto'], {
    cwd: dir,
    env: { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: '', AGENTS_OPENCODE_HOST_VERSION: '2.0.4' },
  });

  const config = readJson(path.join(dir, 'opencode.json'));
  assert(Array.isArray(config.permissions), 'auto with a detected v2 host must emit the v2 permissions array');
  assert(!('permission' in config), 'auto with a detected v2 host must not emit the v1 permission key');
  for (const key of Object.keys(config)) {
    assert(['$schema', 'plugins', 'permissions'].includes(key), `v2 auto config must not contain unexpected key '${key}'`);
  }
  assert(output.includes('Detected OpenCode major 2'), 'install output should report the detected host major (not the raw version)');
}

// Auto fallback: with the override unset and no `opencode` on PATH (simulated by
// an empty PATH), detection fails and must not block the install; it stays v1.
function testTargetAutoFallsBackWhenHostMissing(tmpRoot) {
  const dir = path.join(tmpRoot, 'target-auto-fallback');
  const homeDir = path.join(tmpRoot, 'target-auto-fallback-home');
  const emptyPath = path.join(tmpRoot, 'target-auto-empty-path');
  createDir(dir);
  createDir(homeDir);
  createDir(emptyPath);

  const output = runInstaller(['--project', '.', '--target', 'auto'], {
    cwd: dir,
    env: {
      HOME: homeDir,
      USERPROFILE: homeDir,
      XDG_CONFIG_HOME: '',
      AGENTS_OPENCODE_HOST_VERSION: '',
      PATH: emptyPath,
    },
  });

  const config = readJson(path.join(dir, 'opencode.json'));
  assert(config.permission && config.permission.doom_loop === 'deny', 'auto without a detectable host must fall back to v1');
  assert(!('permissions' in config), 'auto fallback must not emit v2 permissions');
  assert(output.includes('OpenCode host not detected'), 'install output should report the host-not-detected fallback');
}

// Invariant: host detection must not run when the target is already known. An
// explicit --target and a manifest-recorded target must both skip the probe, so
// neither prints the "Detected OpenCode ..." info line.
function testTargetDetectionSkippedWhenTargetKnown(tmpRoot) {
  const explicitDir = path.join(tmpRoot, 'target-explicit-no-detect');
  const explicitHome = path.join(tmpRoot, 'target-explicit-no-detect-home');
  createDir(explicitDir);
  createDir(explicitHome);

  const explicitOutput = runInstaller(['--project', '.', '--target', 'v2'], {
    cwd: explicitDir,
    env: { HOME: explicitHome, USERPROFILE: explicitHome, XDG_CONFIG_HOME: '' },
  });
  assert(!explicitOutput.includes('Detected OpenCode'), 'an explicit --target must not run host detection');

  const recordedDir = path.join(tmpRoot, 'target-recorded-no-detect');
  const recordedHome = path.join(tmpRoot, 'target-recorded-no-detect-home');
  createDir(recordedDir);
  createDir(recordedHome);
  const env = { HOME: recordedHome, USERPROFILE: recordedHome, XDG_CONFIG_HOME: '' };

  runInstaller(['--project', '.', '--target', 'v2'], { cwd: recordedDir, env });
  const recordedOutput = runInstaller(['--project', '.', '--target', 'auto'], { cwd: recordedDir, env });
  assert(!recordedOutput.includes('Detected OpenCode'), 'a manifest-recorded target install must not run host detection');
}

function testV2InstallDoesNotCoWriteUserPermission(tmpRoot) {
  const dir = path.join(tmpRoot, 'target-v2-userperm');
  createDir(dir);

  const configPath = path.join(dir, 'opencode.json');
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    permission: { bash: 'ask' },
  });

  runInstaller(['--project', '.', '--target', 'v2'], { cwd: dir });

  const config = readJson(configPath);
  assert(!('permission' in config && 'permissions' in config), 'v2 install must not co-write permission and permissions');
  assert(config.permission && config.permission.bash === 'ask', 'user-owned v1 permission must be preserved');
  assert(!('permissions' in config), 'v2 install should defer to v2 auto-translation when the user owns the v1 permission key');
}

// M1 regression: stripping the other target's installer-shaped keys mutates the
// config in place, so it must mark the patch changed and persist the strip even
// when the merge adds no new permission/plugin entries. Otherwise an existing
// file can retain both the v1 and v2 key sets, violating the XOR invariant.
function testMergePersistsOtherTargetStrip(tmpRoot) {
  const dir = path.join(tmpRoot, 'target-strip-persist');
  createDir(dir);
  const configPath = path.join(dir, 'opencode.json');

  const sourceConfig = {
    $schema: 'https://opencode.ai/config.json',
    plugin: ['agents-opencode'],
    permission: {
      external_directory: 'ask',
      doom_loop: 'deny',
      bash: { '*': 'ask' },
    },
  };

  // The target (v1) keys are already present, so the merge adds nothing; the
  // other target (v2) keys are installer-shaped and must be stripped.
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    plugin: ['agents-opencode'],
    permission: {
      external_directory: 'ask',
      doom_loop: 'deny',
      bash: { '*': 'ask' },
    },
    plugins: ['agents-opencode'],
    permissions: opencodeTarget.emitConfig(sourceConfig, 'v2').permissions,
  });

  const patch = configMutator.mergeInstallerConfig(configPath, sourceConfig, () => {}, () => {}, 'v1');

  assert(patch.changed === true, 'Stripping the other target keys must mark the patch changed');
  assert(patch.addedPermissionKeys.length === 0, 'Merge should add no permission keys (all already present)');
  assert(patch.addedPluginEntries.length === 0, 'Merge should add no plugin entries (all already present)');

  const config = readJson(configPath);
  assert(!('permissions' in config), 'The other target permissions key must be stripped from disk');
  assert(!('plugins' in config), 'The other target plugins key must be stripped from disk');
  assert(!('permission' in config && 'permissions' in config), 'permission and permissions must never co-exist');
  assert(!('plugin' in config && 'plugins' in config), 'plugin and plugins must never co-exist');
  assert(config.permission && config.permission.doom_loop === 'deny', 'Target v1 permission must be preserved');
}

// C2/C6 (XOR): a user-owned v2 `permissions` array must NOT cause the installer to
// write a v1 `permission` object — the file must never carry both key sets. The
// merge skips (with a warning) and preserves the user's value.
function testV1TargetSkipsPermissionWhenUserOwnsV2Permissions(tmpRoot) {
  const dir = path.join(tmpRoot, 'target-v1-userpermissions');
  createDir(dir);
  const configPath = path.join(dir, 'opencode.json');
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    permissions: [{ action: 'shell', resource: '*', effect: 'ask' }],
  });

  runInstaller(['--project', '.', '--target', 'v1'], { cwd: dir });

  const config = readJson(configPath);
  assert(
    !('permission' in config),
    'v1 target must not write a permission object while a user-owned v2 permissions array is present'
  );
  assert(
    Array.isArray(config.permissions) && config.permissions.length === 1,
    'the user-owned v2 permissions array must be preserved'
  );
}

// C6: when the user owns the other target's permission key AND this target's key
// already exists, appending would leave permission + permissions co-existing.
// The guard must skip the append so the XOR invariant holds in both directions.
function testV2MergeSkipsWhenUserOwnsV1Permission(tmpRoot) {
  const dir = path.join(tmpRoot, 'target-v2-userperm-existing');
  createDir(dir);
  const configPath = path.join(dir, 'opencode.json');
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    permission: { bash: 'ask' },
    permissions: [],
  });

  runInstaller(['--project', '.', '--target', 'v2'], { cwd: dir });

  const config = readJson(configPath);
  assert(config.permission && config.permission.bash === 'ask', 'user-owned v1 permission must be preserved');
  assert(
    Array.isArray(config.permissions) && config.permissions.length === 0,
    'v2 merge must not append installer rules when the user owns the v1 permission object'
  );
}

// S3: a user's non-array `permissions` value must not be clobbered with [] plus
// installer rules; mirror the v1 guard (warn + skip).
function testV2MergeSkipsNonArrayPermissions(tmpRoot) {
  const dir = path.join(tmpRoot, 'target-v2-nonarray-permissions');
  createDir(dir);
  const configPath = path.join(dir, 'opencode.json');
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    permissions: 'not-an-array',
  });

  runInstaller(['--project', '.', '--target', 'v2'], { cwd: dir });

  const config = readJson(configPath);
  assert(config.permissions === 'not-an-array', 'v2 merge must not clobber a non-array permissions value');
}

// C5: uninstall must match installer v2 rules regardless of object key order.
function testUninstallRevertsReorderedV2PermissionRules(tmpRoot) {
  const dir = path.join(tmpRoot, 'v2-rule-reorder-revert');
  createDir(dir);
  const configPath = path.join(dir, 'opencode.json');

  // Pre-existing user config (kept file, so uninstall reverts rather than deletes).
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    provider: { anthropic: { options: { apiKey: '{env:ANTHROPIC_API_KEY}' } } },
  });

  runInstaller(['--project', '.', '--target', 'v2'], { cwd: dir });

  const installed = readJson(configPath);
  assert(
    Array.isArray(installed.permissions) && installed.permissions.length > 0,
    'v2 install should write installer permission rules'
  );

  // Reformat each rule with a different key order; values are unchanged.
  installed.permissions = installed.permissions.map((rule) => ({
    effect: rule.effect,
    resource: rule.resource,
    action: rule.action,
  }));
  writeJson(configPath, installed);

  runInstaller(['--uninstall', '--project', '.'], { cwd: dir });

  const reverted = readJson(configPath);
  assert(!('permissions' in reverted), 'uninstall must revert reordered-but-equal v2 permission rules');
  assert(reverted.provider && reverted.provider.anthropic, 'user config must remain after revert');
}

// C9: a retired installer plugin entry must be stripped from either plugin key
// during a cross-target switch (so a stale v1 entry cannot survive v1 -> v2).
function testTargetSwitchStripsRetiredPluginEntries(tmpRoot) {
  const dir = path.join(tmpRoot, 'v1-to-v2-retired-plugin');
  createDir(dir);
  const configPath = path.join(dir, 'opencode.json');
  writeJson(configPath, {
    $schema: 'https://opencode.ai/config.json',
    plugin: ['agents-opencode', 'my-own-plugin'],
  });

  runInstaller(['--project', '.', '--target', 'v2'], { cwd: dir });

  const config = readJson(configPath);
  const plugins = Array.isArray(config.plugin) ? config.plugin : [];
  assert(!plugins.includes('agents-opencode'), 'retired installer plugin entry must be stripped from the v1 plugin key on a v1->v2 switch');
  assert(plugins.includes('my-own-plugin'), 'user plugin entries must survive the retired-entry strip');
  assert(!('plugin' in config && 'plugins' in config), 'plugin and plugins must never co-exist');
}

// F1 (data-loss regression): a v2 install must not remove user-owned v1-only
// settings. `subagent_depth` / `compaction.prune` are never written by the
// installer, and the documented happy path (customization.md) tells users to
// set exactly the pack-recommended values — so value-equality can never prove
// installer authorship and nothing may be stripped. Before the fix, a v2
// install silently deleted these values (disabling nested delegation under v1).
function testV2InstallPreservesUserLegacySettings(tmpRoot) {
  const legacySeed = () => ({
    $schema: 'https://opencode.ai/config.json',
    subagent_depth: 2,
    compaction: { prune: true, auto: true },
    share: 'manual',
    watcher: { ignore: ['custom/**'] },
  });

  const v2Dir = path.join(tmpRoot, 'v2-preserve-legacy');
  createDir(v2Dir);
  writeJson(path.join(v2Dir, 'opencode.json'), legacySeed());
  runInstaller(['--project', '.', '--target', 'v2'], { cwd: v2Dir });

  const v2Config = readJson(path.join(v2Dir, 'opencode.json'));
  assert(v2Config.subagent_depth === 2, 'v2 install must leave user subagent_depth untouched');
  assert(
    v2Config.compaction && v2Config.compaction.prune === true && v2Config.compaction.auto === true,
    'v2 install must leave user compaction values untouched'
  );
  assert(v2Config.share === 'manual', 'user share value must survive a v2 install');
  assert(
    v2Config.watcher && Array.isArray(v2Config.watcher.ignore) && v2Config.watcher.ignore.join(',') === 'custom/**',
    'user watcher value must survive a v2 install'
  );

  const v1Dir = path.join(tmpRoot, 'v1-preserve-legacy');
  createDir(v1Dir);
  writeJson(path.join(v1Dir, 'opencode.json'), legacySeed());
  runInstaller(['--project', '.', '--target', 'v1'], { cwd: v1Dir });

  const v1Config = readJson(path.join(v1Dir, 'opencode.json'));
  assert(v1Config.subagent_depth === 2, 'v1 install must retain subagent_depth (v1 path unchanged)');
  assert(
    v1Config.compaction && v1Config.compaction.prune === true,
    'v1 install must retain compaction.prune (v1 path unchanged)'
  );
}

// C8: the split-brain warning must also fire when BOTH global dirs have an
// install (the most misleading case), not only when exactly one does.
function testGlobalBothInstallsWarning(tmpRoot) {
  const homeDir = path.join(tmpRoot, 'both-home');
  const xdgDir = path.join(tmpRoot, 'both-xdg');
  const projectDir = path.join(tmpRoot, 'both-project');
  createDir(homeDir);
  createDir(xdgDir);
  createDir(projectDir);

  const legacyDir = path.join(homeDir, '.config', 'opencode');
  const resolvedDir = path.join(xdgDir, 'opencode');
  createDir(legacyDir);
  createDir(resolvedDir);
  fs.writeFileSync(path.join(legacyDir, '.agents-opencode-manifest.json'), '{"package":"agents-opencode"}\n');
  fs.writeFileSync(path.join(resolvedDir, '.agents-opencode-manifest.json'), '{"package":"agents-opencode"}\n');

  const env = { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: xdgDir };
  const output = runInstaller(['--status'], { cwd: projectDir, env });

  assert(output.includes(resolvedDir) && output.includes(legacyDir), 'Both-installs warning must name both paths');
  assert(output.includes('BOTH the active path'), 'Both-installs warning must call out that installs exist at both paths');
  assert(output.includes('move the stale directory aside'), 'Real-directory cleanup advice must not tell the user to delete the directory');
  assert(output.includes("'--uninstall --global'"), 'Real-directory cleanup advice must point at the supported uninstall path');
  assert(!output.includes('remove the old files'), 'Real-directory cleanup advice must not revive the delete instruction');
}

// A legacy path that symlinks to the active XDG dir is the same physical install:
// warning there would tell the user to delete the active install through the link.
function testGlobalSymlinkedLegacyIsNotASplit(tmpRoot) {
  const homeDir = path.join(tmpRoot, 'link-home');
  const xdgDir = path.join(tmpRoot, 'link-xdg');
  const projectDir = path.join(tmpRoot, 'link-project');
  const legacyDir = path.join(homeDir, '.config', 'opencode');
  const resolvedDir = path.join(xdgDir, 'opencode');
  createDir(projectDir);
  createDir(path.join(homeDir, '.config'));
  createDir(resolvedDir);
  fs.writeFileSync(path.join(resolvedDir, '.agents-opencode-manifest.json'), '{"package":"agents-opencode"}\n');

  try {
    fs.symlinkSync(resolvedDir, legacyDir, process.platform === 'win32' ? 'junction' : 'dir');
  } catch {
    console.log('  (skipped symlink assertion: cannot create symlink/junction on this platform)');
    return;
  }

  const env = { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: xdgDir };
  const output = runInstaller(['--status'], { cwd: projectDir, env });

  assert(output.includes(': installed'), 'The active install must still be detected (positive control)');
  assert(!output.includes('BOTH the active path'), 'A symlinked legacy dir must not be reported as a second install');
  assert(!output.includes('[WARNING]'), 'A symlinked legacy dir must not produce a warning');
}

// A legacy symlink to a DIFFERENT directory is a genuine split, but cleanup
// advice must remove the link, never the target's contents.
function testGlobalSymlinkedLegacyElsewhereWarnsSafely(tmpRoot) {
  const homeDir = path.join(tmpRoot, 'link-elsewhere-home');
  const xdgDir = path.join(tmpRoot, 'link-elsewhere-xdg');
  const projectDir = path.join(tmpRoot, 'link-elsewhere-project');
  const legacyDir = path.join(homeDir, '.config', 'opencode');
  const legacyTarget = path.join(tmpRoot, 'dotfiles-opencode');
  const resolvedDir = path.join(xdgDir, 'opencode');
  createDir(projectDir);
  createDir(path.join(homeDir, '.config'));
  createDir(resolvedDir);
  createDir(legacyTarget);
  fs.writeFileSync(path.join(resolvedDir, '.agents-opencode-manifest.json'), '{"package":"agents-opencode"}\n');
  fs.writeFileSync(path.join(legacyTarget, '.agents-opencode-manifest.json'), '{"package":"agents-opencode"}\n');

  try {
    fs.symlinkSync(legacyTarget, legacyDir, process.platform === 'win32' ? 'junction' : 'dir');
  } catch {
    console.log('  (skipped symlink assertion: cannot create symlink/junction on this platform)');
    return;
  }

  const env = { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: xdgDir };
  let output = runInstaller(['--status'], { cwd: projectDir, env });

  assert(output.includes('BOTH the active path'), 'A distinct legacy target must still report the split');
  assert(output.includes('remove the symlink itself'), 'Cleanup advice must remove the link, not follow it');
  assert(output.includes('no trailing slash'), 'Symlink advice must warn that a trailing slash follows the link');
  assert(output.includes(fs.realpathSync(legacyTarget)), 'Advice must name the symlink target');
  assert(!output.includes('remove the old files'), 'Cleanup advice must not tell the user to delete files through the link');

  // Legacy-only variant: the same advice must not follow the symlink.
  fs.rmSync(resolvedDir, { recursive: true, force: true });
  output = runInstaller(['--status'], { cwd: projectDir, env });
  assert(output.includes('A previous global install was found at the legacy path'), 'Legacy-only split must still warn');
  assert(output.includes('remove the symlink itself'), 'Legacy-only advice must remove the link, not follow it');
  assert(output.includes('no trailing slash'), 'Legacy-only advice must warn that a trailing slash follows the link');
  assert(fs.existsSync(path.join(legacyTarget, '.agents-opencode-manifest.json')), 'Warning must not remove anything itself');
}

// The XDG-only layout is the expected state: an active install and no legacy dir.
function testCleanXdgInstallHasNoWarning(tmpRoot) {
  const homeDir = path.join(tmpRoot, 'clean-xdg-home');
  const xdgDir = path.join(tmpRoot, 'clean-xdg-config');
  const projectDir = path.join(tmpRoot, 'clean-xdg-project');
  createDir(homeDir);
  createDir(xdgDir);
  createDir(projectDir);

  const env = { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: xdgDir };
  runInstaller(['--global'], { cwd: projectDir, env });
  // The second run sees the active install and previously warned about the
  // expected layout; the resolved-only case must now be silent.
  const output = runInstaller(['--global'], { cwd: projectDir, env });

  assert(!fs.existsSync(path.join(homeDir, '.config', 'opencode')), 'A clean XDG install must leave the legacy path absent');
  assert(!output.includes('[WARNING]'), 'The expected XDG-only layout must not warn');
  assert(!output.includes('this is expected'), 'Expected-layout wording must not be emitted');
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

// --- Global path resolution (XDG_CONFIG_HOME) ---

function testGlobalRespectsXdgConfigHome(tmpRoot) {
  const homeDir = path.join(tmpRoot, 'xdg-home');
  const xdgDir = path.join(tmpRoot, 'xdg-config');
  const projectDir = path.join(tmpRoot, 'xdg-project');
  createDir(homeDir);
  createDir(xdgDir);
  createDir(projectDir);

  const env = { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: xdgDir };
  runInstaller(['--global'], { cwd: projectDir, env });

  assert(
    fs.existsSync(path.join(xdgDir, 'opencode', '.agents-opencode-manifest.json')),
    'Global install should land under $XDG_CONFIG_HOME/opencode'
  );
  assert(
    !fs.existsSync(path.join(homeDir, '.config', 'opencode', '.agents-opencode-manifest.json')),
    'Global install must not land under ~/.config/opencode when XDG_CONFIG_HOME is set'
  );
}

function testGlobalFallsBackOnInvalidXdgConfigHome(tmpRoot) {
  const homeDir = path.join(tmpRoot, 'xdg-fallback-home');
  const projectDir = path.join(tmpRoot, 'xdg-fallback-project');
  createDir(homeDir);
  createDir(projectDir);

  const legacyManifest = path.join(homeDir, '.config', 'opencode', '.agents-opencode-manifest.json');

  // A relative value must be ignored per the XDG Base Directory spec.
  runInstaller(['--global'], {
    cwd: projectDir,
    env: { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: 'relative/config' },
  });
  assert(fs.existsSync(legacyManifest), 'A relative XDG_CONFIG_HOME must fall back to ~/.config/opencode');

  // An empty value must be treated as unset.
  fs.rmSync(path.join(homeDir, '.config'), { recursive: true, force: true });
  runInstaller(['--global'], {
    cwd: projectDir,
    env: { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: '' },
  });
  assert(fs.existsSync(legacyManifest), 'An empty XDG_CONFIG_HOME must fall back to ~/.config/opencode');
}

function testLegacyGlobalInstallWarning(tmpRoot) {
  const homeDir = path.join(tmpRoot, 'legacy-warn-home');
  const xdgDir = path.join(tmpRoot, 'legacy-warn-xdg');
  const projectDir = path.join(tmpRoot, 'legacy-warn-project');
  createDir(homeDir);
  createDir(xdgDir);
  createDir(projectDir);

  const legacyDir = path.join(homeDir, '.config', 'opencode');
  createDir(legacyDir);
  fs.writeFileSync(path.join(legacyDir, '.agents-opencode-manifest.json'), '{"package":"agents-opencode"}\n');

  const env = { HOME: homeDir, USERPROFILE: homeDir, XDG_CONFIG_HOME: xdgDir };
  const output = runInstaller(['--global'], { cwd: projectDir, env });

  assert(output.includes(legacyDir), 'Warning should name the legacy install location');
  assert(output.includes('will NOT see'), 'Warning should state OpenCode will not see the legacy install');
  assert(output.includes('move the stale directory aside'), 'Real-directory cleanup advice must not tell the user to delete the directory');
  assert(output.includes("'--uninstall --global'"), 'Legacy-only cleanup advice must point at the supported uninstall path');
  assert(!output.includes('remove the old files'), 'Real-directory cleanup advice must not revive the delete instruction');
  assert(
    fs.existsSync(path.join(xdgDir, 'opencode', '.agents-opencode-manifest.json')),
    'Split-brain warning must not stop the install from reaching the active path'
  );

  // The warning must not fire when XDG_CONFIG_HOME is unset (resolved === legacy).
  const plainHome = path.join(tmpRoot, 'legacy-warn-plain');
  createDir(plainHome);
  const plainOutput = runInstaller(['--global'], {
    cwd: projectDir,
    env: { HOME: plainHome, USERPROFILE: plainHome, XDG_CONFIG_HOME: '' },
  });
  assert(!plainOutput.includes('will NOT see'), 'No legacy warning when the resolved and legacy dirs coincide');
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
    testInstallerPreservesUserPluginEntries(tmpRoot);
    testUninstallRevertsLegacyInstallerPluginEntry(tmpRoot);
    testDualTargetConfig(tmpRoot);
    testTargetAutoDefaultsToV1(tmpRoot);
    testTargetAutoDetectsV2Host(tmpRoot);
    testTargetAutoFallsBackWhenHostMissing(tmpRoot);
    testTargetDetectionSkippedWhenTargetKnown(tmpRoot);
    testV2InstallDoesNotCoWriteUserPermission(tmpRoot);
    testMergePersistsOtherTargetStrip(tmpRoot);
    testV1TargetSkipsPermissionWhenUserOwnsV2Permissions(tmpRoot);
    testV2MergeSkipsWhenUserOwnsV1Permission(tmpRoot);
    testV2MergeSkipsNonArrayPermissions(tmpRoot);
    testUninstallRevertsReorderedV2PermissionRules(tmpRoot);
    testTargetSwitchStripsRetiredPluginEntries(tmpRoot);
    testV2InstallPreservesUserLegacySettings(tmpRoot);
    testGlobalBothInstallsWarning(tmpRoot);
    testGlobalSymlinkedLegacyIsNotASplit(tmpRoot);
    testGlobalSymlinkedLegacyElsewhereWarnsSafely(tmpRoot);
    testCleanXdgInstallHasNoWarning(tmpRoot);
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
    testGlobalRespectsXdgConfigHome(tmpRoot);
    testGlobalFallsBackOnInvalidXdgConfigHome(tmpRoot);
    testLegacyGlobalInstallWarning(tmpRoot);

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
