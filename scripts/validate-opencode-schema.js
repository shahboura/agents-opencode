#!/usr/bin/env node
'use strict';

/**
 * OpenCode Schema Validator
 * Validates .opencode agents, skills, commands, and opencode.json against the
 * documented OpenCode schema (v1). Pass --v2 to also print a v2-readiness report.
 *
 * Sources:
 * - Agents:    https://opencode.ai/docs/agents/
 * - Skills:    https://opencode.ai/docs/skills/
 * - Commands:  https://opencode.ai/docs/commands/
 * - Config:    https://opencode.ai/docs/config/
 */

const fs = require('fs');
const path = require('path');

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

// Recognized permission keys (v1). Command/path patterns must be nested under
// the relevant permission (e.g. bash: { "*": "ask", "rm -rf *": "deny" }).
const KNOWN_PERMISSION_KEYS = new Set([
  'read', 'edit', 'glob', 'grep', 'list', 'bash', 'task', 'external_directory',
  'todowrite', 'question', 'webfetch', 'websearch', 'lsp', 'doom_loop', 'skill',
]);

// Documented v1 command frontmatter fields.
const COMMAND_KEYS = new Set(['description', 'agent', 'model', 'subtask']);
// Skills recognize only these frontmatter fields; unknown fields are ignored by OpenCode.
const SKILL_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata']);
const AGENT_MODES = new Set(['primary', 'subagent', 'all']);
const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SKILL_DESCRIPTION_MAX = 1024;
const SKILL_NAME_MAX = 64;

const errors = [];
const warnings = [];
const v2Gaps = [];

function frontmatterOf(content) {
  const match = content.match(/^---\s*\n([\s\S]+?)\n---/);
  return match ? match[1] : null;
}

