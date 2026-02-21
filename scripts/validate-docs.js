#!/usr/bin/env node
'use strict';

/**
 * Documentation Link Validator
 * Finds all .md files and validates internal markdown links.
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

/**
 * Recursively find all .md files, excluding node_modules and .git directories.
 */
function findMarkdownFiles(dir) {
  const results = [];

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      results.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

function main() {
  const brokenLinks = [];
  const rootDir = process.cwd();

  log(colors.cyan, 'Validating documentation links...');

  const mdFiles = findMarkdownFiles(rootDir);

  log(colors.green, `Found ${mdFiles.length} markdown files\n`);

  // Regex for markdown links: [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (const filePath of mdFiles) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const relFilePath = path.relative(rootDir, filePath).split(path.sep).join('/');

    const matches = [...content.matchAll(linkRegex)];
    if (matches.length === 0) {
      continue;
    }

    log(colors.yellow, `Checking: ${relFilePath} (${matches.length} links)`);

    for (const match of matches) {
      const linkText = match[1];
      const linkPath = match[2];

      // Skip external links
      if (/^https?:\/\//.test(linkPath)) {
        continue;
      }

      // Skip anchor-only links
      if (linkPath.startsWith('#')) {
        continue;
      }

      // Strip anchor fragment
      const cleanPath = linkPath.replace(/#.*$/, '');

      if (!cleanPath || cleanPath.trim() === '') {
        continue;
      }

      // Resolve the target path
      let targetPath;
      if (cleanPath.startsWith('/')) {
        targetPath = path.join(rootDir, cleanPath.substring(1));
      } else {
        targetPath = path.join(path.dirname(filePath), cleanPath);
      }

      // Normalize the path (resolve ../ etc.)
      targetPath = path.resolve(targetPath);

      let found = fs.existsSync(targetPath);

      // If not found and has no extension, try .md and /index.md
      if (!found) {
        const ext = path.extname(targetPath);
        if (!ext) {
          const altPaths = [
            targetPath + '.md',
            path.join(targetPath, 'index.md'),
          ];

          for (const altPath of altPaths) {
            if (fs.existsSync(altPath)) {
              found = true;
              break;
            }
          }
        }
      }

      if (!found) {
        const resolvedRel = path.relative(rootDir, targetPath).split(path.sep).join('/');
        brokenLinks.push({
          file: relFilePath,
          linkText,
          linkPath,
          resolvedPath: resolvedRel,
        });
        log(colors.red, `  ✗ Broken: [${linkText}](${linkPath})`);
      }
    }
  }

  // Results
  console.log('');
  log(colors.cyan, '================================');
  log(colors.cyan, 'Validation Results');
  log(colors.cyan, '================================');

  if (brokenLinks.length === 0) {
    log(colors.green, '✅ All links are valid!');
    process.exit(0);
  } else {
    log(colors.red, `❌ Found ${brokenLinks.length} broken links:\n`);

    // Table-style output
    const fileColWidth = Math.max(4, ...brokenLinks.map(l => l.file.length));
    const textColWidth = Math.max(8, ...brokenLinks.map(l => l.linkText.length));
    const pathColWidth = Math.max(8, ...brokenLinks.map(l => l.linkPath.length));
    const resolvedColWidth = Math.max(12, ...brokenLinks.map(l => l.resolvedPath.length));

    const header =
      'File'.padEnd(fileColWidth) + '  ' +
      'LinkText'.padEnd(textColWidth) + '  ' +
      'LinkPath'.padEnd(pathColWidth) + '  ' +
      'ResolvedPath'.padEnd(resolvedColWidth);

    const separator =
      '-'.repeat(fileColWidth) + '  ' +
      '-'.repeat(textColWidth) + '  ' +
      '-'.repeat(pathColWidth) + '  ' +
      '-'.repeat(resolvedColWidth);

    console.log(header);
    console.log(separator);

    for (const link of brokenLinks) {
      console.log(
        link.file.padEnd(fileColWidth) + '  ' +
        link.linkText.padEnd(textColWidth) + '  ' +
        link.linkPath.padEnd(pathColWidth) + '  ' +
        link.resolvedPath.padEnd(resolvedColWidth)
      );
    }

    process.exit(1);
  }
}

main();
