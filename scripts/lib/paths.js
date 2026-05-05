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

function getGlobalConfigDir() {
  return path.join(getHomeDir(), '.config', 'opencode');
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
  MANIFEST_FILE,
  VERSION_FILE,
  AGENT_DIR,
  getHomeDir,
  getGlobalConfigDir,
  getScopePaths,
  toManagedPath,
  resolveAgentDirectory,
};
