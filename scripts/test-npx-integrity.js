#!/usr/bin/env node
'use strict';

/**
 * NPM Package Integrity Test
 * Verifies that all require() paths in install.js resolve from the npm package root,
 * ensuring npx installations work without MODULE_NOT_FOUND errors.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const installPath = path.join(repoRoot, 'install.js');
const pkgPath = path.join(repoRoot, 'package.json');

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

// Check that all files listed in "files" exist
console.log('\n📦 Package files exist');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

for (const entry of pkg.files) {
  const fullPath = path.join(repoRoot, entry);
  const exists = fs.existsSync(fullPath);
  assert(exists, `"${entry}" exists in package`);
}

// Check that all relative require() calls in install.js resolve
console.log('\n🔌 install.js require resolution');
const installContent = fs.readFileSync(installPath, 'utf8');
const requirePattern = /require\(['"](\.\/[^'"]+)['"]\)/g;
let match;

while ((match = requirePattern.exec(installContent)) !== null) {
  const reqPath = match[1];
  const resolved = path.join(repoRoot, reqPath);
  if (!path.extname(resolved)) {
    // Check both .js and directory/index.js
    const existsJs = fs.existsSync(resolved + '.js');
    const existsDir = fs.existsSync(path.join(resolved, 'index.js'));
    assert(existsJs || existsDir, `require('${reqPath}') resolves`);
  } else {
    assert(fs.existsSync(resolved), `require('${reqPath}') resolves`);
  }
}

// Results
console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n❌ Package integrity check failed');
  process.exit(1);
}

console.log('✅ Package integrity check passed — npx will work');
process.exit(0);
