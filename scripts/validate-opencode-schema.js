#!/usr/bin/env node
'use strict';

/**
 * OpenCode Schema Validator
 * Validates .opencode agents, skills, commands, and opencode.json against the
 * documented OpenCode v1 schema and the v2 target contract. v1-shaped agent and
 * config fields remain supported on v2 (auto-translated in memory); the v2
 * checks only fail on genuinely v1-only action names.
 *
 * Flags:
 * - `--v2`         also print a v2-readiness report (informational; never changes exit code)
 * - `--strict`     promote security-relevant warnings (missing permission block,
 *                  legacy tools:) to errors so CI fails closed on them
 * - `--v2-strict`  dedicated fail-closed v2 conformance mode: derive the v2 target
 *                  output via scripts/lib/opencode-target.js and error if it is not
 *                  v2-conformant, then scan agents/commands for untranslatable tokens
 *
 * Parsing is fail-closed: malformed frontmatter/permission input surfaces as an
 * ERROR, never a silent skip. Shared helpers live in scripts/lib/opencode-schema.js.
 */

const fs = require('fs');
const path = require('path');

const {
  KNOWN_PERMISSION_KEYS, V1_ONLY_V2_ACTIONS, COMMAND_KEYS, SKILL_KEYS, CONFIG_KEYS, AGENT_MODES,
  SKILL_NAME_RE, SKILL_DESCRIPTION_MAX, SKILL_NAME_MAX,
  frontmatterOf, topLevelKeys, field, descriptionOf, listDirs,
  analyzePermission, permissionKeys, permissionChildBlock, parseMapEntries,
} = require('./lib/opencode-schema');
const opencodeTarget = require('./lib/opencode-target.js');

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
      v2Gaps.push(`${label}: top-level 'temperature' is v1-shaped; v2 auto-translates it to request.body (supported)`);
    }
    if (/^(?!\s*#)["']?permission["']?\s*:/m.test(frontmatter)) {
      v2Gaps.push(`${label}: 'permission' object is v1-shaped; v2 auto-translates it to a permissions array (supported)`);
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
      v2Gaps.push(`${label}: 'permission' object is v1-shaped — v2 auto-translates it; native 'permissions' is optional`);
      if (perm.doom_loop || perm.lsp) {
        v2Gaps.push(`${label}: 'doom_loop'/'lsp' are not v2 permission actions`);
      }
    }
  }
  if (config.plugin) v2Gaps.push(`${label}: 'plugin' (singular) is v1-only — v2 uses 'plugins'`);
  if (config.compaction && config.compaction.prune !== undefined) {
    v2Gaps.push(`${label}: 'compaction.prune' has no v2 effect — v2 uses {auto, keep, buffer}`);
  }
  if (config.subagent_depth !== undefined) {
    v2Gaps.push(`${label}: top-level 'subagent_depth' is ignored in v2 — use experimental.subagent_depth`);
  }
}

// --- v2-strict conformance -------------------------------------------------
// A v1 config cannot express v2 keys; the v2 target output is produced by the
// install-target adapter (scripts/lib/opencode-target.js). These checks make the
// previously no-op --v2-strict flag real and fail-closed so a v1/v2 key-set
// regression cannot ship silently.

// Top-level keys the installer is allowed to emit for a v2 target.
const V2_CONFIG_ALLOWLIST = new Set(['$schema', 'plugins', 'permissions']);
// v1-only config keys that must never appear in a v2 config.
const V1_ONLY_CONFIG_KEYS = ['permission', 'plugin'];
// v1-only actions: bash/task/write/patch are renamed; doom_loop/lsp have no v2
// core equivalent. Unknown action names are allowed because v2 action names are
// strings and plugins may define their own (for example ponytail's `browser`).
// Documented v2 core actions. Unknown names are advisory for in-place configs
// (plugin actions are legitimate) but an error in the installer adapter output,
// which only ever emits translated v1 actions. `list` and `todowrite` are v1
// keys the adapter passes through verbatim; v2 tolerates unknown action strings,
// so they are accepted here rather than dropped.
const KNOWN_V2_ACTIONS = new Set([
  '*', 'read', 'edit', 'glob', 'grep', 'shell', 'subagent', 'skill', 'question',
  'webfetch', 'websearch', 'external_directory', 'execute', 'list', 'todowrite',
]);
// MCP tool actions are `<server>_<tool>` (unsupported characters become `_`).
const MCP_ACTION_RE = /^[a-z0-9]+(_[a-z0-9_]+)+$/i;

