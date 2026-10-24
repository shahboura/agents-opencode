#!/usr/bin/env node
'use strict';

/**
 * Inventory Validator
 * Asserts stated inventory counts match the filesystem across the package,
 * README, docs site, and adapter manifests.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SKILLS_DIR = path.join(ROOT, '.opencode', 'skills');
const COMMANDS_DIR = path.join(ROOT, '.opencode', 'commands');
const AGENTS_DIR = path.join(ROOT, '.opencode', 'agents');

// Only current-state statements are checked; historical sandbox claims such as
// "27 skills verified on v2.0.30" describe a past run and are deliberately skipped.
const SOURCES = [
  {
    file: 'package.json',
    patterns: [
      {
        label: 'description skills',
        regex: /(\d+) on-demand skills/,
        values: ['skills'],
      },
    ],
  },
  {
    file: 'README.md',
    patterns: [
      {
        label: 'catalog surface',
        regex: /registers (\d+) catalog entries \((\d+) agents \+ (\d+) commands \+ (\d+) skills\)/,
        values: ['catalog', 'agents', 'commands', 'skills'],
      },
      {
        label: 'skills live under',
        regex: /(\d+) skills live under `\.opencode\/skills\/`/,
        values: ['skills'],
      },
      {
        label: 'on-demand skills',
        regex: /(\d+) on-demand skills/,
        values: ['skills'],
      },
    ],
  },
  {
    file: 'site/src/content/docs/index.md',
    patterns: [
      {
        label: 'specialized agents',
        regex: /(\d+) specialized agents/,
        values: ['agents'],
      },
      {
        label: 'all agents verified',
        regex: /all (\d+) agents/,
        values: ['agents'],
      },
    ],
  },
  {
    file: 'adapters/claude-code/README.md',
    patterns: [
      {
        label: 'on-demand skills',
        regex: /(\d+) on-demand skills/,
        values: ['skills'],
      },
    ],
  },
  {
    file: 'adapters/claude-code/.claude-plugin/plugin.json',
    patterns: [
      {
        label: 'on-demand skills',
        regex: /(\d+) on-demand skills/,
        values: ['skills'],
      },
    ],
  },
  {
    file: 'adapters/claude-code/.claude-plugin/marketplace.json',
    patterns: [
      {
        label: 'on-demand skills',
        regex: /(\d+) on-demand skills/,
        values: ['skills'],
      },
    ],
  },
];

function listSkillDirs() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
}

function countMarkdown(dir, excluded) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .filter((entry) => !excluded.includes(entry.name.toLowerCase())).length;
}

function checkStatedCounts(errors, counts) {
  for (const source of SOURCES) {
    const filePath = path.join(ROOT, source.file);
    if (!fs.existsSync(filePath)) {
      errors.push(`${source.file}: file is missing (cannot verify its stated counts)`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of source.patterns) {
      const matches = [...content.matchAll(new RegExp(pattern.regex, 'g'))];
      if (matches.length === 0) {
        errors.push(`${source.file}: ${pattern.label} not found (reworded or removed)`);
        continue;
      }

      for (const match of matches) {
        pattern.values.forEach((key, index) => {
          const stated = Number(match[index + 1]);
          const actual = counts[key];
          if (stated !== actual) {
            errors.push(`${source.file}: ${pattern.label} states ${key}=${stated}, filesystem has ${actual}`);
          }
        });
      }
    }
  }
}

function main() {
  const skillDirs = listSkillDirs();
  const counts = {
    agents: countMarkdown(AGENTS_DIR, []),
    commands: countMarkdown(COMMANDS_DIR, ['readme.md']),
    skills: skillDirs.length,
    catalog: 0,
  };
  counts.catalog = counts.agents + counts.commands + counts.skills;

  const errors = [];
  checkStatedCounts(errors, counts);

  if (errors.length > 0) {
    console.error('❌ Inventory validation failed:\n');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `✅ Inventory matches filesystem and stated counts (${counts.agents} agents, ` +
      `${counts.commands} commands, ${counts.skills} skills)`
  );
}

main();
