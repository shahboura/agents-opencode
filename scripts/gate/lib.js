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
 * `stagedHash` matches the current index, and never consumes the marker. A
 * staged tree identical to the parent tree (`HEAD^{tree}`; the empty tree for
 * an unborn HEAD) is exempt outright — the commit changes no content. Tree
 * equality, not the staged name list, is load-bearing (S1): the name list can
 * hide gitlink (submodule) changes that the commit itself includes. The
 * versioned post-commit hook deletes the marker once the commit object exists,
 * so an aborted commit keeps the approval, and any successful `git commit` —
 * including `--no-verify` and empty commits — consumes a pending marker.
 * Residual: if post-commit is missing or inert, or the commit is created by
 * `git merge` (which runs post-merge, not post-commit), a marker lingers; it
 * binds the staged TREE (not the diff against a base), so it could re-approve
 * the SAME tree once HEAD has moved.
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

// Well-known SHA-1 hash of the empty tree; last-resort fallback for the
// unborn-HEAD comparison when git itself cannot resolve the empty tree.
const EMPTY_TREE_HASH = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

// Tree hash of HEAD — the parent tree a pending commit would extend. Deciding
// the empty-commit exemption on tree equality (write-tree vs this) is what
// makes a gitlink-only "empty list" impossible to exempt: `write-tree` includes
// gitlink entries even when diff-based listing goes blind (S1). For an unborn
// HEAD there is no commit to compare against, so the terminus is the empty
// tree — resolved through git itself (`git mktree`) so the hash matches the
// repository's object format (SHA-1/SHA-256).
function computeHeadTree(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--verify', 'HEAD^{tree}'], { cwd, encoding: 'utf8' }).trim();
  } catch {
    try {
      return execFileSync('git', ['mktree'], { cwd, encoding: 'utf8', input: '' }).trim();
    } catch {
      return EMPTY_TREE_HASH;
    }
  }
}

// Staged file list from the git index (repo-relative paths). NUL-separated so
// paths with spaces or non-ASCII characters come back verbatim instead of
// C-quoted, which keeps the classifier input exact. `--no-renames` is
// load-bearing (G2): with rename detection on, git reports only the rename
// destination, so `git mv scripts/x.js docs/x.js` would hide the risk path;
// with it off the rename is a delete + add and BOTH sides are listed. The flag
// also overrides any `diff.renames` config. `--ignore-submodules=none` is
// load-bearing (S1) for the same reason: a `diff.ignoreSubmodules` config (or
// a git default of `all`) hides gitlink changes here while the commit still
// moves the submodule pointer.
function listStagedFiles(cwd) {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--no-renames', '--ignore-submodules=none', '-z'], { cwd, encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

// Repo-relative paths of staged changes that involve a gitlink (index mode
// 160000, i.e. a submodule pointer). Only the pointer appears in the
// superproject diff — the submodule content it references is not reviewable
// from it — so the classifier treats any staged gitlink as non-trivial. Parses the raw diff
// because `--name-only` drops the mode; `--no-renames` keeps every record a
// meta/path pair (with -z, a rename record would carry two paths), and NUL
// separation keeps paths with spaces/non-ASCII verbatim.
function listStagedGitlinks(cwd) {
  const out = execFileSync(
    'git',
    ['diff', '--cached', '--raw', '-z', '--no-renames', '--ignore-submodules=none'],
    { cwd, encoding: 'utf8' }
  );
  const parts = out.split('\0');
  const gitlinkPaths = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const meta = parts[i];
    if (!meta.startsWith(':')) {
      continue;
    }
    const [oldMode, newMode] = meta.slice(1).split(' ');
    if (oldMode === '160000' || newMode === '160000') {
      gitlinkPaths.push(parts[i + 1]);
    }
  }
  return gitlinkPaths;
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
// Non-trivial when it touches more than NON_TRIVIAL_FILE_LIMIT files, any
// path matched by RISK_PATH_RULES, or any staged gitlink (submodule pointer)
// reported by the caller in `options.gitlinkPaths` (normally from
// listStagedGitlinks): only the pointer appears in the superproject diff, so
// the content a gitlink references cannot be reviewed from it — a gitlink must
// never pass as a trivial Tier 1 change. Trivial otherwise (e.g. docs-only
// changes or at most 2 non-risk files).
function classifyStagedDiff(files, options) {
  const paths = (Array.isArray(files) ? files : [])
    .filter((file) => typeof file === 'string' && file.trim())
    .map((file) => normalizeRepoPath(file.trim()));
  const gitlinkPaths = ((options && Array.isArray(options.gitlinkPaths)) ? options.gitlinkPaths : [])
    .filter((file) => typeof file === 'string' && file.trim())
    .map((file) => normalizeRepoPath(file.trim()));
  const riskPaths = paths.filter(isRiskPath);
  const nonTrivial = paths.length > NON_TRIVIAL_FILE_LIMIT || riskPaths.length > 0 || gitlinkPaths.length > 0;

  const reasons = [];
  if (paths.length > NON_TRIVIAL_FILE_LIMIT) {
    reasons.push(`${paths.length} staged files (more than ${NON_TRIVIAL_FILE_LIMIT}): ${formatFileList(paths)}`);
  }
  if (riskPaths.length > 0) {
    reasons.push(`risk path(s): ${formatFileList(riskPaths)}`);
  }
  if (gitlinkPaths.length > 0) {
    reasons.push(`gitlink (submodule) change(s): ${formatFileList(gitlinkPaths)}`);
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
// The versioned post-commit hook performs this deletion shell-side after a
// successful commit; this helper is the programmatic equivalent used by tests.
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
  computeHeadTree,
  listStagedFiles,
  listStagedGitlinks,
  classifyStagedDiff,
  markerLensCount,
  isPassVerdict,
  isSkipGate,
  readJson,
  evaluateMarker,
  consumeMarker,
  EMPTY_TREE_HASH,
  RISK_PATH_RULES,
  NON_TRIVIAL_FILE_LIMIT,
  MIN_NON_TRIVIAL_LENSES,
};
