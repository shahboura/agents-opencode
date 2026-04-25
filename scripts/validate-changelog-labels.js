#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const UNRELEASED_HEADING = /^##\s+\[Unreleased\]\s*$/i;
const RELEASE_HEADING = /^##\s+\[[^\]]+\]\s*/;
const BULLET_LINE = /^\*\s+/;
const CAPABILITY_LABEL = /^\*\s+\[capability:[a-z0-9-]+\]\s+/;

function parseArgs(argv) {
  const options = {
    changelog: path.join(process.cwd(), 'CHANGELOG.md'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--changelog') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--changelog requires a file path');
      }
      options.changelog = path.resolve(next);
      i += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function loadLines(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing changelog file: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
}

function findUnreleasedWindow(lines) {
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (UNRELEASED_HEADING.test(lines[i].trim())) {
      start = i;
      break;
    }
  }

  if (start === -1) {
    throw new Error('Missing "## [Unreleased]" section in changelog');
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (RELEASE_HEADING.test(lines[i].trim())) {
      end = i;
      break;
    }
  }

  return {
    start,
    end,
  };
}

function validateUnreleasedLabels(lines, window) {
  const issues = [];

  for (let i = window.start + 1; i < window.end; i += 1) {
    const line = lines[i].trim();
    if (!BULLET_LINE.test(line)) {
      continue;
    }

    if (!CAPABILITY_LABEL.test(line)) {
      issues.push({
        lineNumber: i + 1,
        line,
        message: 'Unreleased bullet is missing required [capability:<label>] prefix',
      });
    }
  }

  return issues;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
    return;
  }

  let lines;
  try {
    lines = loadLines(options.changelog);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
    return;
  }

  let unreleasedWindow;
  try {
    unreleasedWindow = findUnreleasedWindow(lines);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
    return;
  }

  const issues = validateUnreleasedLabels(lines, unreleasedWindow);
  if (issues.length > 0) {
    console.error('❌ Changelog capability labels validation failed:\n');
    for (const issue of issues) {
      console.error(`- CHANGELOG.md:${issue.lineNumber} ${issue.message}`);
      console.error(`  ${issue.line}`);
    }
    process.exit(1);
    return;
  }

  console.log('✅ Changelog capability labels validation passed');
}

main();
