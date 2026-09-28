#!/usr/bin/env node
'use strict';

/**
 * OpenCode Schema Validator
 * Validates .opencode agents, skills, commands, and opencode.json against the
 * documented OpenCode schema (v1).
 *
 * Flags:
 * - `--v2`     also print a v2-readiness report (informational; never changes exit code)
 * - `--strict` promote security-relevant warnings (missing permission block,
 *              legacy tools:) to errors so CI fails closed on them
 *
 * Parsing is fail-closed: malformed frontmatter/permission input surfaces as an
 * ERROR, never a silent skip. Shared helpers live in scripts/lib/opencode-schema.js.
 */

const fs = require('fs');
const path = require('path');

const {
  KNOWN_PERMISSION_KEYS, COMMAND_KEYS, SKILL_KEYS, CONFIG_KEYS, AGENT_MODES,
  SKILL_NAME_RE, SKILL_DESCRIPTION_MAX, SKILL_NAME_MAX,
  frontmatterOf, topLevelKeys, field, descriptionOf, listDirs,
  analyzePermission, permissionKeys, permissionChildBlock, parseMapEntries,
} = require('./lib/opencode-schema');

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

const errors = [];
const warnings = [];
const v2Gaps = [];
const strict = process.argv.includes('--strict');

// Security-relevant warnings are promoted to errors in --strict mode.
function warnOrError(message) {
  if (strict) errors.push(message);
  else warnings.push(message);
}

function validatePermission(frontmatter, label) {
  const analysis = analyzePermission(frontmatter);
  if (analysis.duplicate) {
    errors.push(`${label}: duplicate 'permission' block (fail-closed)`);
  }
  if (!analysis.present) {
    warnOrError(`${label}: no 'permission' section (runtime tool access is unbounded)`);
    return;
  }
  if (analysis.inline) {
    errors.push(`${label}: 'permission' must be a block mapping, not an inline value (fail-closed)`);
    return;
  }
  const keys = permissionKeys(analysis.block);
  if (keys.length === 0) {
    errors.push(`${label}: 'permission' must be a non-empty block mapping (fail-closed)`);
    return;
  }
  for (const key of keys) {
    if (key !== '*' && !KNOWN_PERMISSION_KEYS.has(key)) {
      errors.push(`${label}: unrecognized permission key '${key}' (must be a known permission or nested pattern)`);
    }
  }
  // Nested tool-allowlist children must be non-empty block mappings (fail-closed).
  for (const childKey of ['skill', 'task']) {
    const child = permissionChildBlock(analysis.block, childKey);
    if (!child) continue;
    if (child.duplicate) {
      errors.push(`${label}: duplicate permission.${childKey} block (fail-closed)`);
    }
    if (child.inline) {
      errors.push(`${label}: permission.${childKey} must be a block mapping (fail-closed)`);
    } else if (parseMapEntries(child.block).size === 0) {
      errors.push(`${label}: permission.${childKey} must be a non-empty mapping (fail-closed)`);
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

    if (!descriptionOf(frontmatter)) errors.push(`${label}: missing required field 'description'`);

    const mode = field(frontmatter, 'mode');
    if (!mode) errors.push(`${label}: missing required field 'mode'`);
    else if (!AGENT_MODES.has(mode)) errors.push(`${label}: invalid mode '${mode}' (expected: primary, subagent, all)`);

    if (/^(?!\s*#)["']?maxSteps["']?\s*:/m.test(frontmatter)) {
      errors.push(`${label}: 'maxSteps' is deprecated — use 'steps'`);
    }
    if (/^(?!\s*#)["']?tools["']?\s*:/m.test(frontmatter)) {
      warnOrError(`${label}: legacy 'tools:' block — prefer 'permission'`);
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
  const dirs = listDirs(base);
  if (dirs.length === 0) {
    if (strict) errors.push('.opencode/skills: no skills found (strict)');
    else warnings.push('.opencode/skills: no skills found');
    return;
  }
  for (const name of dirs) {
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
      if (!COMMAND_KEYS.has(key)) {
        errors.push(`${label}: unrecognized frontmatter field '${key}' (allowed: ${[...COMMAND_KEYS].join(', ')})`);
      }
    }

    if (!descriptionOf(frontmatter)) errors.push(`${label}: missing required field 'description'`);

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
    if (!CONFIG_KEYS.has(key)) warnOrError(`${label}: unrecognized top-level config key '${key}'`);
  }

  if (config.permission !== undefined) {
    const perm = config.permission;
    const isObject = perm && typeof perm === 'object' && !Array.isArray(perm);
    if (!isObject || Object.keys(perm).length === 0) {
      errors.push(`${label}: 'permission' must be a non-empty object`);
    } else {
      for (const key of Object.keys(perm)) {
        if (!KNOWN_PERMISSION_KEYS.has(key)) errors.push(`${label}: unrecognized permission key '${key}'`);
      }
      v2Gaps.push(`${label}: 'permission' object is v1-only — v2 uses a 'permissions' array`);
      if (perm.doom_loop || perm.lsp) {
        v2Gaps.push(`${label}: 'doom_loop'/'lsp' are not v2 permission actions`);
      }
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
  log(colors.cyan, `Validating OpenCode schema conformance${strict ? ' (strict)' : ''}...\n`);

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