// Agent/command frontmatter tokens that v2 does NOT translate. v2 auto-translates
// agent 'permission'/'temperature' and command 'subtask' in memory (the approved
// design), so those are informational; only genuinely untranslatable tokens fail.
const V2_UNTRANSLATED_TOKENS = [
  { re: /^(?!\s*#)["']?tools["']?\s*:/m, description: "legacy 'tools:' block (v2 does not translate it)" },
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Rule (c), STRICT form — INSTALLER ADAPTER OUTPUT ONLY. The v2 adapter
// (scripts/lib/opencode-target.js emitConfig) only ever produces the
// installer-managed keys, so any other top-level key in its output is an
// installer bug. This must NOT be applied to a user's whole config file: a
// hand-authored v2 config legitimately carries extra keys (share, model,
// provider, compaction, watcher, subagent_depth, instructions, agent, mcp, ...).
function validateV2AdapterTopLevelKeys(config) {
  const problems = [];
  for (const key of Object.keys(config)) {
    if (!V2_CONFIG_ALLOWLIST.has(key)) {
      problems.push(`unexpected installer-managed v2 config key '${key}' (allowed: ${[...V2_CONFIG_ALLOWLIST].join(', ')})`);
    }
  }
  return problems;
}

// Pure, fail-closed check of one v2 config object. Returns human-readable errors
// (empty when conformant). Rules:
//   (a) no v1-only keys (permission, plugin) — these are installer leaks from a
//       stale v1 config and must never survive into a v2 config
//   (b) never co-declare permission+permissions or plugin+plugins
//   (d) permission rules are { action, resource, effect } with a valid v2 action
// Rule (c) (top-level key policy) is deliberately not here: it differs by source.
// The installer's adapter output is held to the strict V2_CONFIG_ALLOWLIST (see
// validateV2AdapterTopLevelKeys / validateV2AdapterOutput), while a hand-authored
// in-place file may carry any legitimate v2 key.
function validateV2Conformance(config) {
  const problems = [];

  for (const key of V1_ONLY_CONFIG_KEYS) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      problems.push(`v2 config must not contain the v1-only key '${key}'`);
    }
  }

  if ('permission' in config && 'permissions' in config) {
    problems.push("'permission' and 'permissions' must never co-exist");
  }
  if ('plugin' in config && 'plugins' in config) {
    problems.push("'plugin' and 'plugins' must never co-exist");
  }

  // Permission arrays may live at the top level or under agents.<id>. Both are
  // checked; a nested v1-only action is the same configuration bug.
  for (const { label, rules } of permissionRuleSets(config)) {
    if (!Array.isArray(rules)) {
      problems.push(
        label === 'permissions'
          ? "'permissions' must be an array of { action, resource, effect } rules"
          : `${label} must be an array of { action, resource, effect } rules`
      );
      continue;
    }
    rules.forEach((rule, index) => {
      const at = `${label === 'permissions' ? 'permission' : label} rule ${index}`;
      if (!isPlainObject(rule)) {
        problems.push(`${at} must be an object with { action, resource, effect }`);
        return;
      }
      for (const key of ['action', 'resource', 'effect']) {
        if (typeof rule[key] !== 'string' || rule[key].length === 0) {
          problems.push(`${at} must have a non-empty string '${key}'`);
        }
      }
      const extra = Object.keys(rule).filter((key) => !['action', 'resource', 'effect'].includes(key));
      if (extra.length > 0) {
        problems.push(`${at} has unexpected key(s): ${extra.join(', ')}`);
      }
      if (typeof rule.action === 'string' && V1_ONLY_V2_ACTIONS.has(rule.action)) {
        const replacement = V1_ONLY_V2_ACTIONS.get(rule.action);
        problems.push(
          `${at}: '${rule.action}' is not a v2 action` +
            (replacement ? ` (v2 uses '${replacement}')` : ' (no v2 core equivalent)')
        );
      }
    });
  }

  return problems;
}

// Returns the permission arrays declared in a v2 config: the top-level
// `permissions` and any `agents.<id>.permissions` (label + rules, or a
// non-array value so callers can report the shape problem).
function permissionRuleSets(config) {
  const sets = [];
  if (config.permissions !== undefined) {
    sets.push({ label: 'permissions', rules: config.permissions });
  }
  if (isPlainObject(config.agents)) {
    for (const [id, agent] of Object.entries(config.agents)) {
      if (isPlainObject(agent) && agent.permissions !== undefined) {
        sets.push({ label: `agents.${id}.permissions`, rules: agent.permissions });
      }
    }
  }
  return sets;
}

// Full v2 conformance for the installer's adapter output: the shared rules
// (a)/(b)/(d) plus the strict installer-managed top-level allowlist — rule (c),
// strict form. Only emitConfig(source, 'v2') is ever validated this way, so an
// unknown action here is an adapter bug, not a plugin action.
function validateV2AdapterOutput(config) {
  const problems = [...validateV2Conformance(config), ...validateV2AdapterTopLevelKeys(config)];
  if (Array.isArray(config.permissions)) {
    config.permissions.forEach((rule, index) => {
      if (isPlainObject(rule) && typeof rule.action === 'string' && !KNOWN_V2_ACTIONS.has(rule.action)) {
        problems.push(`permission rule ${index}: adapter emitted unknown action '${rule.action}'`);
      }
    });
  }
  return problems;
}

// Advisory: unknown actions in a hand-authored v2 config may be plugin-defined
// (legitimate) or typos (inert rule). Never fails; surfaced as warnings. Checks
// the top-level and agents.<id> permission arrays.
function collectV2ActionWarnings(config) {
  const warnings = [];
  for (const { label, rules } of permissionRuleSets(config)) {
    if (!Array.isArray(rules)) continue;
    rules.forEach((rule, index) => {
      if (
        isPlainObject(rule) &&
        typeof rule.action === 'string' &&
        !KNOWN_V2_ACTIONS.has(rule.action) &&
        !MCP_ACTION_RE.test(rule.action)
      ) {
        const at = `${label === 'permissions' ? 'permission' : label} rule ${index}`;
        warnings.push(`${at}: unrecognized v2 action '${rule.action}' (valid for plugin-defined actions; verify it is not a typo)`);
      }
    });
  }
  return warnings;
}

// Scans agent/command frontmatter for v2-untranslatable tokens (errors) and
// counts files that rely on v2's approved in-memory auto-translation (info).
function scanV2Artifacts() {
  const errors = [];
  const groups = [
    { dir: path.join(process.cwd(), '.opencode', 'agents'), kind: 'agent' },
    { dir: path.join(process.cwd(), '.opencode', 'commands'), kind: 'command' },
  ];
  let autoTranslated = 0;

  for (const { dir, kind } of groups) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
    for (const file of files) {
      const label = `.opencode/${kind}s/${file}`;
      const frontmatter = frontmatterOf(fs.readFileSync(path.join(dir, file), 'utf8')) || '';
      for (const token of V2_UNTRANSLATED_TOKENS) {
        if (token.re.test(frontmatter)) errors.push(`${label}: ${token.description}`);
      }
      const usesAutoTranslated =
        (kind === 'agent' && (
          /^(?!\s*#)["']?permission["']?\s*:/m.test(frontmatter) ||
          /^(?!\s*#)["']?temperature["']?\s*:/m.test(frontmatter)
        )) ||
        (kind === 'command' && /^(?!\s*#)["']?subtask["']?\s*:/m.test(frontmatter));
      if (usesAutoTranslated) autoTranslated += 1;
    }
  }

  return { errors, autoTranslated };
}

// --v2-strict is a dedicated, fail-closed mode; it does not replace the v1
// --strict checks (doctor runs both). It always validates the adapter's v2
// target output and additionally validates any v2 keys the file declares itself.
function validateV2Strict() {
  log(colors.cyan, 'Validating OpenCode v2-strict conformance...\n');
  const errors = [];
  const warnings = [];

  const artifacts = scanV2Artifacts();
  errors.push(...artifacts.errors);

  const file = path.join(process.cwd(), 'opencode.json');
  if (!fs.existsSync(file)) {
    errors.push('opencode.json: file not found');
  } else {
    let source;
    try {
      source = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // Do not echo the parser message: excerpts can leak config secrets.
      errors.push('opencode.json: invalid JSON — fix syntax before validating');
      source = null;
    }
    if (isPlainObject(source)) {
      // Always validate the adapter's v2 target output (the installer-managed
      // keys derived from the v1 source). Only this output is held to the strict
      // installer allowlist (rule c); it can never legitimately carry extra keys.
      errors.push(...validateV2AdapterOutput(opencodeTarget.emitConfig(source, 'v2')));
      // If the file itself already carries v2 keys, validate those in place too:
      // a hand-authored v2 config must be conformant even though the installer
      // did not write it. Extra legitimate v2 keys (share, model, ...) are fine.
      const hasV2Keys =
        'permissions' in source ||
        'plugins' in source ||
        (isPlainObject(source.agents) &&
          Object.values(source.agents).some((agent) => isPlainObject(agent) && 'permissions' in agent));
      if (hasV2Keys) {
        errors.push(...validateV2Conformance(source));
        warnings.push(...collectV2ActionWarnings(source));
      }
    }
  }

  if (artifacts.autoTranslated > 0) {
    log(colors.yellow, `ℹ️  ${artifacts.autoTranslated} agent/command file(s) rely on v2 in-memory auto-translation (agent 'permission'/'temperature', command 'subtask'); approved design, not an error.`);
    console.log('');
  }

  if (warnings.length > 0) {
    log(colors.yellow, `⚠️  v2-strict advisory warning(s) (${warnings.length}):`);
    for (const warning of warnings) log(colors.yellow, `  • ${warning}`);
    console.log('');
  }

  if (errors.length > 0) {
    log(colors.red, '❌ v2-strict validation failed:');
    log(colors.red, `  • ${errors[0]}`);
    for (const problem of errors.slice(1)) log(colors.red, `  • ${problem}`);
    process.exit(1);
  }

  log(colors.green, '✅ v2-strict validation passed');
  process.exit(0);
}

function main() {
  if (process.argv.includes('--v2-strict')) {
    validateV2Strict();
    return;
  }

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
