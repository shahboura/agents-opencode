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

function main() {
  const MAX_SIZE_KB = 100;
  const PRUNE_TO_KB = 75;

  // Check for global installation first, then local
  const globalContextFile = path.join(os.homedir(), '.config', 'opencode', 'AGENTS.md');
  const localContextFile = path.join(process.cwd(), 'AGENTS.md');

  let contextFile = null;
  if (fs.existsSync(globalContextFile)) {
    contextFile = globalContextFile;
  } else if (fs.existsSync(localContextFile)) {
    contextFile = localContextFile;
  }

  log(colors.cyan, 'Checking context file size...');

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
      const entryList = entriesBlock
        .split(/^(?=### )/m)
        .filter(entry => entry.trim() !== '');

      log(colors.cyan, `Found ${entryList.length} context entries`);

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
    log(colors.green, '✅ Context file size is healthy');
  }

  process.exit(0);
}

main();
