#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_STRING_FIELDS = ['goal', 'current_phase', 'last_updated'];
const REQUIRED_ARRAY_FIELDS = ['decisions', 'open_risks', 'blocked_by', 'next_actions', 'artifacts'];

function parseArgs(argv) {
  const options = {
    file: path.join(process.cwd(), 'state', 'session-state.json'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--file requires a path');
      }
      options.file = path.resolve(next);
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

  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function validateState(state, filePath) {
  const errors = [];
  const warnings = [];

  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    errors.push('Session state must be a JSON object');
    return { errors, warnings };
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof state[field] !== 'string' || state[field].trim().length === 0) {
      errors.push(`Missing or empty string field: ${field}`);
    }
  }

  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(state[field])) {
      errors.push(`Missing or non-array field: ${field}`);
      continue;
    }

    for (let i = 0; i < state[field].length; i += 1) {
      if (typeof state[field][i] !== 'string' || state[field][i].trim().length === 0) {
        errors.push(`Field ${field}[${i}] must be a non-empty string`);
      }
    }
  }

  if (typeof state.last_updated === 'string') {
    const timestamp = Date.parse(state.last_updated);
    if (Number.isNaN(timestamp)) {
      errors.push('last_updated must be a valid ISO-8601 timestamp');
    }
  }

  if (Array.isArray(state.blocked_by) && state.blocked_by.length > 0 && Array.isArray(state.next_actions) && state.next_actions.length === 0) {
    warnings.push('blocked_by is non-empty but next_actions is empty');
  }

  if (Array.isArray(state.artifacts)) {
    const root = process.cwd();
    for (const artifact of state.artifacts) {
      const artifactPath = path.resolve(root, artifact);
      if (!artifact.startsWith('http') && !fs.existsSync(artifactPath)) {
        warnings.push(`Artifact path does not exist: ${artifact}`);
      }
    }
  }

  if (warnings.length > 0 && filePath.includes(path.join('state', 'session-state.json'))) {
    warnings.push('Tip: update session-state artifacts/risks during each orchestration cycle');
  }

  return { errors, warnings };
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
    state = readState(options.file);
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
    return;
  }

  const { errors, warnings } = validateState(state, options.file);

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.log(`⚠ ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Session state validation failed:\n');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
    return;
  }

  console.log('✅ Session state validation passed');
}

main();
