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

// S2: existence + the executable bit are not enough. A tracked, executable hook
// can still be neutered in place — rewritten to `exit 0`, emptied, or its
// delegation commented out — and the commit would then land with no panel, so
// assert the committed hook content actually delegates to the gate checker.
// Neutering enforcement therefore always requires a visible, reviewable edit to
// this assertion too. Comments are stripped first: a commented-out delegation
// must not count as live enforcement, and a live `exit 0` cannot preempt the
// checker. The missing-file case is covered by fs.existsSync (a hook removed
// from the tree is silently skipped by git).
function testHookContentDelegatesToChecker() {
  const hookPath = path.join(__dirname, '..', '..', '.githooks', 'pre-commit');
  assert(fs.existsSync(hookPath), '.githooks/pre-commit must exist — git silently skips a missing hook');
  const activeLines = fs.readFileSync(hookPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  assert(
    activeLines.some((line) => /\bnode\b/.test(line) && line.includes('precommit-check.js')),
    `.githooks/pre-commit must delegate to scripts/gate/precommit-check.js; live content: ${JSON.stringify(activeLines)}`
  );
  assert(
    !activeLines.includes('exit 0'),
    '.githooks/pre-commit must not be neutered with an unconditional `exit 0`'
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

  const nonTrivial = lib.classifyStagedDiff(['scripts/gate/lib.js']);
  const trivial = lib.classifyStagedDiff(['README.md']);
  assert(nonTrivial.nonTrivial && !trivial.nonTrivial, 'classification fixtures must match their rule');

  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash, nonTrivial).allowed, 'non-trivial + legacy 0-lens marker must block');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: ['code'] }, hash, nonTrivial).allowed, 'non-trivial + 1 lens must block');
  assert(!lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: ['code', 'code'] }, hash, nonTrivial).allowed, 'non-trivial + duplicate lenses must block');
  assert(lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash, lenses: ['code', 'security'] }, hash, nonTrivial).allowed, 'non-trivial + 2 lenses must allow');
  assert(lib.evaluateMarker({ verdict: 'PASS', stagedHash: hash }, hash, trivial).allowed, 'trivial + 0 lenses must allow');
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
    { name: 'non-trivial risk path + 2 lenses allows', files: { 'scripts/tool.js': 'x\n' }, lenses: ['code', 'security'], allowed: true },
    { name: 'non-trivial file count + 0 lenses refuses', files: { 'docs/a.md': 'a\n', 'docs/b.md': 'b\n', 'docs/c.md': 'c\n' }, lenses: [], allowed: false },
    { name: 'trivial 2 files + 0 lenses allows', files: { 'docs/a.md': 'a\n', 'docs/b.md': 'b\n' }, lenses: [], allowed: true },
  ];

  for (const c of cases) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-panel-'));
    try {
      initRepo(tmp);
      writeFiles(tmp, c.files);
      run('git', ['add', '-A'], { cwd: tmp });

      let result = runNode(freeze, [], tmp, baseEnv());
      assert(result.status === 0, `${c.name}: freeze should succeed`);

      const lensArgs = c.lenses.length > 0 ? ['--lenses', c.lenses.join(',')] : [];
      result = runNode(recordPass, ['--verdict', 'PASS', ...lensArgs], tmp, baseEnv());
      const markerPath = path.join(tmp, '.gate', 'pass.json');

      if (c.allowed) {
        assert(result.status === 0, `${c.name}: record-pass should allow (stderr: ${result.stderr})`);
        assert(fs.existsSync(markerPath), `${c.name}: allowed pass must write the marker`);
        const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
        assert(marker.lenses.length === c.lenses.length, `${c.name}: marker should record the lenses`);
        // Parity: the hook must accept exactly what record-pass accepted.
        result = runNode(precommit, [], tmp, baseEnv());
        assert(result.status === 0, `${c.name}: hook should accept a valid marker`);
        assert(!fs.existsSync(markerPath), `${c.name}: hook should consume the marker`);
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
    { name: 'non-trivial + 2-lens marker allows', files: { 'scripts/tool.js': 'x\n' }, lenses: ['code', 'security'], allowed: true },
    { name: 'trivial + legacy marker (no lenses) allows', files: { 'README.md': 'x\n' }, lenses: undefined, allowed: true },
  ];

  for (const c of cases) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-hooklens-'));
    try {
      initRepo(tmp);
      writeFiles(tmp, c.files);
      run('git', ['add', '-A'], { cwd: tmp });

      const marker = { verdict: 'PASS', stagedHash: lib.computeStagedHash(tmp), timestamp: new Date().toISOString() };
      if (c.lenses) {
        marker.lenses = c.lenses;
      }
      fs.mkdirSync(path.join(tmp, '.gate'), { recursive: true });
      fs.writeFileSync(path.join(tmp, '.gate', 'pass.json'), `${JSON.stringify(marker, null, 2)}\n`);

      const result = runNode(precommit, [], tmp, baseEnv());
      if (c.allowed) {
        assert(result.status === 0, `${c.name}: hook should allow (stderr: ${result.stderr})`);
      } else {
        assert(result.status === 1, `${c.name}: hook should block`);
        assert(/lenses/i.test(result.stderr), `${c.name}: block should mention the lens requirement`);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
}

function main() {
  console.log('Running pre-commit gate tests...');
  testPureHelpers();
  testStagedHashTracksIndex();
  testListStagedFilesParsing();
  testHookFileIsExecutable();
  testHookContentDelegatesToChecker();
  testHookDecisionEndToEnd();
  testFreezeFailsClosedOutsideRepo();
  testRecordPassRequiresMatchingManifest();
  testClassifierRules();
  testMarkerLensCountAndPanelRule();
  testRecordPassPanelRequirement();
  testHookVerifiesRecordedLenses();
  console.log('✅ Pre-commit gate tests passed');
}

main();
