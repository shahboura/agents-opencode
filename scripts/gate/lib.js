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
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PASS_VERDICTS = new Set(['PASS', 'PASS-WITH-CAVEATS']);

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

// Decide whether a marker approves the current staged tree. Pure: no I/O.
function evaluateMarker(passData, currentStagedHash) {
  if (!passData || typeof passData !== 'object') {
    return { allowed: false, reason: 'no pass marker found' };
  }
  if (!isPassVerdict(passData.verdict)) {
    return { allowed: false, reason: `pass marker verdict is '${passData.verdict}'` };
  }
  if (!passData.stagedHash || passData.stagedHash !== currentStagedHash) {
    return { allowed: false, reason: 'staged tree changed since the gate passed' };
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
  isPassVerdict,
  isSkipGate,
  readJson,
  evaluateMarker,
  consumeMarker,
};
