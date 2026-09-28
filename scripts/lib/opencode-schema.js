'use strict';

/**
 * Shared OpenCode schema constants and frontmatter helpers.
 * Single source of truth for the validators in this repo.
 *
 * Sources:
 * - Agents:    https://opencode.ai/docs/agents/
 * - Skills:    https://opencode.ai/docs/skills/
 * - Commands:  https://opencode.ai/docs/commands/
 * - Config:    https://opencode.ai/docs/config/
 */

const fs = require('fs');
const path = require('path');

// Recognized permission keys (v1). Command/path patterns must be nested under
// the relevant permission (e.g. bash: { "*": "ask", "rm -rf *": "deny" }).
const KNOWN_PERMISSION_KEYS = new Set([
  'read', 'edit', 'glob', 'grep', 'list', 'bash', 'task', 'external_directory',
  'todowrite', 'question', 'webfetch', 'websearch', 'lsp', 'doom_loop', 'skill',
]);

// Documented v1 command frontmatter fields. `argument-hint` is intentionally
// excluded: it is not an OpenCode field and has been removed from this repo.
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

// Extracts the frontmatter block (between the first pair of `---` fences).
// Fences are anchored to line ends so `---foo` is not accepted as a fence.
function frontmatterOf(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  return match ? match[1] : null;
}

// Returns column-0 keys only (nested/indented keys are excluded), with quotes
// stripped so quoted keys cannot evade detection.
function topLevelKeys(frontmatter) {
  const keys = [];
  for (const raw of frontmatter.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = line.match(/^["']?([^\s"'\n:][^"'\n:]*)["']?\s*:/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

// Reads a column-0 field value (comment-guarded). Returns null if absent.
function field(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^(?!\\s*#)["']?${name}["']?\\s*:\\s*(.*)$`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}

// Reads a description that may be inline or a YAML block scalar.
function descriptionOf(frontmatter) {
  const inline = frontmatter.match(/^["']?description["']?\s*:\s*(\S.*)$/m);
  if (inline && !/^[>|]/.test(inline[1])) {
    return inline[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
  const block = frontmatter.match(/^["']?description["']?\s*:\s*[>|](?:[0-9]*[-+]?|[-+][0-9]*)\s*\n([\s\S]*?)(?=^[^\s]|(?![\s\S]))/m);
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

function skillsDir() {
  return path.join(process.cwd(), '.opencode', 'skills');
}

function getKnownSkills() {
  const base = skillsDir();
  const skills = new Set();
  if (!fs.existsSync(base)) return skills;
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (fs.existsSync(path.join(base, entry.name, 'SKILL.md'))) skills.add(entry.name);
  }
  return skills;
}

// Returns { present, inline, block }. `inline` means a non-empty value on the
// `permission:` line itself (e.g. `permission: {}`), which callers must fail
// closed on rather than silently skip.
function analyzePermission(frontmatter) {
  const line = frontmatter.match(/^(?!\s*#)["']?permission["']?\s*:(.*)$/m);
  if (!line) return { present: false, inline: false, block: null };
  const rest = line[1].replace(/\s+#.*$/, '').trim();
  if (rest.length > 0) return { present: true, inline: true, block: null };
  const block = frontmatter.match(/^(?!\s*#)["']?permission["']?\s*:\s*(?:#.*)?\n([\s\S]*?)(?=^[^\s]|(?![\s\S]))/m);
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
    if (keyMatch) keys.push(keyMatch[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
  }
  return keys;
}

// Extracts a nested permission child block (e.g. `skill:` / `task:`) at the
// permission block's shallowest indentation, so it is not sensitive to the
// exact indent width. Returns { inline, block } or null.
function permissionChildBlock(block, key) {
  const lines = block.split('\n').map((line) => line.replace(/\r$/, ''));
  let baseIndent = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indentMatch = line.match(/^([ \t]+)(.*)$/);
    if (!indentMatch) continue;
    const indent = indentMatch[1].length;
    if (baseIndent === null) baseIndent = indent;
    if (indent !== baseIndent) continue;
    const keyMatch = indentMatch[2].match(/^["']?([^\s:#][^:"']*?)["']?\s*:\s*(.*)$/);
    if (!keyMatch) continue;
    const name = keyMatch[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (name !== key) continue;
    const inline = keyMatch[2].trim();
    if (inline.length > 0) return { inline: true, block: '' };
    const sub = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (!next.trim()) { sub.push(next); continue; }
      const nextIndent = next.match(/^([ \t]+)/);
      if (!nextIndent || nextIndent[1].length <= baseIndent) break;
      sub.push(next);
    }
    return { inline: false, block: sub.join('\n') };
  }
  return null;
}

// Parses `key: value` entries at a block's shallowest indentation into a Map.
function parseMapEntries(block) {
  const map = new Map();
  let baseIndent = null;
  for (const raw of block.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indentMatch = line.match(/^([ \t]+)(.*)$/);
    if (!indentMatch) continue;
    const indent = indentMatch[1].length;
    if (baseIndent === null) baseIndent = indent;
    if (indent !== baseIndent) continue;
    const kv = indentMatch[2].match(/^["']?([^\s:#][^:"']*?)["']?\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    const value = kv[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    map.set(key, value);
  }
  return map;
}

module.exports = {
  KNOWN_PERMISSION_KEYS,
  COMMAND_KEYS,
  SKILL_KEYS,
  CONFIG_KEYS,
  AGENT_MODES,
  SKILL_NAME_RE,
  SKILL_DESCRIPTION_MAX,
  SKILL_NAME_MAX,
  frontmatterOf,
  topLevelKeys,
  field,
  descriptionOf,
  listDirs,
  getKnownSkills,
  analyzePermission,
  permissionKeys,
  permissionChildBlock,
  parseMapEntries,
};
