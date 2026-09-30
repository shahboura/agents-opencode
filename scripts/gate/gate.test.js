#!/usr/bin/env node
'use strict';

/**
 * Tests for the versioned Pre-Commit Review Gate:
 * pure marker/hash helpers plus an end-to-end hook decision in a temp repo.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lib = require('./lib.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    cwd: options.cwd || process.cwd(),
    env: options.env || process.env,
    encoding: 'utf8',
  });
}

function runNode(scriptPath, args, cwd, env) {
  return run(process.execPath, [scriptPath, ...args], { cwd, env });
}

function baseEnv() {
  const env = { ...process.env };
  delete env.SKIP_GATE;
  return env;
}

function testPureHelpers() {
  const hash = 'abc123';
  assert(lib.isPassVerdict('PASS'), 'PASS should be a passing verdict');
  assert(lib.isPassVerdict('PASS-WITH-CAVEATS'), 'PASS-WITH-CAVEATS should be a passing verdict');
  assert(!lib.isPassVerdict('FAIL'), 'FAIL should not be a passing verdict');
  assert(!lib.isPassVerdict(undefined), 'Undefined should not be a passing verdict');

  assert(!lib.evaluateMarker(null, hash).allowed, 'No marker should block');
  assert(!lib.evaluateMarker({ verdict: 'FAIL', stagedHash: hash }, hash).allowed, 'FAIL marker should block');
  assert(!lib.evaluateMarker({ verdict: 'PASS' }, hash).allowed, 'Missing stagedHash should block');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: 'other' }, hash).allowed, 'Mismatched hash should block');
  assert(lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash).allowed, 'Matching PASS should allow');
  assert(lib.evaluateMarker({ verdict: 'PASS-WITH-CAVEATS', stagedHash: hash }, hash).allowed, 'Matching caveats should allow');

  assert(lib.isSkipGate({ SKIP_GATE: '1' }), 'SKIP_GATE=1 should be honored');
  assert(!lib.isSkipGate({ SKIP_GATE: '0' }), 'SKIP_GATE=0 should not be honored');
  assert(!lib.isSkipGate({}), 'Absent SKIP_GATE should not be honored');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-marker-'));
  try {
    const markerPath = path.join(tmp, 'pass.json');
    assert(lib.consumeMarker(markerPath) === false, 'Consuming a missing marker is a no-op');
    fs.writeFileSync(markerPath, '{"verdict":"PASS"}');
    assert(lib.consumeMarker(markerPath) === true, 'Consuming an existing marker succeeds');
    assert(!fs.existsSync(markerPath), 'Consumed marker should be removed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function initRepo(dir) {
  assert(run('git', ['init', '-q'], { cwd: dir }).status === 0, 'git init should succeed');
  run('git', ['config', 'user.email', 'gate@example.com'], { cwd: dir });
  run('git', ['config', 'user.name', 'Gate Test'], { cwd: dir });
}

function testStagedHashTracksIndex() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-hash-'));
  try {
    initRepo(tmp);
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'one\n');
    run('git', ['add', 'a.txt'], { cwd: tmp });
    const first = lib.computeStagedHash(tmp);
    fs.writeFileSync(path.join(tmp, 'b.txt'), 'two\n');
    run('git', ['add', 'b.txt'], { cwd: tmp });
    const second = lib.computeStagedHash(tmp);
    assert(first && second, 'Staged hash should be non-empty');
    assert(first !== second, 'Staged hash should change when the index changes');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// The gate is inert on POSIX unless the hook carries the executable bit. Assert
// the *index* mode (authoritative regardless of pending staged changes) so a
// future edit cannot silently drop it and ship a 100644 regression. The only
// escape is an explicit GATE_BOOTSTRAP=1 opt-in for the bootstrap commit that
// introduces the hook before `gate:install` can run.
function testHookFileIsExecutable() {
  const result = run('git', ['ls-files', '-s', '.githooks/pre-commit']);
  assert(result.status === 0, 'git ls-files should succeed in the repo');
  const mode = (result.stdout.trim().split(/\s+/)[0] || '');
  if (mode === '100755') {
    return;
  }
  if (process.env.GATE_BOOTSTRAP === '1') {
    console.warn(`  (warning: .githooks/pre-commit is tracked as ${mode}; GATE_BOOTSTRAP=1 allows this bootstrap commit)`);
    return;
  }
  assert(false, `Review Gate hook must be tracked as executable (100755), got '${mode}'. Run \`npm run gate:install\`.`);
}

function testHookDecisionEndToEnd() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-e2e-'));
  const precommit = path.join(__dirname, 'precommit-check.js');
  const freeze = path.join(__dirname, 'freeze.js');
  const recordPass = path.join(__dirname, 'record-pass.js');

  try {
    initRepo(tmp);
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'one\n');
    run('git', ['add', 'a.txt'], { cwd: tmp });

    // No marker -> block, with guidance.
    let result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'Commit without a marker should be blocked');
    assert(/Review Gate/.test(result.stderr), 'Block should explain the gate');

    // SKIP_GATE escape hatch -> allow.
    result = runNode(precommit, [], tmp, { ...baseEnv(), SKIP_GATE: '1' });
    assert(result.status === 0, 'SKIP_GATE=1 should allow the commit');

    // Freeze then record a PASS.
    result = runNode(freeze, [], tmp, baseEnv());
    assert(result.status === 0, 'gate:freeze should succeed');
    assert(fs.existsSync(path.join(tmp, '.gate', 'diff.patch')), 'Freeze should write diff.patch');
    assert(fs.existsSync(path.join(tmp, '.gate', 'manifest.json')), 'Freeze should write manifest.json');
    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, '.gate', 'manifest.json'), 'utf8'));
    assert(manifest.stagedHash === lib.computeStagedHash(tmp), 'Manifest staged hash should match the index');

    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'Freeze alone should not approve a commit');

    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security'], tmp, baseEnv());
    assert(result.status === 0, 'gate:pass should record a PASS');
    const marker = JSON.parse(fs.readFileSync(path.join(tmp, '.gate', 'pass.json'), 'utf8'));
    assert(marker.verdict === 'PASS', 'Marker should record the verdict');
    assert(JSON.stringify(marker.lenses) === JSON.stringify(['code', 'security']), 'Marker should record lenses');

    // Matching marker -> allow and consume.
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 0, 'Matching PASS marker should allow the commit');
    assert(!fs.existsSync(path.join(tmp, '.gate', 'pass.json')), 'Matching marker should be consumed');

    // Consumed marker -> block again.
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'Consumed marker should not allow a second commit');

    // Staged tree changes -> previous (re-frozen) approval no longer matches.
    runNode(freeze, [], tmp, baseEnv());
    runNode(recordPass, ['--verdict', 'PASS'], tmp, baseEnv());
    fs.writeFileSync(path.join(tmp, 'b.txt'), 'two\n');
    run('git', ['add', 'b.txt'], { cwd: tmp });
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'A changed staged tree must not reuse an old approval');

    // FAIL verdict is refused by gate:pass.
    result = runNode(recordPass, ['--verdict', 'FAIL'], tmp, baseEnv());
    assert(result.status === 1, 'gate:pass should refuse a FAIL verdict');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Freeze must fail closed: a git failure must not leave a half-written .gate/
// or an empty snapshot that could masquerade as a reviewable diff (C-3/C-8).
function testFreezeFailsClosedOutsideRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-norepo-'));
  const freeze = path.join(__dirname, 'freeze.js');
  try {
    const result = runNode(freeze, [], tmp, baseEnv());
    assert(result.status === 1, 'gate:freeze outside a git repo should fail');
    assert(!fs.existsSync(path.join(tmp, '.gate')), 'A failed freeze must not create .gate/');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// gate:pass may only bind to the snapshot that was actually frozen and reviewed
// (S-3/C-4): require the manifest and refuse when the index moved since.
function testRecordPassRequiresMatchingManifest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-stale-'));
  const freeze = path.join(__dirname, 'freeze.js');
  const recordPass = path.join(__dirname, 'record-pass.js');
  try {
    initRepo(tmp);
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'one\n');
    run('git', ['add', 'a.txt'], { cwd: tmp });

    // No manifest -> refuse.
    let result = runNode(recordPass, ['--verdict', 'PASS'], tmp, baseEnv());
    assert(result.status === 1, 'gate:pass without a manifest must refuse');
    assert(/manifest/i.test(result.stderr), 'Refusal should mention the manifest');
    assert(!fs.existsSync(path.join(tmp, '.gate', 'pass.json')), 'No marker without a manifest');

    // Freeze, then move the index -> stale manifest -> refuse.
    runNode(freeze, [], tmp, baseEnv());
    fs.writeFileSync(path.join(tmp, 'b.txt'), 'two\n');
    run('git', ['add', 'b.txt'], { cwd: tmp });
    result = runNode(recordPass, ['--verdict', 'PASS'], tmp, baseEnv());
    assert(result.status === 1, 'gate:pass must refuse when the index changed after freeze');
    assert(/staged tree changed/i.test(result.stderr), 'Refusal should explain the stale snapshot');
    assert(!fs.existsSync(path.join(tmp, '.gate', 'pass.json')), 'No marker on a stale snapshot');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function main() {
  console.log('Running pre-commit gate tests...');
  testPureHelpers();
  testStagedHashTracksIndex();
  testHookFileIsExecutable();
  testHookDecisionEndToEnd();
  testFreezeFailsClosedOutsideRepo();
  testRecordPassRequiresMatchingManifest();
  console.log('✅ Pre-commit gate tests passed');
}

main();
