#!/usr/bin/env node
'use strict';

/**
 * Context File Size Monitor
 * Checks AGENTS.md size and prunes oldest entries if over 100KB.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

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

const MAX_ENTRY_BULLETS = 5;

function splitEntries(entriesBlock) {
  return entriesBlock
    .split(/^(?=### )/m)
    .filter(entry => entry.trim() !== '');
}

function countTopLevelBullets(entry) {
  return entry
    .split(/\r?\n/)
    .filter(line => /^-\s+/.test(line.trim()))
    .length;
}

function warnEntryQuality(entryList) {
  let warningCount = 0;

  for (const entry of entryList) {
    const headerLine = entry.split(/\r?\n/).find(line => line.startsWith('### ')) || '### Unknown entry';
    const bulletCount = countTopLevelBullets(entry);
    if (bulletCount > MAX_ENTRY_BULLETS) {
      warningCount += 1;
      log(colors.yellow, `WARNING: ${headerLine} has ${bulletCount} top-level bullets (recommended max: ${MAX_ENTRY_BULLETS})`);
    }
  }

  return warningCount;
}

const MAX_INSTRUCTION_LINES = 200;
const MAX_SKILL_LINES = 200;
const MAX_AGENT_LINES = 200;

function checkFileGroup(dirPath, label, maxLines, filePattern) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return 0;
  }

  const results = [];

  if (filePattern) {
    // Flat files (agents, instructions): match by filename pattern
    for (const entry of entries) {
      if (!entry.isFile() || !filePattern.test(entry.name)) continue;
      const filePath = path.join(dirPath, entry.name);
      let content;
      try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }
      results.push({ name: entry.name, lines: content.trimEnd().split(/\r?\n/).length });
    }
  } else {
    // Directory-based (skills): each dir contains SKILL.md
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillFile = path.join(dirPath, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      let content;
      try { content = fs.readFileSync(skillFile, 'utf8'); } catch { continue; }
      results.push({ name: entry.name, lines: content.trimEnd().split(/\r?\n/).length });
    }
  }

  results.sort((a, b) => b.lines - a.lines);
  const warnings = results.filter((r) => r.lines > maxLines);

  if (warnings.length > 0) {
    for (const w of warnings) {
      log(colors.yellow, `WARNING: ${w.name} has ${w.lines} lines (max: ${maxLines})`);
    }
  } else if (results.length > 0) {
    log(colors.green, `✅ All ${label.toLowerCase()} are within budget`);
  }

  if (results.length > 0) {
    const top = results.slice(0, 5);
    log(colors.cyan, `${label} sizes (top 5):`);
    for (const r of top) {
      log(r.lines > maxLines ? colors.yellow : colors.green, `  ${r.lines} lines - ${r.name}`);
    }
  }

  return warnings.length;
}

function checkSkillFiles() {
  const skillsDir = path.join(process.cwd(), '.opencode', 'skills');
  return checkFileGroup(skillsDir, 'Skills', MAX_SKILL_LINES, null);
}

function checkAgentFiles() {
  const agentsDir = path.join(process.cwd(), '.opencode', 'agents');
  return checkFileGroup(agentsDir, 'Agents', MAX_AGENT_LINES, /\.md$/);
}

function checkInstructionFiles() {
  const instructionsDir = path.join(process.cwd(), '.opencode', 'instructions');
  return checkFileGroup(instructionsDir, 'Instructions', MAX_INSTRUCTION_LINES, /\.md$/);
}

function main() {
  const MAX_SIZE_KB = 100;
  const PRUNE_TO_KB = 75;
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check') || args.includes('--dry-run');

  // Check for global installation first, then local
  const globalContextFile = path.join(os.homedir(), '.config', 'opencode', 'AGENTS.md');
  const localContextFile = path.join(process.cwd(), 'AGENTS.md');

  let contextFile = null;
  if (fs.existsSync(globalContextFile)) {
    contextFile = globalContextFile;
  } else if (fs.existsSync(localContextFile)) {
    contextFile = localContextFile;
  }

  let budgetViolations = 0;

  log(colors.cyan, 'Checking instruction file budgets...');
  budgetViolations += checkInstructionFiles();
  console.log('');
  log(colors.cyan, 'Checking skill file budgets...');
  budgetViolations += checkSkillFiles();
  console.log('');
  log(colors.cyan, 'Checking agent file budgets...');
  budgetViolations += checkAgentFiles();
  console.log('');
  log(colors.cyan, 'Checking context file size...');

  if (budgetViolations > 0 && checkOnly) {
    log(colors.yellow, `\n⚠️  ${budgetViolations} file budget violation(s) detected`);
    process.exit(1);
  }

  if (!contextFile) {
    log(colors.yellow, 'WARNING: No AGENTS.md context file found in global or local location.');
    process.exit(0);
  }

  let stats;
  try {
    stats = fs.statSync(contextFile);
  } catch (err) {
    log(colors.red, `ERROR: Failed to stat ${contextFile} - ${err.message}`);
    process.exit(1);
  }

  const sizeKB = Math.round((stats.size / 1024) * 100) / 100;
  const sizeColor = sizeKB > MAX_SIZE_KB ? colors.yellow : colors.green;

  log(sizeColor, `Current size: ${sizeKB} KB (Max: ${MAX_SIZE_KB} KB)`);

  if (sizeKB > MAX_SIZE_KB) {
    log(colors.yellow, `\n⚠️  Context file exceeds ${MAX_SIZE_KB} KB - Pruning required!`);

    if (checkOnly) {
      log(colors.yellow, 'Running in check-only mode (--check/--dry-run). No changes made.');
      process.exit(1);
    }

    let content;
    try {
      content = fs.readFileSync(contextFile, 'utf8');
    } catch (err) {
      log(colors.red, `ERROR: Failed to read ${contextFile} - ${err.message}`);
      process.exit(1);
    }

    // Split into header and dated entries
    // Entries start with ### followed by a date pattern (YYYY-MM-DD)
    const entryPattern = /^([\s\S]*?)(### \d{4}-\d{2}-\d{2}[\s\S]*)$/;
    const match = content.match(entryPattern);

    if (match) {
      const header = match[1];
      const entriesBlock = match[2];

      // Split on ### boundaries (keeping the ### prefix)
      const entryList = splitEntries(entriesBlock);

      log(colors.cyan, `Found ${entryList.length} context entries`);
      const qualityWarnings = warnEntryQuality(entryList);
      if (qualityWarnings > 0) {
        log(colors.yellow, `Context quality warnings: ${qualityWarnings}`);
      }

      const targetBytes = PRUNE_TO_KB * 1024;
      const headerBytes = Buffer.byteLength(header, 'utf8');
      const remainingBytes = targetBytes - headerBytes;

      const keptEntries = [];
      let currentSize = 0;

      for (const entry of entryList) {
        const entrySize = Buffer.byteLength(entry, 'utf8');
        if (currentSize + entrySize < remainingBytes) {
          keptEntries.push(entry);
          currentSize += entrySize;
        } else {
          break;
        }
      }

      const removedCount = entryList.length - keptEntries.length;
      log(colors.green, `Keeping most recent ${keptEntries.length} entries`);
      log(colors.yellow, `Removing oldest ${removedCount} entries`);

      const newContent = header + keptEntries.join('');

      // Create backup before pruning
      const now = new Date();
      const timestamp =
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '-' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

      const backupFile = `${contextFile}.backup-${timestamp}`;

      try {
        fs.copyFileSync(contextFile, backupFile);
        log(colors.cyan, `Backup created: ${backupFile}`);
      } catch (err) {
        log(colors.red, `ERROR: Failed to create backup - ${err.message}`);
        process.exit(1);
      }

      try {
        fs.writeFileSync(contextFile, newContent, 'utf8');
      } catch (err) {
        log(colors.red, `ERROR: Failed to write pruned file - ${err.message}`);
        process.exit(1);
      }

      const newStats = fs.statSync(contextFile);
      const newSizeKB = Math.round((newStats.size / 1024) * 100) / 100;
      log(colors.green, `✅ Pruned to ${newSizeKB} KB`);
    } else {
      log(colors.yellow, 'No dated entries found to prune (expected ### YYYY-MM-DD pattern)');
    }
  } else {
    let content;
    try {
      content = fs.readFileSync(contextFile, 'utf8');
    } catch (err) {
      log(colors.red, `ERROR: Failed to read ${contextFile} - ${err.message}`);
      process.exit(1);
    }

    const entryPattern = /^([\s\S]*?)(### \d{4}-\d{2}-\d{2}[\s\S]*)$/;
    const match = content.match(entryPattern);
    if (match) {
      const entryList = splitEntries(match[2]);
      const qualityWarnings = warnEntryQuality(entryList);
      if (qualityWarnings > 0) {
        log(colors.yellow, `Context quality warnings: ${qualityWarnings}`);
      }
    }

    log(colors.green, '✅ Context file size is healthy');
  }

  process.exit(0);
}

main();
