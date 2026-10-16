'use strict';

/**
 * Pure, testable helpers for the versioned Pre-Commit Review Gate.
 *
 * The gate is enforced by three artifacts:
 *   - .gate/diff.patch    frozen snapshot handed to review lenses
 *   - .gate/manifest.json base/head SHA + staged-tree hash written by `gate:freeze`
 *   - .gate/pass.json     approval marker written by `gate:pass`
 *
 * `precommit-check.js` only allows a commit when a PASS marker exists whose
 * `stagedHash` matches the current index, then consumes the marker.
 *
 * `classifyStagedDiff` is the single source of truth for gate tiering: a
 * non-trivial staged diff requires a Tier 2 panel of at least
 * MIN_NON_TRIVIAL_LENSES lenses, and both `gate:pass` and the hook enforce
 * that rule through `evaluateMarker` so they can never diverge.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PASS_VERDICTS = new Set(['PASS', 'PASS-WITH-CAVEATS']);

// Staged-diff risk surface: a change under any of these prefixes, to one of
// these root files, or to a lockfile at any depth is non-trivial no matter how
// few files it touches. Matching is case-folded on both sides (G4): on a
// case-insensitive filesystem `Scripts/` names the same tree as `scripts/`, so
// without folding a retyped path could slip a risk change past the gate.
const RISK_PATH_RULES = Object.freeze({
  prefixes: ['scripts/', '.opencode/', '.github/', '.githooks/', 'site/', 'evals/', 'adapters/'],
  // Comparison is against the case-folded path, so root-file entries must stay
  // lower-case. AGENTS.md is session-injected context (same family as
  // .opencode/): a one-file edit must still require the panel (S3).
  rootFiles: ['install.js', 'package.json', 'opencode.json', '.gitleaks.toml', 'agents.md'],
  // Lockfiles at any depth: the root one plus nested copies.
  lockfileNames: ['package-lock.json'],
});

// A staged diff touching more than this many files is non-trivial.
const NON_TRIVIAL_FILE_LIMIT = 2;

// Minimum Tier 2 panel size for a non-trivial staged diff.
const MIN_NON_TRIVIAL_LENSES = 2;

function gateDir(repoRoot) {
  return path.join(repoRoot, '.gate');
}

function diffPath(repoRoot) {
  return path.join(gateDir(repoRoot), 'diff.patch');
}

function manifestPath(repoRoot) {
  return path.join(gateDir(repoRoot), 'manifest.json');
}

function passMarkerPath(repoRoot) {
  return path.join(gateDir(repoRoot), 'pass.json');
}

// Hash of the exact staged tree (git index). Deterministic for a given index.
function computeStagedHash(cwd) {
  return execFileSync('git', ['write-tree'], { cwd, encoding: 'utf8' }).trim();
}

// Staged file list from the git index (repo-relative paths). NUL-separated so
// paths with spaces or non-ASCII characters come back verbatim instead of
// C-quoted, which keeps the classifier input exact. `--no-renames` is
// load-bearing (G2): with rename detection on, git reports only the rename
// destination, so `git mv scripts/x.js docs/x.js` would hide the risk path;
// with it off the rename is a delete + add and BOTH sides are listed. The flag
// also overrides any `diff.renames` config.
function listStagedFiles(cwd) {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--no-renames', '-z'], { cwd, encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

// Normalize a repo-relative path: forward slashes, no leading './'.
function normalizeRepoPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function isRiskPath(filePath) {
  // Case-folded on both sides (G4) so a case variant cannot bypass the gate.
  const normalized = normalizeRepoPath(filePath).toLowerCase();
  return RISK_PATH_RULES.rootFiles.includes(normalized)
    || RISK_PATH_RULES.prefixes.some((prefix) => normalized.startsWith(prefix))
    || RISK_PATH_RULES.lockfileNames.includes(path.basename(normalized));
}

// Join a path list into a single line, bounded so refusal messages stay readable.
function formatFileList(files, max = 12) {
  if (files.length <= max) {
    return files.join(', ');
  }
  return `${files.slice(0, max).join(', ')}, (+${files.length - max} more)`;
}

// Pure: classify a staged file list as trivial or non-trivial.
// Non-trivial when it touches more than NON_TRIVIAL_FILE_LIMIT files or any
// path matched by RISK_PATH_RULES; trivial otherwise (e.g. docs-only changes
// or at most 2 non-risk files).
function classifyStagedDiff(files) {
  const paths = (Array.isArray(files) ? files : [])
    .filter((file) => typeof file === 'string' && file.trim())
    .map((file) => normalizeRepoPath(file.trim()));
  const riskPaths = paths.filter(isRiskPath);
  const nonTrivial = paths.length > NON_TRIVIAL_FILE_LIMIT || riskPaths.length > 0;

  const reasons = [];
  if (paths.length > NON_TRIVIAL_FILE_LIMIT) {
    reasons.push(`${paths.length} staged files (more than ${NON_TRIVIAL_FILE_LIMIT}): ${formatFileList(paths)}`);
  }
  if (riskPaths.length > 0) {
    reasons.push(`risk path(s): ${formatFileList(riskPaths)}`);
  }

  return { nonTrivial, fileCount: paths.length, riskPaths, reasons };
}

function isPassVerdict(verdict) {
  return PASS_VERDICTS.has(verdict);
}

function isSkipGate(env) {
  return ((env || process.env).SKIP_GATE === '1');
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// Number of DISTINCT lenses recorded in a marker (G6): trimmed, case-folded
// names, so `["code", "Code", " code "]` counts once and `--lenses code,code`
// cannot fake a Tier 2 panel. Legacy markers predating the `lenses` field (or
// with a malformed value) count as 0, which fails closed for non-trivial diffs
// without crashing the hook.
function markerLensCount(passData) {
  if (!passData || !Array.isArray(passData.lenses)) {
    return 0;
  }
  const distinct = new Set();
  for (const lens of passData.lenses) {
    if (typeof lens === 'string' && lens.trim()) {
      distinct.add(lens.trim().toLowerCase());
    }
  }
  return distinct.size;
}

// Decide whether a marker approves the current staged tree. Pure: no I/O.
// `classification` (from classifyStagedDiff) is REQUIRED (G5): omitting it
// would silently skip the lens rule, so a missing or malformed value throws
// instead of failing open. When the diff is non-trivial the marker must record
// a Tier 2 panel of at least MIN_NON_TRIVIAL_LENSES distinct lenses, so a
// single-lens (or legacy 0-lens) marker cannot approve a risk-surface change.
function evaluateMarker(passData, currentStagedHash, classification) {
  if (!classification || typeof classification.nonTrivial !== 'boolean') {
    throw new TypeError('evaluateMarker requires the classification from classifyStagedDiff(); refusing to skip the lens rule.');
  }
  if (!passData || typeof passData !== 'object') {
    return { allowed: false, reason: 'no pass marker found' };
  }
  if (!isPassVerdict(passData.verdict)) {
    return { allowed: false, reason: `pass marker verdict is '${passData.verdict}'` };
  }
  if (!passData.stagedHash || passData.stagedHash !== currentStagedHash) {
    return { allowed: false, reason: 'staged tree changed since the gate passed' };
  }
  if (classification.nonTrivial) {
    const lensCount = markerLensCount(passData);
    if (lensCount < MIN_NON_TRIVIAL_LENSES) {
      return {
        allowed: false,
        reason: `non-trivial diff requires a Tier 2 panel of at least ${MIN_NON_TRIVIAL_LENSES} lenses; the marker records ${lensCount} distinct lens(es)`,
      };
    }
  }
  return { allowed: true, reason: 'gate pass marker matches the staged tree' };
}

// Remove the marker so a single approval cannot be reused for a later diff.
function consumeMarker(markerPath) {
  if (!fs.existsSync(markerPath)) {
    return false;
  }
  fs.rmSync(markerPath, { force: true });
  return true;
}

module.exports = {
  gateDir,
  diffPath,
  manifestPath,
  passMarkerPath,
  computeStagedHash,
  listStagedFiles,
  classifyStagedDiff,
  markerLensCount,
  isPassVerdict,
  isSkipGate,
  readJson,
  evaluateMarker,
  consumeMarker,
  RISK_PATH_RULES,
  NON_TRIVIAL_FILE_LIMIT,
  MIN_NON_TRIVIAL_LENSES,
};
