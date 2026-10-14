'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const MANIFEST_FILE = '.agents-opencode-manifest.json';
const VERSION_FILE = '.opencode-agents-version';
const AGENT_DIR = 'agents';

function getHomeDir() {
  return os.homedir();
}

function getLegacyGlobalConfigDir() {
  return path.join(getHomeDir(), '.config', 'opencode');
}

function getGlobalConfigDir() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  // Per the XDG Base Directory spec, an empty or relative value is ignored.
  if (xdgConfigHome && path.isAbsolute(xdgConfigHome)) {
    return path.join(xdgConfigHome, 'opencode');
  }
  return getLegacyGlobalConfigDir();
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

function resolveAgentDirectory(opencodeDir) {
  const agentDir = path.join(opencodeDir, AGENT_DIR);
  if (fs.existsSync(agentDir)) {
    return agentDir;
  }
  return null;
}

module.exports = {
  AGENT_DIR,
  MANIFEST_FILE,
  getGlobalConfigDir,
  getLegacyGlobalConfigDir,
  getScopePaths,
  toManagedPath,
  resolveAgentDirectory,
};
