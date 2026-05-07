#!/usr/bin/env node
'use strict';

/**
 * Plugin Entry Validation Tests
 * Verifies the OpenCode /plugin install path is correctly wired:
 * - package.json has required plugin fields
 * - plugin-entry.ts exports the expected symbol
 * - opencode.json registers the plugin
 * - npm pack produces the correct package structure
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const repoRoot = process.cwd();
const pkgPath = path.join(repoRoot, 'package.json');
const opencodeCfgPath = path.join(repoRoot, 'opencode.json');
const pluginEntryPath = path.join(repoRoot, 'plugin-entry.ts');
const pluginImplPath = path.join(repoRoot, '.opencode', 'plugins', 'agents-opencode.ts');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message}`);
  }
}

function assertEq(actual, expected, message) {
  assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ─── package.json ──────────────────────────────────────────────

console.log('\n📦 package.json');

const pkg = readJson(pkgPath);

assertEq(pkg.name, 'agents-opencode', 'package name is agents-opencode');
assertEq(pkg.version, '2.0.0', 'version is 2.0.0');
assert(typeof pkg.main === 'string', 'main field is present');
assert(pkg.main.endsWith('plugin-entry.ts'), 'main points to plugin-entry.ts');
assert(typeof pkg.exports === 'string', 'exports field is present');
assert(pkg.exports.endsWith('plugin-entry.ts'), 'exports points to plugin-entry.ts');
assert(typeof pkg.bin === 'object', 'bin field is present');
assertEq(pkg.bin['agents-opencode'], 'install.js', 'bin points to install.js');
assert(Array.isArray(pkg.files), 'files is an array');
assert(pkg.files.includes('plugin-entry.ts'), 'files includes plugin-entry.ts');
assert(pkg.files.includes('.opencode'), 'files includes .opencode/');
assert(typeof pkg.dependencies === 'object', 'dependencies field is present');
assert(
  pkg.dependencies['@opencode-ai/plugin'] === '1.14.39',
  '@opencode-ai/plugin is pinned at 1.14.39'
);

// ─── opencode.json ─────────────────────────────────────────────

console.log('\n⚙️  opencode.json');

const cfg = readJson(opencodeCfgPath);

assert(Array.isArray(cfg.plugin), 'plugin field is an array');
assert(cfg.plugin.includes('agents-opencode'), 'plugin includes agents-opencode');
assert(typeof cfg.permission === 'object', 'permission field is present');
assertEq(cfg.permission.external_directory, 'deny', 'external_directory is denied');
assertEq(cfg.permission.doom_loop, 'deny', 'doom_loop is denied');

// ─── plugin-entry.ts ───────────────────────────────────────────

console.log('\n🔌 plugin-entry.ts');

assert(fs.existsSync(pluginEntryPath), 'plugin-entry.ts exists');

const entryContent = fs.readFileSync(pluginEntryPath, 'utf8');
assert(
  entryContent.includes('AgentsOpencodePlugin'),
  'exports AgentsOpencodePlugin symbol'
);
assert(
  entryContent.includes('./.opencode/plugins/agents-opencode'),
  'imports from the correct plugin path'
);

// ─── plugin implementation ─────────────────────────────────────

console.log('\n🧩 .opencode/plugins/agents-opencode.ts');

assert(fs.existsSync(pluginImplPath), 'plugin implementation exists');

const implContent = fs.readFileSync(pluginImplPath, 'utf8');
assert(
  implContent.includes('export const AgentsOpencodePlugin'),
  'exports AgentsOpencodePlugin'
);
assert(
  implContent.includes('@opencode-ai/plugin'),
  'imports from @opencode-ai/plugin'
);
assert(
  implContent.includes('experimental.session.compacting'),
  'implements compaction hook'
);
assert(
  implContent.includes('tool.execute.before'),
  'implements tool safety hook'
);
assert(
  implContent.includes('shell.env'),
  'implements shell env hook'
);
assert(
  implContent.includes('PACKAGE_VERSION = "2.0.0"'),
  'version constant is 2.0.0'
);

// ─── npm pack integrity ────────────────────────────────────────

console.log('\n📦 npm pack');

try {
  execFileSync('npm', ['--version'], { encoding: 'utf8' });
  const result = execFileSync('npm', ['pack', '--dry-run'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert(
    result.includes('plugin-entry.ts'),
    'npm pack includes plugin-entry.ts'
  );
  assert(
    result.includes('install.js'),
    'npm pack includes install.js'
  );
  assert(
    result.includes('.opencode/'),
    'npm pack includes .opencode/ directory'
  );
  assert(
    result.includes('opencode.json'),
    'npm pack includes opencode.json'
  );
  assert(
    !result.includes('scripts/'),
    'npm pack excludes scripts/ directory'
  );
} catch (err) {
  if (err.message && err.message.includes('ENOENT')) {
    console.log('  ⏭️  npm not available — skipping pack integrity test');
  } else {
    assert(false, `npm pack failed: ${err.message}`);
  }
}

// ─── install.js plugin registration ────────────────────────────

console.log('\n📋 plugin registration via install.js');

const installContent = fs.readFileSync(path.join(repoRoot, 'install.js'), 'utf8');
assert(
  installContent.includes('agents-opencode'),
  'install.js references agents-opencode package name'
);

// Plugin merge logic lives in config-mutator.js (post-modularization)
const configMutatorPath = path.join(repoRoot, 'scripts', 'lib', 'config-mutator.js');
const configContent = fs.readFileSync(configMutatorPath, 'utf8');
assert(
  configContent.includes('addedPluginEntries'),
  'config-mutator.js has plugin array merge logic'
);
assert(
  configContent.includes('existing.plugin'),
  'config-mutator.js merges with existing plugin entries'
);

// ─── results ───────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n❌ Plugin entry validation failed');
  process.exit(1);
}

console.log('✅ Plugin entry validation passed');
process.exit(0);
