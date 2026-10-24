#!/usr/bin/env node
'use strict';

/**
 * Record one lens's verdict for the frozen Review Gate snapshot.
 *
 * Writes .gate/lens-<lowercased name>.md carrying the manifest's `stagedHash`,
 * so `gate:pass` verifies that every lens actually reviewed the snapshot being
 * committed instead of trusting a self-reported lens name. Requires
 * .gate/manifest.json (`gate:freeze`): evidence with no bound snapshot is
 * worthless, so it is refused rather than written.
 */

const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

const USAGE = [
  'Usage: npm run gate:lens -- --name <lens> --verdict PASS|FAIL --findings <int> [--notes "text"]',
  'Run `npm run gate:freeze` first: the evidence binds to manifest.stagedHash.',
];

const LENS_VERDICTS = ['PASS', 'FAIL'];

function flagValue(argv, index) {
  const next = argv[index + 1];
  return next && !next.startsWith('--') ? next : null;
}

function parseArgs(argv) {
  const options = { name: null, verdict: null, findings: null, notes: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--name') {
      options.name = flagValue(argv, i);
      i += 1;
    } else if (arg.startsWith('--name=')) {
      options.name = arg.slice('--name='.length) || null;
    } else if (arg === '--verdict') {
      options.verdict = flagValue(argv, i);
      i += 1;
    } else if (arg.startsWith('--verdict=')) {
      options.verdict = arg.slice('--verdict='.length) || null;
    } else if (arg === '--findings') {
      options.findings = flagValue(argv, i);
      i += 1;
    } else if (arg.startsWith('--findings=')) {
      options.findings = arg.slice('--findings='.length) || null;
    } else if (arg === '--notes') {
      options.notes = flagValue(argv, i);
      i += 1;
    } else if (arg.startsWith('--notes=')) {
      options.notes = arg.slice('--notes='.length) || null;
    }
  }
  return options;
}

function main() {
  const repoRoot = process.cwd();
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    for (const line of USAGE) {
      console.log(line);
    }
    return 0;
  }

  if (!options.name) {
    console.error('❌ gate:lens requires --name <lens>.');
    for (const line of USAGE) {
      console.error(`   ${line}`);
    }
    return 1;
  }

  if (!lib.isSafeLensName(options.name)) {
    console.error(`❌ gate:lens refuses lens name '${options.name}' — use letters, digits and hyphens only.`);
    return 1;
  }

  // Refuse unknown lenses here rather than after the panel has run.
  if (!lib.isAllowedLensName(options.name)) {
    console.error(`❌ gate:lens refuses lens name '${options.name}' — not in the allowlist.`);
    console.error(`   Allowed lenses: ${lib.ALLOWED_LENSES.join(', ')}`);
    return 1;
  }

  if (!LENS_VERDICTS.includes(options.verdict)) {
    console.error(`❌ gate:lens refuses verdict '${options.verdict}' — expected PASS or FAIL.`);
    return 1;
  }

  if (!/^\d+$/.test(String(options.findings === null ? '' : options.findings).trim())) {
    console.error(`❌ gate:lens requires --findings <int> (a non-negative integer, got '${options.findings}').`);
    return 1;
  }
  const findings = Number.parseInt(options.findings, 10);

  const manifest = lib.readJson(lib.manifestPath(repoRoot));
  if (!manifest || !manifest.stagedHash) {
    console.error('❌ gate:lens requires .gate/manifest.json — run `npm run gate:freeze` first.');
    return 1;
  }

  const gate = lib.gateDir(repoRoot);
  fs.mkdirSync(gate, { recursive: true });
  const evidencePath = path.join(gate, `lens-${options.name.toLowerCase()}.md`);
  // The evidence file is written, not followed: a pre-existing symlink (even a
  // dangling one) would truncate its target. Refuse instead of unlinking
  // someone else's file.
  let existing = null;
  try {
    existing = fs.lstatSync(evidencePath);
  } catch {
    existing = null;
  }
  if (existing && existing.isSymbolicLink()) {
    console.error(`❌ gate:lens refusing to write through a symlink: ${evidencePath}`);
    return 1;
  }
  const lines = [
    `lens: ${options.name}`,
    `stagedHash: ${manifest.stagedHash}`,
    `verdict: ${options.verdict}`,
    `findings: ${findings}`,
    `createdAt: ${new Date().toISOString()}`,
  ];
  const notes = options.notes && options.notes.trim();
  fs.writeFileSync(evidencePath, `${lines.join('\n')}\n${notes ? `\n${notes}\n` : ''}`);

  console.log(`✅ Lens evidence recorded: ${options.name} ${options.verdict} (${findings} finding(s))`);
  console.log(`   File:  ${evidencePath}`);
  console.log(`   Bound: ${manifest.stagedHash}`);
  console.log('   Record the panel with `npm run gate:pass -- --verdict PASS --lenses <names>`.');
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (err) {
    console.error(`❌ gate:lens failed: ${err.message}`);
    process.exit(1);
  }
}
