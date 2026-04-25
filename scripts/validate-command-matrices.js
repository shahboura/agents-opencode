#!/usr/bin/env node
'use strict';

/**
 * Command Matrix Validator
 * Ensures command docs tables stay in sync with .opencode/commands frontmatter.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const COMMANDS_DIR = path.join(ROOT, '.opencode', 'commands');
const DOC_FILES = [
  path.join(ROOT, 'docs', 'commands.md'),
  path.join(ROOT, 'docs', 'skills-matrix.md'),
  path.join(ROOT, '.opencode', 'commands', 'README.md'),
];

function normalizeCell(value) {
  return (value || '').replace(/`/g, '').trim();
}

function normalizeHeader(value) {
  return normalizeCell(value).toLowerCase();
}

function normalizeCommand(value) {
  const cleaned = normalizeCell(value);
  if (!cleaned) return '';
  return cleaned.startsWith('/') ? cleaned : `/${cleaned.replace(/^\/+/, '')}`;
}

function splitTableLine(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

function isSeparatorLine(line) {
  const cells = splitTableLine(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));
}

function parseMarkdownTables(content) {
  const lines = content.split(/\r?\n/);
  const tables = [];
  let inFence = false;

  for (let i = 0; i < lines.length - 1; i += 1) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence || !line.includes('|')) {
      continue;
    }

    const next = lines[i + 1] || '';
    if (!next.includes('|') || !isSeparatorLine(next)) {
      continue;
    }

    const header = splitTableLine(line).map(normalizeHeader);
    const rows = [];
    i += 2;

    while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
      rows.push({
        lineNumber: i + 1,
        cells: splitTableLine(lines[i]),
      });
      i += 1;
    }

    i -= 1;
    tables.push({ header, rows });
  }

  return tables;
}

function parseFrontmatter(content, filePath) {
  const match = content.match(/^---\s*\n([\s\S]+?)\n---/);
  if (!match) {
    throw new Error(`Missing frontmatter: ${filePath}`);
  }

  const frontmatter = match[1];
  const readField = (field) => {
    const fieldMatch = frontmatter.match(new RegExp(`^(?!\\s*#)\\s*${field}\\s*:\\s*(.+)$`, 'm'));
    return fieldMatch ? fieldMatch[1].trim().replace(/^"|"$/g, '') : null;
  };

  return {
    description: readField('description'),
    agent: readField('agent'),
    argumentHint: readField('argument-hint'),
  };
}

function loadCanonicalCommands() {
  const commandFiles = fs.readdirSync(COMMANDS_DIR)
    .filter((entry) => entry.endsWith('.md') && entry.toLowerCase() !== 'readme.md')
    .sort();

  const commands = new Map();
  for (const fileName of commandFiles) {
    const filePath = path.join(COMMANDS_DIR, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(content, filePath);

    const command = `/${path.basename(fileName, '.md')}`;
    commands.set(command, {
      command,
      agent: frontmatter.agent || '',
      argumentHint: frontmatter.argumentHint || '',
      source: toPosix(path.relative(ROOT, filePath)),
    });
  }

  return commands;
}

function toPosix(inputPath) {
  return inputPath.split(path.sep).join('/');
}

function validateDocFile(filePath, canonicalCommands, errors) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing documentation file: ${toPosix(path.relative(ROOT, filePath))}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const tables = parseMarkdownTables(content);
  const rel = toPosix(path.relative(ROOT, filePath));

  const seen = new Set();
  let foundCommandTable = false;

  for (const table of tables) {
    const commandCol = table.header.findIndex((header) => header === 'command');
    if (commandCol < 0) {
      continue;
    }

    foundCommandTable = true;
    const agentCol = table.header.findIndex((header) => header === 'agent' || header === 'target agent');
    const argumentHintCol = table.header.findIndex((header) => header === 'argument hint');

    for (const row of table.rows) {
      const command = normalizeCommand(row.cells[commandCol]);
      if (!command) {
        continue;
      }

      if (!canonicalCommands.has(command)) {
        errors.push(`${rel}:${row.lineNumber} unknown command '${command}'`);
        continue;
      }

      if (seen.has(command)) {
        errors.push(`${rel}:${row.lineNumber} duplicate command '${command}'`);
      }
      seen.add(command);

      const canonical = canonicalCommands.get(command);

      if (agentCol >= 0) {
        const documentedAgent = normalizeCell(row.cells[agentCol]);
        if (documentedAgent !== canonical.agent) {
          errors.push(`${rel}:${row.lineNumber} agent mismatch for '${command}' (docs='${documentedAgent}', canonical='${canonical.agent}')`);
        }
      }

      if (argumentHintCol >= 0) {
        const documentedHint = normalizeCell(row.cells[argumentHintCol]);
        if (documentedHint !== canonical.argumentHint) {
          errors.push(`${rel}:${row.lineNumber} argument hint mismatch for '${command}' (docs='${documentedHint}', canonical='${canonical.argumentHint}')`);
        }
      }
    }
  }

  if (!foundCommandTable) {
    errors.push(`${rel} missing a command matrix table with a 'Command' column`);
    return;
  }

  for (const command of canonicalCommands.keys()) {
    if (!seen.has(command)) {
      errors.push(`${rel} missing command '${command}'`);
    }
  }
}

function main() {
  const errors = [];
  const canonicalCommands = loadCanonicalCommands();

  for (const docFile of DOC_FILES) {
    validateDocFile(docFile, canonicalCommands, errors);
  }

  if (errors.length > 0) {
    console.error('❌ Command matrix validation failed:\n');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('✅ Command matrix validation passed');
}

main();
