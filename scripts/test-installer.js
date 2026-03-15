#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = process.cwd();
const installScript = path.join(repoRoot, 'install.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
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

function listAgentsBackups(projectDir) {
  if (!fs.existsSync(projectDir)) return [];
  return fs.readdirSync(projectDir).filter((name) => /^AGENTS\..+\.bk\.md$/.test(name));
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
  assert(listAgentsBackups(projectDir).length === 0, 'No AGENTS backup should be created for no-op uninstall');
}

function testProjectInstallAndUninstall(tmpRoot) {
  const projectDir = path.join(tmpRoot, 'project-install');
  createDir(projectDir);
  fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), '# active session\n');

  runInstaller(['--project', '.'], { cwd: projectDir });

  const manifestPath = path.join(projectDir, '.opencode', '.agents-opencode-manifest.json');
  assert(fs.existsSync(manifestPath), 'Project manifest should exist after install');

  runInstaller(['--uninstall', '--project', '.'], { cwd: projectDir });

  assert(!fs.existsSync(manifestPath), 'Project manifest should be removed after uninstall');
  assert(!fs.existsSync(path.join(projectDir, 'AGENTS.md')), 'AGENTS.md should be renamed to backup on real uninstall');
  assert(listAgentsBackups(projectDir).length >= 1, 'AGENTS backup should be created on real uninstall');
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

function testGlobalAndProjectLifecycle(tmpRoot) {
  const homeDir = path.join(tmpRoot, 'home');
  const projectDir = path.join(tmpRoot, 'both-scopes');
  createDir(homeDir);
  createDir(projectDir);

  const env = { HOME: homeDir };
  const globalManifest = path.join(homeDir, '.config', 'opencode', '.agents-opencode-manifest.json');
  const projectManifest = path.join(projectDir, '.opencode', '.agents-opencode-manifest.json');

  runInstaller(['--global'], { cwd: projectDir, env });
  runInstaller(['--project', '.'], { cwd: projectDir, env });

  assert(fs.existsSync(globalManifest), 'Global manifest should exist after global install');
  assert(fs.existsSync(projectManifest), 'Project manifest should exist after project install');

  runInstaller(['--update'], { cwd: projectDir, env });
  runInstaller(['--uninstall', '--all'], { cwd: projectDir, env });

  assert(!fs.existsSync(globalManifest), 'Global manifest should be removed after uninstall --all');
  assert(!fs.existsSync(projectManifest), 'Project manifest should be removed after uninstall --all');
}

function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-opencode-installer-'));

  try {
    console.log('Running installer lifecycle tests...');

    testNoopUninstallDoesNotBackupAgents(tmpRoot);
    testProjectInstallAndUninstall(tmpRoot);
    testConfigMergePreservesUserData(tmpRoot);
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