function topLevelKeys(frontmatter) {
  const keys = [];
  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^(?!\\s*#)\\s*${name}\\s*:\\s*(.*)$`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}

function descriptionOf(frontmatter) {
  const inline = frontmatter.match(/^description\s*:\s*(\S.*)$/m);
  if (inline && !/^[>|]/.test(inline[1])) {
    return inline[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
  const block = frontmatter.match(/^description\s*:\s*[>|]-?\s*\n([\s\S]*?)(?=^\S|(?![\s\S]))/m);
  if (block) {
    return block[1].split('\n').map((line) => line.trim()).filter(Boolean).join(' ');
  }
  return null;
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function permissionSection(frontmatter) {
  const match = frontmatter.match(/^permission\s*:\s*\n([\s\S]*?)(?=^\S|(?![\s\S]))/m);
  return match ? match[1] : null;
}

function validateAgents() {
  const dir = path.join(process.cwd(), '.opencode', 'agents');
  if (!fs.existsSync(dir)) {
    errors.push('.opencode/agents: directory not found');
    return new Set();
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const names = new Set(files.map((f) => path.basename(f, '.md')));

  for (const file of files) {
    const label = `.opencode/agents/${file}`;
    const frontmatter = frontmatterOf(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!frontmatter) {
      errors.push(`${label}: missing frontmatter (---...---)`);
      continue;
    }

    if (!field(frontmatter, 'description')) errors.push(`${label}: missing required field 'description'`);

    const mode = field(frontmatter, 'mode');
    if (!mode) errors.push(`${label}: missing required field 'mode'`);
    else if (!AGENT_MODES.has(mode)) errors.push(`${label}: invalid mode '${mode}' (expected: primary, subagent, all)`);

    if (/^\s*maxSteps\s*:/m.test(frontmatter)) errors.push(`${label}: 'maxSteps' is deprecated — use 'steps'`);
    if (/^\s*tools\s*:/m.test(frontmatter)) warnings.push(`${label}: legacy 'tools:' block — prefer 'permission'`);

    const section = permissionSection(frontmatter);
    if (!section) {
      warnings.push(`${label}: no 'permission' section`);
    } else {
      for (const line of section.split('\n')) {
        const match = line.match(/^ {2}([^\s:][^:]*?)\s*:/);
        if (!match) continue;
        const key = match[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        if (key !== '*' && !KNOWN_PERMISSION_KEYS.has(key)) {
          errors.push(`${label}: unrecognized permission key '${key}' (must be a known permission or nested pattern)`);
        }
      }
      v2Gaps.push(`${label}: 'permission' object is v1-only (v2 uses a 'permissions' array with shell/subagent actions)`);
    }

    if (/^\s*temperature\s*:/m.test(frontmatter)) {
      v2Gaps.push(`${label}: top-level 'temperature' is v1-only (v2 uses request body / model variants)`);
    }
    if (/^\s*tools\s*:/m.test(frontmatter)) {
      v2Gaps.push(`${label}: 'tools:' is deprecated in v1 and unsupported in v2`);
    }
  }

  return names;
}

function validateSkills() {
  const base = path.join(process.cwd(), '.opencode', 'skills');
  for (const name of listDirs(base)) {
    const file = path.join(base, name, 'SKILL.md');
    const label = `.opencode/skills/${name}/SKILL.md`;
    if (!fs.existsSync(file)) {
      warnings.push(`${label}: missing SKILL.md`);
      continue;
    }
    const frontmatter = frontmatterOf(fs.readFileSync(file, 'utf8'));
    if (!frontmatter) {
      errors.push(`${label}: missing frontmatter`);
      continue;
    }

    for (const key of topLevelKeys(frontmatter)) {
      if (!SKILL_KEYS.has(key)) {
        errors.push(`${label}: unrecognized frontmatter field '${key}' (allowed: ${[...SKILL_KEYS].join(', ')})`);
      }
    }

    const skillName = field(frontmatter, 'name');
    if (!skillName) {
      errors.push(`${label}: missing required field 'name'`);
    } else {
      if (skillName !== name) errors.push(`${label}: 'name' (${skillName}) must match the directory name (${name})`);
      if (!SKILL_NAME_RE.test(skillName)) errors.push(`${label}: 'name' must match ^[a-z0-9]+(-[a-z0-9]+)*$`);
      if (skillName.length > SKILL_NAME_MAX) errors.push(`${label}: 'name' exceeds ${SKILL_NAME_MAX} characters`);
    }

    const desc = descriptionOf(frontmatter);
    if (!desc) errors.push(`${label}: missing required field 'description'`);
    else if (desc.length > SKILL_DESCRIPTION_MAX) {
      errors.push(`${label}: 'description' exceeds ${SKILL_DESCRIPTION_MAX} characters (${desc.length})`);
    }
  }
}

function validateCommands(agentNames) {
  const dir = path.join(process.cwd(), '.opencode', 'commands');
  if (!fs.existsSync(dir)) {
    warnings.push('.opencode/commands: directory not found');
    return;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  for (const file of files) {
    const label = `.opencode/commands/${file}`;
    const frontmatter = frontmatterOf(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!frontmatter) {
      errors.push(`${label}: missing frontmatter`);
      continue;
    }

    for (const key of topLevelKeys(frontmatter)) {
      if (key === 'argument-hint') {
        warnings.push(`${label}: 'argument-hint' is not a documented OpenCode field (Claude Code) — ignored by OpenCode`);
        continue;
      }
      if (!COMMAND_KEYS.has(key)) {
        errors.push(`${label}: unrecognized frontmatter field '${key}' (allowed: ${[...COMMAND_KEYS].join(', ')})`);
      }
    }

    if (!field(frontmatter, 'description')) errors.push(`${label}: missing required field 'description'`);

    const subtask = field(frontmatter, 'subtask');
    if (subtask !== null && !/^(true|false)$/.test(subtask)) {
      errors.push(`${label}: 'subtask' must be a boolean (true/false)`);
    }
    if (subtask !== null) v2Gaps.push(`${label}: 'subtask' is a deprecated alias in v2 — use 'subagent'`);

    const agent = field(frontmatter, 'agent');
    if (agent && agentNames.size > 0 && !agentNames.has(agent)) {
      errors.push(`${label}: unknown agent '${agent}'`);
    }
  }
}

function validateConfig() {
  const file = path.join(process.cwd(), 'opencode.json');
  const label = 'opencode.json';
  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    errors.push(`${label}: invalid JSON (${err.message})`);
    return;
  }

  if (!config.$schema) errors.push(`${label}: missing '$schema'`);

  if (config.permission && typeof config.permission === 'object') {
    for (const key of Object.keys(config.permission)) {
      if (!KNOWN_PERMISSION_KEYS.has(key)) errors.push(`${label}: unrecognized permission key '${key}'`);
    }
    v2Gaps.push(`${label}: 'permission' object is v1-only — v2 uses a 'permissions' array`);
    if (config.permission.doom_loop) v2Gaps.push(`${label}: 'doom_loop' is not a v2 permission action`);
  }
  if (config.plugin) v2Gaps.push(`${label}: 'plugin' (singular) is v1-only — v2 uses 'plugins'`);
  if (config.compaction && config.compaction.prune !== undefined) {
    v2Gaps.push(`${label}: 'compaction.prune' is v1-only — v2 uses {auto, keep, buffer}`);
  }
  if (config.subagent_depth !== undefined) {
    v2Gaps.push(`${label}: 'subagent_depth' is v1-documented only — verify before relying on it in v2`);
  }
}

function main() {
  const showV2 = process.argv.includes('--v2');
  log(colors.cyan, 'Validating OpenCode schema conformance...\n');

  const agentNames = validateAgents();
  validateSkills();
  validateCommands(agentNames);
  validateConfig();

  if (showV2 && v2Gaps.length > 0) {
    log(colors.yellow, `v2 readiness notes (${v2Gaps.length}):`);
    for (const gap of v2Gaps) log(colors.yellow, `  • ${gap}`);
    console.log('');
  }

  if (warnings.length > 0) {
    log(colors.yellow, `⚠️  WARNINGS (${warnings.length}):`);
    for (const warning of warnings) log(colors.yellow, `  • ${warning}`);
  }

  if (errors.length > 0) {
    log(colors.red, `\n❌ ERRORS (${errors.length}):`);
    for (const error of errors) log(colors.red, `  • ${error}`);
    process.exit(1);
  }

  log(colors.green, `\n✅ OpenCode schema validation passed${warnings.length > 0 ? ' (warnings only)' : ''}`);
  process.exit(0);
}

main();
