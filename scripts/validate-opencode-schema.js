#!/usr/bin/env node
'use strict';

/**
 * OpenCode Schema Validator
 * Validates .opencode agents, skills, commands, and opencode.json against the
 * documented OpenCode schema (v1). Pass --v2 to also print a v2-readiness report.
 *
 * Notes:
 * - `argument-hint` is a Claude Code field, not an OpenCode field. It is
 *   tolerated here as an existing repo convention (OpenCode ignores it); it is
 *   not treated as a schema violation.
 * - Parsing is intentionally fail-closed: malformed frontmatter/permission input
 *   should surface as an ERROR, never be silently skipped.
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

// Documented v1 command frontmatter fields. `argument-hint` is intentionally
// omitted: it is not an OpenCode field and is tolerated as a repo convention.
const COMMAND_KEYS = new Set(['description', 'agent', 'model', 'subtask']);
// Skills recognize only these frontmatter fields; OpenCode ignores unknown ones.
const SKILL_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata']);
// Documented v1 top-level config keys (used for an advisory unknown-key warning).
const CONFIG_KEYS = new Set([
  '$schema', 'theme', 'model', 'provider', 'agent', 'permission', 'instructions',
  'mcp', 'keybinds', 'formatter', 'lsp', 'tools', 'plugin', 'share', 'autoupdate',
  'compaction', 'watcher', 'disabled_providers', 'mode', 'experimental', 'subagent_depth', 'username',
]);
const AGENT_MODES = new Set(['primary', 'subagent', 'all']);
const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SKILL_DESCRIPTION_MAX = 1024;
const SKILL_NAME_MAX = 64;

const errors = [];
const warnings = [];
const v2Gaps = [];

function frontmatterOf(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  return match ? match[1] : null;
}

function topLevelKeys(frontmatter) {
  const keys = [];
  for (const raw of frontmatter.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = line.match(/^["']?([A-Za-z0-9_.-]+)["']?\s*:/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^(?!\\s*#)["']?${name}["']?\\s*:\\s*(.*)$`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}

function descriptionOf(frontmatter) {
  const inline = frontmatter.match(/^["']?description["']?\s*:\s*(\S.*)$/m);
  if (inline && !/^[>|]/.test(inline[1])) {
    return inline[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
  const block = frontmatter.match(/^["']?description["']?\s*:\s*[>|][0-9]*[-+]?\s*\n([\s\S]*?)(?=^[^\s]|(?![\s\S]))/m);
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

// Returns { present, inline, block }. `inline` means a non-empty value on the
// `permission:` line itself (e.g. `permission: {}`), which this validator does
// not parse — callers must fail closed on it.
function analyzePermission(frontmatter) {
  const line = frontmatter.match(/^(?!\s*#)["']?permission["']?\s*:(.*)$/m);
  if (!line) return { present: false, inline: false, block: null };
  const rest = line[1].trim();
  if (rest.length > 0) return { present: true, inline: true, block: null };
  const block = frontmatter.match(/^(?!\s*#)["']?permission["']?\s*:\s*\n([\s\S]*?)(?=^[^\s]|(?![\s\S]))/m);
  return { present: true, inline: false, block: block ? block[1] : '' };
}

// Captures only the shallowest-indentation keys under `permission:` so nested
// command patterns (e.g. under bash:) are not mistaken for permission names.
function permissionKeys(block) {
  const keys = [];
  let baseIndent = null;
  for (const raw of block.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indentMatch = line.match(/^([ \t]+)(.*)$/);
    if (!indentMatch) continue;
    const indent = indentMatch[1].length;
    if (baseIndent === null) baseIndent = indent;
    if (indent !== baseIndent) continue;
    const keyMatch = indentMatch[2].match(/^["']?([^\s:#][^:"']*?)["']?\s*:/);
    if (keyMatch) keys.push(keyMatch[1].trim());
  }
  return keys;
}

function validatePermission(frontmatter, label) {
  const analysis = analyzePermission(frontmatter);
  if (!analysis.present) {
    warnings.push(`${label}: no 'permission' section`);
    return;
  }
  if (analysis.inline) {
    errors.push(`${label}: 'permission' must be a block mapping, not an inline value (fail-closed)`);
    return;
  }
  for (const key of permissionKeys(analysis.block)) {
    if (key !== '*' && !KNOWN_PERMISSION_KEYS.has(key)) {
      errors.push(`${label}: unrecognized permission key '${key}' (must be a known permission or nested pattern)`);
    }
  }
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

    if (/^(?!\s*#)["']?maxSteps["']?\s*:/m.test(frontmatter)) {
      errors.push(`${label}: 'maxSteps' is deprecated — use 'steps'`);
    }
    if (/^(?!\s*#)["']?tools["']?\s*:/m.test(frontmatter)) {
      warnings.push(`${label}: legacy 'tools:' block — prefer 'permission'`);
      v2Gaps.push(`${label}: 'tools:' is deprecated in v1 and unsupported in v2`);
    }

    validatePermission(frontmatter, label);

    if (/^(?!\s*#)["']?temperature["']?\s*:/m.test(frontmatter)) {
      v2Gaps.push(`${label}: top-level 'temperature' is v1-only (v2 uses request body / model variants)`);
    }
    if (/^(?!\s*#)["']?permission["']?\s*:/m.test(frontmatter)) {
      v2Gaps.push(`${label}: 'permission' object is v1-only (v2 uses a 'permissions' array with shell/subagent actions)`);
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
        // OpenCode ignores unknown frontmatter fields; warn rather than fail.
        warnings.push(`${label}: unrecognized frontmatter field '${key}' (OpenCode ignores it)`);
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
      if (key === 'argument-hint') continue; // tolerated repo convention (ignored by OpenCode)
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
  if (!fs.existsSync(file)) {
    errors.push(`${label}: file not found`);
    return;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // Do not echo the parser message: JSON.parse excerpts can leak config secrets.
    errors.push(`${label}: invalid JSON — fix syntax before validating`);
    return;
  }

  if (!config.$schema) errors.push(`${label}: missing '$schema'`);

  for (const key of Object.keys(config)) {
    if (!CONFIG_KEYS.has(key)) warnings.push(`${label}: unrecognized top-level config key '${key}'`);
  }

  if (config.permission && typeof config.permission === 'object') {
    for (const key of Object.keys(config.permission)) {
      if (!KNOWN_PERMISSION_KEYS.has(key)) errors.push(`${label}: unrecognized permission key '${key}'`);
    }
    v2Gaps.push(`${label}: 'permission' object is v1-only — v2 uses a 'permissions' array`);
    if (config.permission.doom_loop || config.permission.lsp) {
      v2Gaps.push(`${label}: 'doom_loop'/'lsp' are not v2 permission actions`);
    }
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
