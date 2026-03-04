#!/usr/bin/env node
'use strict';

/**
 * Agent Configuration Validator
 * Validates OpenCode agent .md files in .opencode/agent/
 */

const fs = require('fs');
const path = require('path');

// Colors for output (matches install.js pattern)
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function main() {
  const errors = [];
  const warnings = [];
  const agentDir = path.join(process.cwd(), '.opencode', 'agent');

  log(colors.cyan, 'Validating Agent Configurations...');

  // Check agent directory exists
  if (!fs.existsSync(agentDir)) {
    log(colors.red, 'ERROR: No agent directory found (.opencode/agent)');
    process.exit(1);
  }

  log(colors.green, 'Found OpenCode agents directory');

  // Find agent .md files, excluding README.md
  let agentFiles;
  try {
    agentFiles = fs.readdirSync(agentDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .map(f => ({ name: f, fullPath: path.join(agentDir, f) }));
  } catch (err) {
    log(colors.red, `ERROR: Failed to read agent directory - ${err.message}`);
    process.exit(1);
  }

  if (agentFiles.length === 0) {
    log(colors.red, 'ERROR: No agent files found');
    process.exit(1);
  }

  log(colors.green, `Found ${agentFiles.length} agent files\n`);

  const requiredFields = ['description', 'mode'];
  const validModes = ['primary', 'secondary', 'utility', 'subagent'];

  for (const file of agentFiles) {
    log(colors.yellow, `Validating: ${file.name}`);

    let content;
    try {
      content = fs.readFileSync(file.fullPath, 'utf8');
    } catch (err) {
      errors.push(`${file.name}: Failed to read file - ${err.message}`);
      continue;
    }

    // Check for frontmatter delimited by ---
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]+?)\n---/);
    if (!frontmatterMatch) {
      errors.push(`${file.name}: Missing frontmatter (---...---)`);
      continue;
    }

    const frontmatter = frontmatterMatch[1];

    // Check required fields (anchored to reject commented-out lines)
    for (const field of requiredFields) {
      const fieldRegex = new RegExp(`^(?!\\s*#)\\s*${field}\\s*:`, 'm');
      if (!fieldRegex.test(frontmatter)) {
        errors.push(`${file.name}: Missing required field '${field}'`);
      }
    }

    // Check mode value (anchored to reject commented-out lines)
    const modeMatch = frontmatter.match(/^(?!\s*#)\s*mode\s*:\s*(.+)/m);
    if (modeMatch) {
      const mode = modeMatch[1].trim();
      if (!validModes.includes(mode)) {
        warnings.push(`${file.name}: Unusual mode value: '${mode}' (expected: primary, secondary, utility, or subagent)`);
      }
    }

    // Check for permission section
    if (!/^permission\s*:/m.test(frontmatter)) {
      warnings.push(`${file.name}: Missing 'permission' section`);
    }

    // Check for a meaningful introductory heading in body
    // Accept: Role, Description, Responsibilities, Core Responsibilities,
    //         Review Areas, Profile Detection, When to Use, Core Principle, etc.
    if (!/^##?\s+\w/m.test(content.replace(/^---[\s\S]+?---/, ''))) {
      warnings.push(`${file.name}: Missing content headings`);
    }

    log(colors.green, '  ✓ Basic structure valid');
  }

  // Results
  console.log('');
  log(colors.cyan, '================================');
  log(colors.cyan, 'Validation Results');
  log(colors.cyan, '================================');

  if (errors.length === 0 && warnings.length === 0) {
    log(colors.green, '✅ All agents validated successfully!');
    process.exit(0);
  }

  if (errors.length > 0) {
    log(colors.red, `\n❌ ERRORS (${errors.length}):`);
    for (const err of errors) {
      log(colors.red, `  • ${err}`);
    }
  }

  if (warnings.length > 0) {
    log(colors.yellow, `\n⚠️  WARNINGS (${warnings.length}):`);
    for (const warn of warnings) {
      log(colors.yellow, `  • ${warn}`);
    }
    log(colors.green, '\n✅ Validation complete (warnings only)');
  }

  if (errors.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main();
