#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const options = {
    state: path.join(process.cwd(), 'state', 'session-state.json'),
    out: path.join(process.cwd(), 'handoff', 'latest.md'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--state') {
      options.state = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--out') {
      options.out = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readState(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing session state file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function asBulletList(values, fallback = '- (none)') {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }

  return values.map((value) => `- ${value}`).join('\n');
}

function renderMarkdown(state) {
  const timestamp = new Date().toISOString();

  return `# Handoff Packet

Generated: ${timestamp}

## Objective

${state.goal || '(missing goal)'}

## Current Phase

${state.current_phase || '(missing current phase)'}

## Decisions

${asBulletList(state.decisions)}

## Open Risks

${asBulletList(state.open_risks)}

## Blockers

${asBulletList(state.blocked_by)}

## Next 3 Actions

${asBulletList((state.next_actions || []).slice(0, 3))}

## Key Artifacts

${asBulletList(state.artifacts)}

## Source State Timestamp

${state.last_updated || '(missing last_updated)'}
`;
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

  let state;
  try {
    state = readState(options.state);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
    return;
  }

  const content = renderMarkdown(state);
  fs.mkdirSync(path.dirname(options.out), { recursive: true });
  fs.writeFileSync(options.out, content, 'utf8');

  console.log('✅ Handoff packet generated');
  console.log(`- State: ${options.state}`);
  console.log(`- Output: ${options.out}`);
}

main();
