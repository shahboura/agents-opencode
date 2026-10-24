#!/usr/bin/env node
'use strict';

/**
 * Tests for the versioned Pre-Commit Review Gate: pure marker/hash helpers, the
 * tree-equality empty-commit exemption (including gitlink-only changes), the
 * explicit --verdict requirement, and end-to-end hook decisions in temp repos —
 * including real git commits that exercise pre-commit verification and
 * post-commit marker consumption.
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

function assertThrows(fn, pattern, message) {
  try {
    fn();
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    assert(pattern.test(detail), `${message} (threw the wrong error: ${detail})`);
    return;
  }
  assert(false, `${message} (did not throw)`);
}

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    cwd: options.cwd || process.cwd(),
    // F4: default to the scrubbed env so direct git spawns (initRepo, seed
    // commits, ...) cannot inherit hook-exported plumbing like GIT_DIR; an
    // explicit `options.env` still wins.
    env: options.env || baseEnv(),
    encoding: 'utf8',
  });
}

function runNode(scriptPath, args, cwd, env) {
  return run(process.execPath, [scriptPath, ...args], { cwd, env });
}

function baseEnv() {
  const env = { ...process.env };
  delete env.SKIP_GATE;
  // Hermeticity (F4): a git-hook context exports plumbing variables that would
  // silently repoint git at the hook's repository instead of the temp repo
  // under test. Scrub those so the suite stays self-contained.
  delete env.GIT_DIR;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_WORK_TREE;
  // N2: the GIT_CONFIG_* scrubs are not plumbing — deleting them does NOT
  // repoint git, it re-enables git's default config sources. They are removed
  // only so a hook-context config redirection (e.g. GIT_CONFIG_GLOBAL=/dev/null)
  // cannot leak into the tests; the intent is isolation from the parent
  // environment. All three sources are scrubbed together to stay consistent.
  delete env.GIT_CONFIG_GLOBAL;
  delete env.GIT_CONFIG_NOSYSTEM;
  delete env.GIT_CONFIG_SYSTEM;
  return env;
}

// Every freeze in these tests runs against a temp repo. A non-trivial diff now
// requires an executable plan, so write the smallest valid one first.
const FREEZE_SCRIPT = path.join(__dirname, 'freeze.js');

function freezeRepo(tmp) {
  const gate = path.join(tmp, '.gate');
  fs.mkdirSync(gate, { recursive: true });
  fs.writeFileSync(
    path.join(gate, 'plan.md'),
    '# Plan\n\n## Acceptance\n\n- the change does what the plan says\n\n## Checks\n- run: npm test\n- expect: exit 0\n'
  );
  return runNode(FREEZE_SCRIPT, [], tmp, baseEnv());
}

// A Tier 2 panel needs hash-bound evidence per lens; write it the way a real
// review does, through gate:lens, so the tests exercise the same path.
function recordLenses(tmp, names) {
  const lensEvidence = path.join(__dirname, 'lens-evidence.js');
  for (const name of names) {
    const result = runNode(lensEvidence, ['--name', name, '--verdict', 'PASS', '--findings', '0'], tmp, baseEnv());
    if (result.status !== 0) {
      throw new Error(`gate:lens failed for ${name}: ${result.stderr}`);
    }
  }
}

function testPureHelpers() {
  const hash = 'abc123';
  const trivial = lib.classifyStagedDiff(['README.md']);
  assert(lib.isPassVerdict('PASS'), 'PASS should be a passing verdict');
  assert(lib.isPassVerdict('PASS-WITH-CAVEATS'), 'PASS-WITH-CAVEATS should be a passing verdict');
  assert(!lib.isPassVerdict('FAIL'), 'FAIL should not be a passing verdict');
  assert(!lib.isPassVerdict(undefined), 'Undefined should not be a passing verdict');

  assert(!lib.evaluateMarker(null, hash, trivial).allowed, 'No marker should block');
  assert(!lib.evaluateMarker({ verdict: 'FAIL', stagedHash: hash }, hash, trivial).allowed, 'FAIL marker should block');
  assert(!lib.evaluateMarker({ verdict: 'PASS' }, hash, trivial).allowed, 'Missing stagedHash should block');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: 'other' }, hash, trivial).allowed, 'Mismatched hash should block');
  assert(lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash, trivial).allowed, 'Matching PASS should allow');
  assert(lib.evaluateMarker({ verdict: 'PASS-WITH-CAVEATS', stagedHash: hash }, hash, trivial).allowed, 'Matching caveats should allow');

  // G5: the classification argument is mandatory — a caller must not be able to
  // silently skip the lens rule by omitting it (legacy 2-arg mode fails closed).
  assertThrows(() => lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash), /classification/i, 'Omitting the classification must throw');
  assertThrows(() => lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash, null), /classification/i, 'A null classification must throw');
  assertThrows(() => lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash, {}), /classification/i, 'A classification without nonTrivial must throw');

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

function writeFiles(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

// Copy the real hooks + the scripts they delegate to into a temp repo and point
// core.hooksPath at them, so `git commit` exercises the full hook path. On
// POSIX the copies need the executable bit (copyFileSync drops it).
function installGateHooks(dir) {
  const repoRoot = path.join(__dirname, '..', '..');
  fs.mkdirSync(path.join(dir, 'scripts', 'gate'), { recursive: true });
  for (const script of ['lib.js', 'precommit-check.js']) {
    fs.copyFileSync(path.join(__dirname, script), path.join(dir, 'scripts', 'gate', script));
  }
  fs.mkdirSync(path.join(dir, '.githooks'), { recursive: true });
  for (const hook of ['pre-commit', 'post-commit']) {
    const dest = path.join(dir, '.githooks', hook);
    fs.copyFileSync(path.join(repoRoot, '.githooks', hook), dest);
    if (process.platform !== 'win32') {
      fs.chmodSync(dest, 0o755);
    }
  }
  run('git', ['config', 'core.hooksPath', '.githooks'], { cwd: dir });
  run('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir });
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

// F8/G2: listStagedFiles must return raw (unquoted) paths from the index and
// must surface BOTH sides of a rename — with rename detection on, git reports
// only the destination and `git mv scripts/x.js docs/x.js` would hide the risk
// path from the classifier. A real temp repo exercises the git plumbing; the
// seed commit is signed off (`commit.gpgsign=false`) so the ambient global
// config cannot break the test.
function testListStagedFilesParsing() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-list-'));
  try {
    initRepo(tmp);
    writeFiles(tmp, { 'scripts/tool.js': 'risk\n', 'README.md': 'seed\n' });
    run('git', ['add', '-A'], { cwd: tmp });
    const seed = run('git', ['-c', 'commit.gpgsign=false', 'commit', '-q', '--no-verify', '-m', 'seed'], { cwd: tmp });
    assert(seed.status === 0, `seed commit should succeed (stderr: ${seed.stderr})`);

    writeFiles(tmp, {
      'docs/spaced name.md': 'space\n',
      'docs/ünïcode-文書.md': 'unicode\n',
    });
    run('git', ['mv', 'scripts/tool.js', 'docs/renamed.md'], { cwd: tmp });
    run('git', ['add', '-A'], { cwd: tmp });

    const files = lib.listStagedFiles(tmp);
    assert(files.includes('docs/spaced name.md'), `spaced path should be listed verbatim, got: ${JSON.stringify(files)}`);
    assert(files.includes('docs/ünïcode-文書.md'), `non-ASCII path should be listed verbatim, got: ${JSON.stringify(files)}`);
    assert(files.includes('scripts/tool.js'), `rename source side should be listed, got: ${JSON.stringify(files)}`);
    assert(files.includes('docs/renamed.md'), `rename destination side should be listed, got: ${JSON.stringify(files)}`);

    const classification = lib.classifyStagedDiff(files);
    assert(classification.nonTrivial, 'renaming a risk path out of scripts/ must stay non-trivial');
    assert(classification.riskPaths.includes('scripts/tool.js'), 'the rename source must be reported as the risk path');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// S1: a gitlink (submodule pointer) change is content-bearing — it moves the
// superproject to different submodule content — yet `git diff --cached` can
// hide it (diff.ignoreSubmodules=all, older git defaults) while `git write-tree`
// and the commit include it. The empty-commit exemption must be decided on TREE
// EQUALITY, the name listing must pass `--ignore-submodules=none`, and any
// staged gitlink must classify non-trivial. The gitlink is simulated directly
// in the index (`git update-index --add --cacheinfo`) — no real submodule.
function testGitlinkChangesAreVisibleAndGated() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-gitlink-'));
  const precommit = path.join(__dirname, 'precommit-check.js');
  const freeze = path.join(__dirname, 'freeze.js');
  const recordPass = path.join(__dirname, 'record-pass.js');
  const gitlinkSha = '1234567890123456789012345678901234567890';
  try {
    initRepo(tmp);
    fs.writeFileSync(path.join(tmp, 'seed.txt'), 'seed\n');
    run('git', ['add', 'seed.txt'], { cwd: tmp });
    const seed = run('git', ['-c', 'commit.gpgsign=false', 'commit', '-q', '--no-verify', '-m', 'seed'], { cwd: tmp });
    assert(seed.status === 0, `seed commit should succeed (stderr: ${seed.stderr})`);

    // Reproduce the blind spot explicitly (instead of trusting a git version's
    // default), so the test proves the explicit flags override the config.
    run('git', ['config', 'diff.ignoreSubmodules', 'all'], { cwd: tmp });

    // Simulate a staged submodule pointer change (gitlink, index mode 160000).
    run('git', ['update-index', '--add', '--cacheinfo', `160000,${gitlinkSha},vendor/sub`], { cwd: tmp });

    // Control: with diff.ignoreSubmodules=all the raw listing hides the change —
    // exactly the S1 blind spot the exemption must not trust.
    const raw = run('git', ['diff', '--cached', '--name-only'], { cwd: tmp });
    assert(
      raw.status === 0 && raw.stdout.trim() === '',
      `control: raw listing should be blind to the gitlink (got: ${JSON.stringify(raw.stdout)})`
    );

    // The gate's listing must see it, and it must classify non-trivial.
    const files = lib.listStagedFiles(tmp);
    assert(files.includes('vendor/sub'), `gitlink path must be listed, got: ${JSON.stringify(files)}`);
    assert(lib.listStagedGitlinks(tmp).includes('vendor/sub'), 'the gitlink must be detected from the raw diff');
    const classification = lib.classifyStagedDiff(files, { gitlinkPaths: lib.listStagedGitlinks(tmp) });
    assert(classification.nonTrivial, 'a gitlink-only staged change must classify non-trivial');
    assert(classification.reasons.some((r) => /gitlink/i.test(r)), 'the classification reason must name the gitlink');

    // Exemption: the staged tree differs from HEAD, so the hook must NOT exempt.
    let result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'a gitlink-only staged change must not be exempt from the gate');
    assert(!/exempt/i.test(result.stdout), 'the hook must not report the empty-commit exemption');
    assert(/Review Gate/.test(result.stderr), 'the block should explain the Review Gate');

    // Freeze: the gitlink must appear in the frozen diff — the snapshot the
    // lenses read must render the submodule pointer change.
    result = freezeRepo(tmp);
    assert(result.status === 0, `gate:freeze should succeed for a gitlink change (stderr: ${result.stderr})`);
    const diff = fs.readFileSync(path.join(tmp, '.gate', 'diff.patch'), 'utf8');
    assert(diff.includes('vendor/sub'), 'the frozen diff must include the gitlink path');
    assert(/Subproject commit/.test(diff), 'the frozen diff must render the submodule pointer');

    // Panel parity: the gitlink change is non-trivial, so a one-lens pass is
    // refused and only a two-lens marker is accepted by the hook.
    recordLenses(tmp, ['code']);
    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code', '--skip-requirements', 'test fixture only'], tmp, baseEnv());
    assert(result.status === 1, 'gate:pass must refuse a one-lens pass for a gitlink change');
    assert(/at least 2 lenses/.test(result.stderr), `the refusal should state the panel requirement (stderr: ${result.stderr})`);
    recordLenses(tmp, ['code', 'security']);
    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security', '--skip-requirements', 'gitlink fixture'], tmp, baseEnv());
    assert(result.status === 0, `gate:pass should record a two-lens pass (stderr: ${result.stderr})`);
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 0, `the hook should accept the two-lens marker (stderr: ${result.stderr})`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Empty commits change nothing, so the hook must allow them immediately without
// a marker (this is the `git commit --allow-empty` release-tooling path). A
// staged file still requires the gate.
function testEmptyCommitExemption() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-empty-'));
  const precommit = path.join(__dirname, 'precommit-check.js');
  try {
    initRepo(tmp);

    // Unborn HEAD + empty index: the staged tree equals the empty tree, which
    // is the unborn-HEAD comparison terminus, so nothing needs review.
    let result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 0, `An empty commit must be allowed without a marker (stderr: ${result.stderr})`);
    assert(/empty commit/i.test(result.stdout), 'The allowance should say why no review is needed');
    assert(!fs.existsSync(path.join(tmp, '.gate', 'pass.json')), 'No marker is created or needed');

    fs.writeFileSync(path.join(tmp, 'a.txt'), 'one\n');
    run('git', ['add', 'a.txt'], { cwd: tmp });
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'A staged file still requires a gate pass');

    // The exemption is decided on TREE EQUALITY, not the staged name list: once
    // HEAD exists, re-staging HEAD's exact content leaves no net change — exempt
    // even though the index was modified in between.
    const seed = run('git', ['-c', 'commit.gpgsign=false', 'commit', '-q', '--no-verify', '-m', 'seed'], { cwd: tmp });
    assert(seed.status === 0, `seed commit should succeed (stderr: ${seed.stderr})`);
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'two\n');
    run('git', ['add', 'a.txt'], { cwd: tmp });
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'A changed staged tree must require a gate pass');
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'one\n');
    run('git', ['add', 'a.txt'], { cwd: tmp });
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 0, `A staged tree equal to HEAD^{tree} is exempt (stderr: ${result.stderr})`);
    assert(/empty commit/i.test(result.stdout), 'The tree-equality exemption should say why no review is needed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// The gate is inert on POSIX unless each hook carries the executable bit —
// post-commit too, or the marker would never be consumed. Assert the *index*
// mode (authoritative regardless of pending staged changes) so a future edit
// cannot silently drop it and ship a 100644 regression. The only escape is an
// explicit GATE_BOOTSTRAP=1 opt-in for the bootstrap commit that introduces a
// hook before `gate:install` can run.
function testHookFileIsExecutable() {
  for (const hook of ['.githooks/pre-commit', '.githooks/post-commit']) {
    const result = run('git', ['ls-files', '-s', hook]);
    assert(result.status === 0, `git ls-files should succeed for ${hook}`);
    const mode = (result.stdout.trim().split(/\s+/)[0] || '');
    if (mode === '100755') {
      continue;
    }
    if (process.env.GATE_BOOTSTRAP === '1') {
      console.warn(`  (warning: ${hook} is tracked as ${mode}; GATE_BOOTSTRAP=1 allows this bootstrap commit)`);
      continue;
    }
    assert(false, `${hook} must be tracked as executable (100755), got '${mode}'. Run \`npm run gate:install\`.`);
  }
}

// S2: existence + the executable bit are not enough. A tracked, executable hook
// can still be neutered in place — rewritten to `exit 0`, emptied, or its
// delegation commented out — and the commit would then land ungated (or the
// marker linger), so assert the committed hook content itself stays live:
//   - pre-commit must delegate to the gate checker (verify without consuming);
//   - post-commit must delete .gate/pass.json (the consumption).
// Neutering enforcement therefore always requires a visible, reviewable edit to
// this assertion too. Comments are stripped first: a commented-out delegation
// must not count as live enforcement, and a live `exit 0` cannot preempt the
// hook. Missing files are covered by fs.existsSync (git silently skips a
// missing hook).
function activeHookLines(hookPath) {
  return fs.readFileSync(hookPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function testHookContentDelegatesToChecker() {
  const hooksDir = path.join(__dirname, '..', '..', '.githooks');
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const postCommitPath = path.join(hooksDir, 'post-commit');

  assert(fs.existsSync(preCommitPath), '.githooks/pre-commit must exist — git silently skips a missing hook');
  const preCommitActive = activeHookLines(preCommitPath);
  assert(
    preCommitActive.some((line) => /\bnode\b/.test(line) && line.includes('precommit-check.js')),
    `.githooks/pre-commit must delegate to scripts/gate/precommit-check.js; live content: ${JSON.stringify(preCommitActive)}`
  );
  assert(
    !preCommitActive.includes('exit 0'),
    '.githooks/pre-commit must not be neutered with an unconditional `exit 0`'
  );

  assert(fs.existsSync(postCommitPath), '.githooks/post-commit must exist — without it the marker can linger');
  const postCommitActive = activeHookLines(postCommitPath);
  // S3/F2/N1: the matched line must actually BE the marker deletion. Matching
  // `rm ` plus a `.gate/pass.json` substring still accepts
  // `rm -f "$root/.gate/pass.json".bak` (deletes the wrong path) and
  // `rm -f /tmp/x # .gate/pass.json` (mention only, inside a comment), so
  // anchor the quoted marker path as rm's final argument.
  const deletesMarker = /^rm\s+(?:-\S+\s+)*"\$root\/\.gate\/pass\.json"\s*$/;
  assert(
    postCommitActive.some((line) => deletesMarker.test(line)),
    `.githooks/post-commit must delete "$root/.gate/pass.json" with a live rm line; live content: ${JSON.stringify(postCommitActive)}`
  );
  assert(
    !postCommitActive.includes('exit 0'),
    '.githooks/post-commit must not be neutered with an unconditional `exit 0`'
  );
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
    result = freezeRepo(tmp);
    assert(result.status === 0, 'gate:freeze should succeed');
    assert(fs.existsSync(path.join(tmp, '.gate', 'diff.patch')), 'Freeze should write diff.patch');
    assert(fs.existsSync(path.join(tmp, '.gate', 'manifest.json')), 'Freeze should write manifest.json');
    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, '.gate', 'manifest.json'), 'utf8'));
    assert(manifest.stagedHash === lib.computeStagedHash(tmp), 'Manifest staged hash should match the index');

    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'Freeze alone should not approve a commit');

    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security', '--skip-requirements', 'test fixture'], tmp, baseEnv());
    assert(result.status === 0, 'gate:pass should record a PASS');
    const marker = JSON.parse(fs.readFileSync(path.join(tmp, '.gate', 'pass.json'), 'utf8'));
    assert(marker.verdict === 'PASS', 'Marker should record the verdict');
    assert(
      JSON.stringify(marker.lenses) === JSON.stringify([{ name: 'code' }, { name: 'security' }]),
      `Marker should record the lens entries (got ${JSON.stringify(marker.lenses)})`
    );

    // Matching marker -> allow, but pre-commit must NOT consume it: consumption
    // moved to post-commit so an aborted commit keeps the approval.
    const markerPath = path.join(tmp, '.gate', 'pass.json');
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 0, 'Matching PASS marker should allow the commit');
    assert(fs.existsSync(markerPath), 'Pre-commit must not delete the marker — a failed commit must keep the approval');

    // Simulate the post-commit consumption -> the approval is gone.
    lib.consumeMarker(markerPath);
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'A consumed marker should not allow a second commit');

    // Staged tree changes -> previous (re-frozen) approval no longer matches.
    freezeRepo(tmp);
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

// The strongest end-to-end proof that consumption moved: real `git commit`
// runs the copied hooks. A marker must survive a commit that fails AFTER
// pre-commit allowed (injected via a failing commit-msg hook), be consumed by
// post-commit only after a successful commit, and empty commits are allowed
// with no marker at all.
function testMarkerLifecycleThroughGit() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-lifecycle-'));
  try {
    initRepo(tmp);
    installGateHooks(tmp);

    fs.writeFileSync(path.join(tmp, 'README.md'), 'seed\n');
    run('git', ['add', 'README.md'], { cwd: tmp });

    const markerPath = path.join(tmp, '.gate', 'pass.json');
    const writeMarker = () => {
      fs.mkdirSync(path.join(tmp, '.gate'), { recursive: true });
      const marker = {
        verdict: 'PASS',
        stagedHash: lib.computeStagedHash(tmp),
        timestamp: new Date().toISOString(),
        lenses: [],
      };
      fs.writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`);
    };
    writeMarker();

    // Force a failure AFTER pre-commit runs: a commit-msg hook that exits 1.
    const commitMsg = path.join(tmp, '.githooks', 'commit-msg');
    fs.writeFileSync(commitMsg, '#!/bin/sh\nexit 1\n');
    if (process.platform !== 'win32') {
      fs.chmodSync(commitMsg, 0o755);
    }

    let result = run('git', ['commit', '-m', 'seed'], { cwd: tmp, env: baseEnv() });
    assert(result.status !== 0, 'The failing commit-msg hook should abort the commit');
    assert(fs.existsSync(markerPath), 'An aborted commit must NOT consume the approval marker');

    // Retry with the same marker: pre-commit allows and post-commit consumes.
    fs.rmSync(commitMsg);
    result = run('git', ['commit', '-m', 'seed'], { cwd: tmp, env: baseEnv() });
    assert(result.status === 0, `Commit with a matching marker should succeed (stderr: ${result.stderr})`);
    assert(!fs.existsSync(markerPath), 'The post-commit hook must consume the marker after a successful commit');

    // The consumed approval cannot cover the next commit.
    fs.writeFileSync(path.join(tmp, 'b.txt'), 'two\n');
    run('git', ['add', 'b.txt'], { cwd: tmp });
    result = run('git', ['commit', '-m', 'b'], { cwd: tmp, env: baseEnv() });
    assert(result.status !== 0, 'A commit without a marker must be blocked by the real hook');
    assert(/Review Gate/.test(`${result.stdout}${result.stderr}`), 'The block should explain the Review Gate');
    run('git', ['reset', '-q'], { cwd: tmp });

    // Empty commit through real git: allowed with no marker, nothing consumed.
    result = run('git', ['commit', '--allow-empty', '-m', 'empty'], { cwd: tmp, env: baseEnv() });
    assert(result.status === 0, `An empty commit must be allowed without a marker (stderr: ${result.stderr})`);
    assert(!fs.existsSync(markerPath), 'An empty commit neither needs nor creates a marker');
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
    freezeRepo(tmp);
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

// gate:pass must require an explicit --verdict: omitting it (e.g. the flag
// swallowed by npm without the `--`) is a usage error, never a silent PASS
// default. Both `--verdict <v>` and `--verdict=<v>` stay supported, and only
// PASS / PASS-WITH-CAVEATS are accepted.
function testRecordPassRequiresExplicitVerdict() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-verdict-'));
  const freeze = path.join(__dirname, 'freeze.js');
  const recordPass = path.join(__dirname, 'record-pass.js');
  const markerPath = path.join(tmp, '.gate', 'pass.json');
  try {
    initRepo(tmp);
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'one\n');
    run('git', ['add', 'a.txt'], { cwd: tmp });

    // No --verdict at all -> usage error before any gate artifacts are touched.
    let result = runNode(recordPass, [], tmp, baseEnv());
    assert(result.status === 1, 'gate:pass without --verdict must fail');
    assert(/--verdict/.test(result.stderr), 'Refusal must name the required flag');
    assert(/usage/i.test(result.stderr), 'Refusal must show usage');
    assert(!fs.existsSync(markerPath), 'No marker on a usage error');

    // `--verdict` with no value -> usage error.
    result = runNode(recordPass, ['--verdict'], tmp, baseEnv());
    assert(result.status === 1, '`--verdict` with no value must fail');
    assert(/--verdict/.test(result.stderr), 'Refusal must still name the flag');

    // `--verdict=` (empty value) -> usage error.
    result = runNode(recordPass, ['--verdict='], tmp, baseEnv());
    assert(result.status === 1, '`--verdict=` with an empty value must fail');
    assert(!fs.existsSync(markerPath), 'No marker on an empty verdict');

    // `--verdict=<v>` works; both pass verdicts are accepted.
    freezeRepo(tmp);
    result = runNode(recordPass, ['--verdict=PASS'], tmp, baseEnv());
    assert(result.status === 0, `--verdict=PASS should record a pass (stderr: ${result.stderr})`);
    assert(JSON.parse(fs.readFileSync(markerPath, 'utf8')).verdict === 'PASS', 'Marker should record PASS');
    result = runNode(recordPass, ['--verdict=PASS-WITH-CAVEATS'], tmp, baseEnv());
    assert(result.status === 0, 'PASS-WITH-CAVEATS should be accepted');

    // A bad value is refused after validation (not a usage error).
    result = runNode(recordPass, ['--verdict=FAIL'], tmp, baseEnv());
    assert(result.status === 1, '--verdict=FAIL must be refused');
    assert(/expected PASS or PASS-WITH-CAVEATS/i.test(result.stderr), 'Refusal should list the allowed verdicts');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// The classifier is the single source of truth for gate tiering: a diff is
// non-trivial when it touches more than NON_TRIVIAL_FILE_LIMIT files or any
// path under a risk prefix / listed root file. Keep the rule table-driven so a
// future change to RISK_PATH_RULES must update the expectations deliberately.
function testClassifierRules() {
  const cases = [
    { name: 'empty staged list is trivial', files: [], nonTrivial: false, fileCount: 0 },
    { name: 'single docs file is trivial', files: ['README.md'], nonTrivial: false, fileCount: 1 },
    { name: 'exactly 2 non-risk files is trivial', files: ['docs/a.md', 'docs/b.md'], nonTrivial: false, fileCount: 2 },
    { name: '3 non-risk files is non-trivial', files: ['docs/a.md', 'docs/b.md', 'docs/c.md'], nonTrivial: true, fileCount: 3 },
    { name: 'scripts/ path is non-trivial', files: ['scripts/gate/lib.js'], nonTrivial: true, fileCount: 1 },
    { name: '.opencode/ path is non-trivial', files: ['.opencode/agents/review.md'], nonTrivial: true, fileCount: 1 },
    { name: '.github/ path is non-trivial', files: ['.github/workflows/validate.yml'], nonTrivial: true, fileCount: 1 },
    { name: '.githooks/ path is non-trivial (the gate hook itself, G1)', files: ['.githooks/pre-commit'], nonTrivial: true, fileCount: 1 },
    { name: 'site/ path is non-trivial', files: ['site/package.json'], nonTrivial: true, fileCount: 1 },
    { name: 'evals/ path is non-trivial', files: ['evals/reports/latest.json'], nonTrivial: true, fileCount: 1 },
    { name: 'adapters/ path is non-trivial', files: ['adapters/claude-code/README.md'], nonTrivial: true, fileCount: 1 },
    { name: 'root install.js is non-trivial', files: ['install.js'], nonTrivial: true, fileCount: 1 },
    { name: 'root package.json is non-trivial', files: ['package.json'], nonTrivial: true, fileCount: 1 },
    { name: 'root opencode.json is non-trivial', files: ['opencode.json'], nonTrivial: true, fileCount: 1 },
    { name: 'root .gitleaks.toml is non-trivial', files: ['.gitleaks.toml'], nonTrivial: true, fileCount: 1 },
    { name: 'root AGENTS.md is non-trivial (session-injected context, S3)', files: ['AGENTS.md'], nonTrivial: true, fileCount: 1 },
    { name: 'root package-lock.json is non-trivial', files: ['package-lock.json'], nonTrivial: true, fileCount: 1 },
    { name: 'nested package-lock.json is non-trivial', files: ['docs/nested/package-lock.json'], nonTrivial: true, fileCount: 1 },
    { name: 'risk prefixes are case-folded (G4)', files: ['Scripts/gate/lib.js'], nonTrivial: true, fileCount: 1 },
    { name: 'nested package.json outside risk dirs is not a root risk file', files: ['docs/package.json', 'README.md'], nonTrivial: false, fileCount: 2 },
    { name: 'docs/scripts/ is not under scripts/', files: ['docs/scripts/guide.md', 'README.md'], nonTrivial: false, fileCount: 2 },
    { name: 'windows separators normalize to repo paths', files: ['scripts\\gate\\lib.js'], nonTrivial: true, fileCount: 1 },
  ];

  for (const c of cases) {
    const result = lib.classifyStagedDiff(c.files);
    assert(result.nonTrivial === c.nonTrivial, `${c.name}: expected nonTrivial=${c.nonTrivial}, got ${result.nonTrivial}`);
    assert(result.fileCount === c.fileCount, `${c.name}: expected fileCount=${c.fileCount}, got ${result.fileCount}`);
    if (c.nonTrivial) {
      assert(result.reasons.length > 0, `${c.name}: non-trivial cases must carry reasons`);
    } else {
      assert(result.reasons.length === 0, `${c.name}: trivial cases must not carry reasons`);
    }
  }

  // Risk paths and reasons must name the files so refusal messages can too.
  const mixed = lib.classifyStagedDiff(['scripts/gate/lib.js', 'README.md']);
  assert(JSON.stringify(mixed.riskPaths) === JSON.stringify(['scripts/gate/lib.js']), 'riskPaths should list only risk-touching paths');
  assert(mixed.reasons.some((r) => r.includes('scripts/gate/lib.js')), 'reasons should name the risk path');
  const counted = lib.classifyStagedDiff(['docs/a.md', 'docs/b.md', 'docs/c.md']);
  assert(counted.reasons.some((r) => r.includes('docs/a.md')), 'count reasons should name the staged files');

  // S1: the name list is mode-blind, so callers surface gitlinks separately
  // (listStagedGitlinks); any reported gitlink forces non-trivial so its
  // unreviewable submodule content cannot pass as a trivial Tier 1 change.
  const gitlink = lib.classifyStagedDiff(['vendor/sub'], { gitlinkPaths: ['vendor/sub'] });
  assert(gitlink.nonTrivial, 'a reported gitlink must classify non-trivial');
  assert(gitlink.reasons.some((r) => /gitlink/i.test(r) && r.includes('vendor/sub')), 'the reason must name the gitlink path');
  assert(!lib.classifyStagedDiff(['vendor/sub'], { gitlinkPaths: [] }).nonTrivial, 'an empty gitlink list keeps the base rules');
  assert(!lib.classifyStagedDiff(['README.md'], {}).nonTrivial, 'an empty options object keeps the base rules');
}

// Pure marker/lens helpers: legacy markers without a `lenses` array count as 0
// and must block a non-trivial diff, while trivial diffs keep accepting them.
// Lens names are counted distinctly (G6): trimmed and case-folded, so
// duplicates cannot fake a Tier 2 panel.
function testMarkerLensCountAndPanelRule() {
  const hash = 'abc123';
  assert(lib.markerLensCount(null) === 0, 'null marker has 0 lenses');
  assert(lib.markerLensCount({}) === 0, 'legacy marker without lenses counts as 0');
  assert(lib.markerLensCount({ lenses: 'code' }) === 0, 'non-array lenses counts as 0');
  assert(lib.markerLensCount({ lenses: ['code', '', '  '] }) === 1, 'blank lens entries do not count');
  assert(lib.markerLensCount({ lenses: ['code', 'security'] }) === 2, 'valid lenses count');
  assert(lib.markerLensCount({ lenses: ['code', 'code'] }) === 1, 'duplicate lens names count once');
  assert(lib.markerLensCount({ lenses: ['code', ' Code ', 'CODE'] }) === 1, 'lens names are trimmed and case-folded');
  assert(lib.markerLensCount({ lenses: ['code', 'Security'] }) === 2, 'case-different distinct names count separately');
  assert(lib.markerLensCount({ lenses: [{ name: 'code' }, { name: 'security' }] }) === 2, 'structured lens entries count');
  assert(lib.markerLensCount({ lenses: ['code', { name: 'Security' }, { name: ' code ' }] }) === 2, 'mixed string and structured lenses count distinctly');
  assert(lib.markerLensCount({ lenses: [{ name: 'code' }, { name: 'CODE' }] }) === 1, 'duplicate structured lens entries count once');
  assert(lib.markerLensCount({ lenses: [{}, null, 'code', { name: '' }] }) === 1, 'malformed structured entries do not count');
  assert(lib.markerLensCount({ lenses: [{ name: 'code', verdict: 'FAIL' }, { name: 'security' }] }) === 1, 'a FAIL lens does not count toward the panel');
  assert(lib.markerLensCount({ lenses: ['code', { name: 'security', verdict: 'FAIL' }] }) === 1, 'a FAIL structured lens does not count toward the panel');

  assert(lib.isAllowedLensName('requirements'), 'requirements is an allowed lens');
  assert(lib.isAllowedLensName(' Code '), 'lens allowlist entries are trimmed and case-folded');
  assert(!lib.isAllowedLensName('bogus'), 'unknown lens names are rejected');
  assert(lib.validatePlan('# Plan\n\n## Checks\n- run: npm test\n- expect: exit 0\n').ok, 'a runnable plan validates');
  assert(!lib.validatePlan('# Plan\n\n## Checks\n- run: npm test\n').ok, 'a run without expect fails');
  assert(!lib.validatePlan('# Plan\n\nNothing to check.\n').ok, 'a prose-only plan fails');
  assert(!lib.validatePlan('# Plan\n\n## Checks\n```\n- run: npm test\n- expect: exit 0\n```\n').ok, 'checks inside a fence do not count');
  assert(!lib.validatePlan('# Plan\n\n## Checks\n- run: true\n- expect: exit 0\n').ok, 'placeholder commands are rejected');

  const checks = '\n\n## Checks\n- run: npm test\n- expect: exit 0\n';
  assert(lib.validatePlan(`# P\n\n## Acceptance\n\n- one criterion${checks}`).acceptance === 1, 'criteria before Checks are counted');
  assert(lib.validatePlan(`# P${checks}\n## Acceptance\n\n- one criterion\n`).acceptance === 1, 'criteria after Checks are counted');
  assert(lib.validatePlan(`# P\n\n## Acceptance\n\n\`\`\`\n- quoted\n\`\`\`${checks}`).acceptance === 0, 'criteria inside a fence do not count');
  assert(lib.validatePlan(`# P\n\n## Acceptance\n\n### Risks\n\n- not a criterion${checks}`).acceptance === 0, 'a subheading ends the criteria section');
  assert(lib.validatePlan(`# P\n\n## Acceptance\n\n    - indented example${checks}`).acceptance === 0, 'an indented block is not criteria');
  assert(lib.validatePlan(`# P\n\n## Requirements\n\n- input only${checks}`).acceptance === 0, 'a Requirements section is not acceptance');
  assert(lib.validatePlan(`# P\n\n## Acceptance\n\n- run: npm test${checks}`).acceptance === 0, 'a run: bullet is not a criterion');
  assert(lib.validatePlan(`# P\n\n## Acceptance\n\n- [ ] observable criterion${checks}`).acceptance === 1, 'checkbox criteria count');
  assert(lib.isAllowedLensName('architecture'), 'architecture is an allowed lens');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: ['code', 'security'], skippedRequirements: 'short' }, hash, lib.classifyStagedDiff(['scripts/gate/lib.js'])).allowed, 'a too-short skip reason must not allow');

  const nonTrivial = lib.classifyStagedDiff(['scripts/gate/lib.js']);
  const trivial = lib.classifyStagedDiff(['README.md']);
  assert(nonTrivial.nonTrivial && !trivial.nonTrivial, 'classification fixtures must match their rule');
  const bound = (name) => ({ name, verdict: 'PASS', findings: 0, stagedHash: hash });
  const otherSnapshot = (name) => ({ name, verdict: 'PASS', findings: 0, stagedHash: 'deadbeef' });

  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash, nonTrivial).allowed, 'non-trivial + legacy 0-lens marker must block');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: ['code'] }, hash, nonTrivial).allowed, 'non-trivial + 1 lens must block');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: ['code', 'code'] }, hash, nonTrivial).allowed, 'non-trivial + duplicate lenses must block');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: ['code', 'security'] }, hash, nonTrivial).allowed, 'non-trivial without requirements must block');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: ['requirements', 'code'] }, hash, nonTrivial).allowed, 'unbound lens names must not count as a panel');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: [otherSnapshot('requirements'), otherSnapshot('code')] }, hash, nonTrivial).allowed, 'evidence bound to another snapshot must not count');
  assert(lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: [bound('requirements'), bound('code')] }, hash, nonTrivial).allowed, 'non-trivial + requirements + 2 bound lenses must allow');
  assert(lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: [bound('code'), bound('security')], skippedRequirements: 'no behaviour change' }, hash, nonTrivial).allowed, 'a recorded skip reason must allow');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: [bound('code'), bound('security')], skippedRequirements: '   ' }, hash, nonTrivial).allowed, 'a blank skip reason must not allow');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: [{ name: 'code' }] }, hash, nonTrivial).allowed, 'non-trivial + 1 structured lens must block');
  assert(lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: [bound('requirements'), bound('security')] }, hash, nonTrivial).allowed, 'non-trivial + 2 bound structured lenses including requirements must allow');
  assert(lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash, trivial).allowed, 'trivial + 0 lenses must allow');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: [bound('requirements'), { name: 'code', verdict: 'FAIL' }], skippedRequirements: 'no behaviour change' }, hash, nonTrivial).allowed, 'a FAIL lens must block even without a hash');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: [bound('requirements'), { name: 'code', verdict: 'FAIL' }] }, hash, trivial).allowed, 'a FAIL lens must block a trivial marker too');
  assertThrows(() => lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash), /classification/i, 'omitting the classification must throw instead of skipping the lens rule');
  assert(lib.evaluateMarker({ verdict: 'PASS-WITH-CAVEATS', stagedHash: hash, lenses: ['code'] }, hash, nonTrivial).allowed === false, 'panel rule applies to PASS-WITH-CAVEATS too');
}

// gate:pass must fail closed for non-trivial diffs: fewer than
// MIN_NON_TRIVIAL_LENSES DISTINCT lenses is refused without writing a marker.
// Allowed cases then run the hook to prove record-pass and the hook agree.
function testRecordPassPanelRequirement() {
  const freeze = path.join(__dirname, 'freeze.js');
  const recordPass = path.join(__dirname, 'record-pass.js');
  const precommit = path.join(__dirname, 'precommit-check.js');

  const cases = [
    { name: 'non-trivial risk path + 0 lenses refuses', files: { 'scripts/tool.js': 'x\n' }, lenses: [], allowed: false },
    { name: 'non-trivial risk path + 1 lens refuses', files: { 'scripts/tool.js': 'x\n' }, lenses: ['code'], allowed: false },
    { name: 'non-trivial risk path + duplicate lenses refuses', files: { 'scripts/tool.js': 'x\n' }, lenses: ['code', 'code'], allowed: false },
    { name: 'non-trivial risk path + 2 lenses allows', files: { 'scripts/tool.js': 'x\n' }, lenses: ['requirements', 'code'], allowed: true },
    { name: 'non-trivial file count + 0 lenses refuses', files: { 'docs/a.md': 'a\n', 'docs/b.md': 'b\n', 'docs/c.md': 'c\n' }, lenses: [], allowed: false },
    { name: 'trivial 2 files + 0 lenses allows', files: { 'docs/a.md': 'a\n', 'docs/b.md': 'b\n' }, lenses: [], allowed: true },
  ];

  for (const c of cases) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-panel-'));
    try {
      initRepo(tmp);
      writeFiles(tmp, c.files);
      run('git', ['add', '-A'], { cwd: tmp });

      let result = freezeRepo(tmp);
      assert(result.status === 0, `${c.name}: freeze should succeed`);

      const lensArgs = c.lenses.length > 0 ? ['--lenses', c.lenses.join(',')] : [];
      if (c.allowed) {
        recordLenses(tmp, c.lenses);
      }
      result = runNode(recordPass, ['--verdict', 'PASS', ...lensArgs], tmp, baseEnv());
      const markerPath = path.join(tmp, '.gate', 'pass.json');

      if (c.allowed) {
        assert(result.status === 0, `${c.name}: record-pass should allow (stderr: ${result.stderr})`);
        assert(fs.existsSync(markerPath), `${c.name}: allowed pass must write the marker`);
        const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
        assert(marker.lenses.length === c.lenses.length, `${c.name}: marker should record the lenses`);
        // Parity: the hook must accept exactly what record-pass accepted, and
        // must leave consumption to post-commit.
        result = runNode(precommit, [], tmp, baseEnv());
        assert(result.status === 0, `${c.name}: hook should accept a valid marker`);
        assert(fs.existsSync(markerPath), `${c.name}: pre-commit must not consume the marker (post-commit does)`);
      } else {
        assert(result.status === 1, `${c.name}: record-pass should refuse`);
        assert(!fs.existsSync(markerPath), `${c.name}: refused pass must not write the marker`);
        assert(/non-trivial/i.test(result.stderr), `${c.name}: refusal should explain the non-trivial rule`);
        assert(/at least 2 lenses/.test(result.stderr), `${c.name}: refusal should state the lens requirement`);
        const firstFile = Object.keys(c.files)[0];
        assert(result.stderr.includes(firstFile), `${c.name}: refusal should name the staged files`);
        const distinctLenses = new Set(c.lenses.map((lens) => lens.trim().toLowerCase())).size;
        if (c.lenses.length > distinctLenses) {
          assert(/duplicates count once/i.test(result.stderr), `${c.name}: refusal should explain that duplicate lens names collapse`);
        }
        // Parity: refused diff leaves no marker, so the hook must block too.
        result = runNode(precommit, [], tmp, baseEnv());
        assert(result.status === 1, `${c.name}: hook should block without a marker`);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

// The hook recomputes the classification from the staged tree and validates a
// hand-written or legacy marker against it, so a marker that record-pass would
// refuse can never slip through .githooks/pre-commit.
function testHookVerifiesRecordedLenses() {
  const precommit = path.join(__dirname, 'precommit-check.js');

  const cases = [
    { name: 'non-trivial + legacy marker (no lenses) blocks', files: { 'scripts/tool.js': 'x\n' }, lenses: undefined, allowed: false },
    { name: 'non-trivial + 1-lens marker blocks', files: { 'scripts/tool.js': 'x\n' }, lenses: ['code'], allowed: false },
    { name: 'non-trivial + 2 bound-lens marker allows', files: { 'scripts/tool.js': 'x\n' }, lenses: ['requirements', 'code'], bound: true, allowed: true },
    { name: 'non-trivial + 2 unbound lens names blocks', files: { 'scripts/tool.js': 'x\n' }, lenses: ['requirements', 'code'], allowed: false },
    { name: 'non-trivial + hand-written bogus lens blocks', files: { 'scripts/tool.js': 'x\n' }, lenses: ['code', 'bogus'], allowed: false },
    { name: 'trivial + legacy marker (no lenses) allows', files: { 'README.md': 'x\n' }, lenses: undefined, allowed: true },
  ];

  for (const c of cases) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-hooklens-'));
    try {
      initRepo(tmp);
      writeFiles(tmp, c.files);
      run('git', ['add', '-A'], { cwd: tmp });
      freezeRepo(tmp);
      const manifest = JSON.parse(fs.readFileSync(path.join(tmp, '.gate', 'manifest.json'), 'utf8'));

      const marker = { verdict: 'PASS', stagedHash: manifest.stagedHash, timestamp: new Date().toISOString() };
      if (c.lenses) {
        marker.lenses = c.bound
          ? c.lenses.map((name) => ({ name, verdict: 'PASS', findings: 0, stagedHash: manifest.stagedHash }))
          : c.lenses;
      }
      fs.mkdirSync(path.join(tmp, '.gate'), { recursive: true });
      fs.writeFileSync(path.join(tmp, '.gate', 'pass.json'), `${JSON.stringify(marker, null, 2)}\n`);

      const result = runNode(precommit, [], tmp, baseEnv());
      if (c.allowed) {
        assert(result.status === 0, `${c.name}: hook should allow (stderr: ${result.stderr})`);
      } else {
        assert(result.status === 1, `${c.name}: hook should block`);
        assert(/lens/i.test(result.stderr), `${c.name}: block should mention the lens requirement`);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

// A2: lens evidence is hash-bound, not self-reported. readLensEvidence parses
// the header the lens CLI writes; collectLensEvidence reports a missing file and
// any file whose stagedHash does not match the frozen snapshot, and gate:pass
// refuses both on a non-trivial panel.
function testLensEvidenceHelpers() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-lensev-'));
  try {
    const gate = path.join(tmp, 'gate');
    fs.mkdirSync(gate, { recursive: true });
    const hash = 'abc123';

    assert(lib.readLensEvidence(path.join(gate, 'lens-missing.md')) === null, 'a missing evidence file reads as null');

    fs.writeFileSync(path.join(gate, 'lens-code.md'), [
      'lens: code',
      `stagedHash: ${hash}`,
      'verdict: PASS',
      'findings: 2',
      'createdAt: 2026-01-01T00:00:00.000Z',
      '',
      'free text notes: ignored by the parser',
      '',
    ].join('\n'));
    const parsed = lib.readLensEvidence(path.join(gate, 'lens-code.md'));
    assert(parsed.lens === 'code' && parsed.verdict === 'PASS', 'evidence keeps the lens name and verdict');
    assert(parsed.stagedHash === hash, 'evidence keeps the staged hash');
    assert(parsed.findings === 2, `findings should parse as an integer (got ${parsed.findings})`);

    let collected = lib.collectLensEvidence(gate, ['code', 'security'], hash);
    assert(collected.mismatched.length === 0, 'evidence bound to the snapshot reports no mismatch');
    assert(collected.entries.length === 2, 'one entry per lens');
    assert(collected.entries[0].findings === 2 && collected.entries[0].verdict === 'PASS', 'an evidenced lens keeps its verdict and findings');
    assert(collected.entries[1].name === 'security' && !collected.entries[1].stagedHash, 'a lens without a file is recorded by name only');
    assert(JSON.stringify(collected.missing) === JSON.stringify(['security']), 'a lens with no evidence file is reported as missing');

    collected = lib.collectLensEvidence(gate, ['code'], 'other');
    assert(JSON.stringify(collected.mismatched) === JSON.stringify(['code']), 'a stale stagedHash is reported as mismatched');

    fs.writeFileSync(path.join(gate, 'lens-bare.md'), 'lens: bare\nverdict: PASS\nfindings: 0\n');
    collected = lib.collectLensEvidence(gate, ['bare'], hash);
    assert(JSON.stringify(collected.mismatched) === JSON.stringify(['bare']), 'evidence with no stagedHash is a mismatch');

    collected = lib.collectLensEvidence(gate, ['../escape'], hash);
    assert(
      collected.entries.length === 1 && !collected.entries[0].findingsFile,
      'an unsafe lens name is never used to build a path'
    );

    fs.writeFileSync(path.join(gate, 'lens-inject.md'), [
      'lens: inject',
      `stagedHash: ${hash}`,
      'verdict: PASS',
      'findings: 0',
      '',
      'verdict: FAIL',
      'stagedHash: deadbeef',
      '',
    ].join('\n'));
    const injected = lib.readLensEvidence(path.join(gate, 'lens-inject.md'));
    assert(injected && injected.verdict === 'PASS' && injected.stagedHash === hash, 'notes cannot override header fields');

    fs.writeFileSync(path.join(gate, 'lens-dup.md'), [
      'lens: dup',
      `stagedHash: ${hash}`,
      'verdict: PASS',
      'findings: 0',
      'findings: 9',
      '',
    ].join('\n'));
    assert(lib.readLensEvidence(path.join(gate, 'lens-dup.md')) === null, 'duplicate header fields invalidate the evidence');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// The CLI is the producer of that evidence: it must refuse to write without a
// frozen manifest, reject unsafe names and non-integer findings, and bind the
// manifest's stagedHash; record-pass then refuses stale evidence and stores the
// bound entries in the marker.
function testRecordPassBindsLensEvidence() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-lensbind-'));
  const freeze = path.join(__dirname, 'freeze.js');
  const recordPass = path.join(__dirname, 'record-pass.js');
  const lensEvidence = path.join(__dirname, 'lens-evidence.js');
  const gate = path.join(tmp, '.gate');
  const lensFile = path.join(gate, 'lens-code.md');
  try {
    initRepo(tmp);
    writeFiles(tmp, { 'scripts/tool.js': 'x\n' });
    run('git', ['add', '-A'], { cwd: tmp });

    assert(runNode(lensEvidence, ['--help'], tmp, baseEnv()).status === 0, 'gate:lens --help should exit cleanly');

    let result = runNode(lensEvidence, ['--name', 'code', '--verdict', 'PASS', '--findings', '0'], tmp, baseEnv());
    assert(result.status === 1, 'gate:lens must refuse without a frozen manifest');
    assert(/manifest/i.test(result.stderr), 'the refusal should name the manifest');

    freezeRepo(tmp);

    result = runNode(lensEvidence, ['--name', '../evil', '--verdict', 'PASS', '--findings', '0'], tmp, baseEnv());
    assert(result.status === 1, 'gate:lens must refuse a name that is not a plain file stem');
    assert(!fs.readdirSync(gate).some((file) => file.includes('evil')), 'an invalid lens name must not write any evidence file');

    result = runNode(lensEvidence, ['--name', 'bogus', '--verdict', 'PASS', '--findings', '0'], tmp, baseEnv());
    assert(result.status === 1 && /allowlist/i.test(result.stderr), 'gate:lens must refuse a name outside the allowlist');

    result = runNode(lensEvidence, ['--name', 'code', '--verdict', 'PASS', '--findings', '1.5'], tmp, baseEnv());
    assert(result.status === 1, 'gate:lens must refuse non-integer findings');

    // Stale evidence must never be recorded as this snapshot's panel.
    fs.writeFileSync(lensFile, 'lens: code\nstagedHash: deadbeef\nverdict: PASS\nfindings: 0\n');
    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code', '--skip-requirements', 'test fixture only'], tmp, baseEnv());
    assert(result.status === 1, 'gate:pass must refuse a lens bound to another snapshot');
    assert(/stale/i.test(result.stderr) && /code/.test(result.stderr), 'the refusal should name the stale lens');
    assert(!fs.existsSync(path.join(gate, 'pass.json')), 'a stale lens must leave no marker');

    result = runNode(lensEvidence, ['--name', 'code', '--verdict', 'FAIL', '--findings', '2'], tmp, baseEnv());
    assert(result.status === 0, 'gate:lens should record a FAIL verdict');
    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security', '--skip-requirements', 'test fixture only'], tmp, baseEnv());
    assert(result.status === 1, 'gate:pass must refuse when a lens recorded FAIL');
    assert(/FAIL/.test(result.stderr), 'the refusal should name the failing verdict');
    assert(!fs.existsSync(path.join(gate, 'pass.json')), 'a failing lens must leave no marker');

    const symlinkTarget = path.join(tmp, 'outside.txt');
    fs.writeFileSync(symlinkTarget, 'do not touch\n');
    fs.symlinkSync(symlinkTarget, path.join(gate, 'lens-evil.md'));
    result = runNode(lensEvidence, ['--name', 'evil', '--verdict', 'PASS', '--findings', '0'], tmp, baseEnv());
    assert(result.status === 1, 'gate:lens must refuse to write through a symlink');
    assert(fs.readFileSync(symlinkTarget, 'utf8') === 'do not touch\n', 'a refused symlink must leave its target untouched');

    const danglingTarget = path.join(tmp, 'not-yet-created.txt');
    fs.symlinkSync(danglingTarget, path.join(gate, 'lens-ghost.md'));
    result = runNode(lensEvidence, ['--name', 'ghost', '--verdict', 'PASS', '--findings', '0'], tmp, baseEnv());
    assert(result.status === 1, 'gate:lens must refuse a dangling symlink');
    assert(!fs.existsSync(danglingTarget), 'a refused dangling symlink must not create its target');

    for (const name of ['code', 'security']) {
      result = runNode(lensEvidence, ['--name', name, '--verdict', 'PASS', '--findings', '1', '--notes', 'checked the diff'], tmp, baseEnv());
      assert(result.status === 0, `gate:lens should record ${name} (stderr: ${result.stderr})`);
    }
    const stagedHash = JSON.parse(fs.readFileSync(path.join(gate, 'manifest.json'), 'utf8')).stagedHash;
    const evidenceText = fs.readFileSync(lensFile, 'utf8');
    assert(evidenceText.startsWith('lens: code\n'), 'evidence must lead with the lens name');
    assert(evidenceText.includes(`stagedHash: ${stagedHash}`), 'evidence must bind the manifest stagedHash');
    assert(/checked the diff/.test(evidenceText), 'notes should be appended');

    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security', '--skip-requirements', 'test fixture only'], tmp, baseEnv());
    assert(result.status === 0, `gate:pass should record hash-bound lenses (stderr: ${result.stderr})`);
    const marker = JSON.parse(fs.readFileSync(path.join(gate, 'pass.json'), 'utf8'));
    assert(
      marker.lenses.length === 2 && marker.lenses.every((entry) => entry.stagedHash === stagedHash),
      'the marker must carry the hash-bound lens entries'
    );
    assert(
      marker.lenses.every((entry) => entry.findingsFile && Number.isInteger(entry.findings)),
      'the marker must carry each lens evidence file and finding count'
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// B: a non-trivial diff needs an executable plan, the lens set is closed, and
// the requirements lens can only be skipped with a recorded reason.
function testPlanPolicy() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-plan-'));
  const gate = path.join(tmp, '.gate');
  try {
    initRepo(tmp);
    fs.writeFileSync(path.join(tmp, 'seed.txt'), 'seed\n');
    run('git', ['add', 'seed.txt'], { cwd: tmp });
    run('git', ['-c', 'commit.gpgsign=false', 'commit', '-q', '--no-verify', '-m', 'seed'], { cwd: tmp });

    // A trivial diff freezes without a plan.
    fs.writeFileSync(path.join(tmp, 'README.md'), 'readme\n');
    run('git', ['add', 'README.md'], { cwd: tmp });
    let result = runNode(FREEZE_SCRIPT, [], tmp, baseEnv());
    assert(result.status === 0, `a trivial diff must freeze without a plan (stderr: ${result.stderr})`);

    // The acceptance requirement is non-trivial only: a checks-only plan is fine
    // for a trivial diff.
    fs.mkdirSync(gate, { recursive: true });
    fs.writeFileSync(path.join(gate, 'plan.md'), '# Plan\n\n## Checks\n- run: node -e "process.exit(0)"\n- expect: exit 0\n');
    result = runNode(FREEZE_SCRIPT, [], tmp, baseEnv());
    assert(result.status === 0, `a trivial diff must freeze with a checks-only plan (stderr: ${result.stderr})`);
    fs.rmSync(path.join(gate, 'plan.md'));

    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'scripts', 'tool.js'), 'module.exports = 1;\n');
    run('git', ['add', 'scripts/tool.js'], { cwd: tmp });

    result = runNode(FREEZE_SCRIPT, [], tmp, baseEnv());
    assert(result.status === 1 && /plan\.md/i.test(result.stderr), 'freeze must refuse a non-trivial diff without a plan');

    fs.mkdirSync(gate, { recursive: true });
    fs.writeFileSync(path.join(gate, 'plan.md'), '# Plan\n\nNo executable checks.\n');
    result = runNode(FREEZE_SCRIPT, [], tmp, baseEnv());
    assert(result.status === 1 && /executable|Checks/i.test(result.stderr), 'freeze must refuse a plan without runnable checks');

    fs.writeFileSync(path.join(gate, 'plan.md'), '# Plan\n\n## Checks\n- run: node -e "process.exit(0)"\n- expect: exit 0\n');
    result = runNode(FREEZE_SCRIPT, [], tmp, baseEnv());
    assert(
      result.status === 1 && /acceptance/i.test(result.stderr),
      'freeze must refuse a plan that states no acceptance criteria'
    );

    fs.writeFileSync(
      path.join(gate, 'plan.md'),
      '# Plan\n\n## Acceptance\n\n- the tool exits 0\n\n## Checks\n- run: node -e "process.exit(0)"\n- expect: exit 0\n'
    );
    result = runNode(FREEZE_SCRIPT, [], tmp, baseEnv());
    assert(result.status === 0, `freeze should accept a plan with criteria and checks (stderr: ${result.stderr})`);
    const manifest = JSON.parse(fs.readFileSync(path.join(gate, 'manifest.json'), 'utf8'));
    assert(/^[a-f0-9]{64}$/.test(manifest.planHash || ''), 'the manifest must hash the plan');
    const planText = fs.readFileSync(path.join(gate, 'plan.md'), 'utf8');

    const recordPass = path.join(__dirname, 'record-pass.js');
    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,bogus', '--skip-requirements', 'test fixture only'], tmp, baseEnv());
    assert(result.status === 1 && /unknown lens/i.test(result.stderr), 'gate:pass must reject unknown lens names');

    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security'], tmp, baseEnv());
    assert(result.status === 1 && /requirements/i.test(result.stderr), 'gate:pass must require requirements or a skip reason');

    fs.writeFileSync(path.join(gate, 'plan.md'), `${planText}\n- edited after freeze\n`);
    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security', '--skip-requirements', 'test fixture only'], tmp, baseEnv());
    assert(result.status === 1 && /plan\.md changed/i.test(result.stderr), 'gate:pass must refuse a plan edited after the freeze');

    fs.writeFileSync(path.join(gate, 'plan.md'), planText);
    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security', '--skip-requirements', 'short'], tmp, baseEnv());
    assert(result.status === 1 && /12 characters/i.test(result.stderr), 'gate:pass must refuse a too-short skip reason');

    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security', '--skip-requirements', 'no behaviour change'], tmp, baseEnv());
    assert(
      result.status === 1 && /no evidence for: code, security/i.test(result.stderr),
      'gate:pass must refuse a lens with no evidence file and name it'
    );

    recordLenses(tmp, ['code', 'security']);
    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'code,security', '--skip-requirements', 'no behaviour change'], tmp, baseEnv());
    assert(result.status === 0, `gate:pass should accept a recorded skip (stderr: ${result.stderr})`);
    const marker = JSON.parse(fs.readFileSync(path.join(gate, 'pass.json'), 'utf8'));
    assert(marker.skippedRequirements === 'no behaviour change', 'the marker must record the skip reason');

    recordLenses(tmp, ['architecture', 'code']);
    result = runNode(recordPass, ['--verdict', 'PASS', '--lenses', 'architecture,code', '--skip-requirements', 'no behaviour change'], tmp, baseEnv());
    assert(result.status === 0, `gate:pass should accept the architecture lens (stderr: ${result.stderr})`);

    // A stale manifest must not satisfy the hook's plan binding.
    const precommit = path.join(__dirname, 'precommit-check.js');
    const manifestPath = path.join(gate, 'manifest.json');
    const stale = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    fs.writeFileSync(manifestPath, `${JSON.stringify({ ...stale, stagedHash: 'deadbeef' }, null, 2)}\n`);
    result = runNode(precommit, [], tmp, baseEnv());
    assert(result.status === 1, 'the hook must refuse a manifest bound to another snapshot');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function main() {
  console.log('Running pre-commit gate tests...');
  testPureHelpers();
  testStagedHashTracksIndex();
  testListStagedFilesParsing();
  testGitlinkChangesAreVisibleAndGated();
  testEmptyCommitExemption();
  testHookFileIsExecutable();
  testHookContentDelegatesToChecker();
  testHookDecisionEndToEnd();
  testMarkerLifecycleThroughGit();
  testFreezeFailsClosedOutsideRepo();
  testRecordPassRequiresMatchingManifest();
  testRecordPassRequiresExplicitVerdict();
  testClassifierRules();
  testMarkerLensCountAndPanelRule();
  testLensEvidenceHelpers();
  testRecordPassBindsLensEvidence();
  testPlanPolicy();
  testRecordPassPanelRequirement();
  testHookVerifiesRecordedLenses();
  console.log('✅ Pre-commit gate tests passed');
}

main();
