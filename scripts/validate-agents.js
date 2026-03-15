#!/usr/bin/env node
'use strict';

/**
 * Agent Configuration Validator
 * Validates OpenCode agent .md files in .opencode/agent/
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

function getKnownSkills() {
  const skillsDir = path.join(process.cwd(), '.opencode', 'skills');
  const skills = new Set();

  if (!fs.existsSync(skillsDir)) {
    return skills;
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      skills.add(entry.name);
    }
  }

  return skills;
}

function extractPermissionBlock(frontmatter, key) {
  const permissionSectionMatch = frontmatter.match(
    /^permission\s*:\s*\n([\s\S]*?)(?=^\S|(?![\s\S]))/m
  );
  if (!permissionSectionMatch) return null;

  const permissionBlock = permissionSectionMatch[1];
  const sectionMatch = permissionBlock.match(
    new RegExp(`^\\s{2}${key}\\s*:\\s*\\n([\\s\\S]*?)(?=^\\s{2}\\S|(?![\\s\\S]))`, 'm')
  );

  if (!sectionMatch) return null;
  return sectionMatch[1];
}

function extractPermissionSkillBlock(frontmatter) {
  return extractPermissionBlock(frontmatter, 'skill');
}

function extractPermissionTaskBlock(frontmatter) {
  return extractPermissionBlock(frontmatter, 'task');
}

function parsePermissionMap(block, indent = 4) {
  const map = new Map();
  const lines = block.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^\s*#/.test(line)) continue;

    const indentRegex = new RegExp(`^\\s{${indent},}`);
    if (!indentRegex.test(line)) continue;

    const match = line.match(new RegExp(`^\\s{${indent},}([^:]+):\\s*(.+)\\s*$`));
    if (!match) continue;

    const key = match[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    const value = match[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    map.set(key, value);
  }

  return map;
}

function loadAgentRecords(agentFiles, errors) {
  const records = [];

  for (const file of agentFiles) {
    let content;
    try {
      content = fs.readFileSync(file.fullPath, 'utf8');
    } catch (err) {
      errors.push(`${file.name}: Failed to read file - ${err.message}`);
      continue;
    }

    const frontmatterMatch = content.match(/^---\s*\n([\s\S]+?)\n---/);
    if (!frontmatterMatch) {
      errors.push(`${file.name}: Missing frontmatter (---...---)`);
      records.push({
        ...file,
        content,
        frontmatter: null,
        body: getBody(content),
      });
      continue;
    }

    records.push({
      ...file,
      content,
      frontmatter: frontmatterMatch[1],
      body: getBody(content),
    });
  }

  return records;
}

function getBody(content) {
  return content.replace(/^---\s*\n[\s\S]+?\n---\s*\n?/, '');
}

function validateCommands(errors, warnings, knownAgents) {
  const commandsDir = path.join(process.cwd(), '.opencode', 'commands');
  if (!fs.existsSync(commandsDir)) {
    warnings.push('No commands directory found (.opencode/commands)');
    return;
  }

  const commandFiles = fs.readdirSync(commandsDir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => ({ name: f, fullPath: path.join(commandsDir, f) }));

  for (const file of commandFiles) {
    let content;
    try {
      content = fs.readFileSync(file.fullPath, 'utf8');
    } catch (err) {
      errors.push(`.opencode/commands/${file.name}: Failed to read file - ${err.message}`);
      continue;
    }

    const frontmatterMatch = content.match(/^---\s*\n([\s\S]+?)\n---/);
    if (!frontmatterMatch) {
      errors.push(`.opencode/commands/${file.name}: Missing frontmatter (---...---)`);
      continue;
    }

    const frontmatter = frontmatterMatch[1];
    const body = getBody(content);

    const hasField = (field) => new RegExp(`^(?!\\s*#)\\s*${field}\\s*:`, 'm').test(frontmatter);
    const parseField = (field) => {
      const m = frontmatter.match(new RegExp(`^(?!\\s*#)\\s*${field}\\s*:\\s*(.+)$`, 'm'));
      return m ? m[1].trim().replace(/^"|"$/g, '') : null;
    };

    if (!hasField('description')) {
      errors.push(`.opencode/commands/${file.name}: Missing required field 'description'`);
    }
    if (!hasField('agent')) {
      errors.push(`.opencode/commands/${file.name}: Missing required field 'agent'`);
    }
    if (!hasField('subtask')) {
      warnings.push(`.opencode/commands/${file.name}: Missing recommended field 'subtask'`);
    }

    const targetAgent = parseField('agent');
    if (targetAgent && !knownAgents.has(targetAgent)) {
      errors.push(`.opencode/commands/${file.name}: Unknown agent '${targetAgent}' (known: ${[...knownAgents].join(', ')})`);
    }

    if (!hasField('argument-hint')) {
      warnings.push(`.opencode/commands/${file.name}: Missing 'argument-hint' field`);
    }

    if (body.includes('$ARGUMENTS') && !hasField('argument-hint')) {
      warnings.push(`.opencode/commands/${file.name}: Uses $ARGUMENTS but missing 'argument-hint' field`);
    }

    const bodyLines = body.split('\n').filter(l => l.trim().length > 0);
    if (bodyLines.length <= 1) {
      warnings.push(`.opencode/commands/${file.name}: Command body is trivial (<= 1 non-empty line)`);
    }
  }
}

function main() {
  const errors = [];
  const warnings = [];
  const agentDir = path.join(process.cwd(), '.opencode', 'agent');
  const knownSkills = getKnownSkills();

  log(colors.cyan, 'Validating Agent Configurations...');

  // Check agent directory exists
  if (!fs.existsSync(agentDir)) {
    log(colors.red, 'ERROR: No agent directory found (.opencode/agent)');
    process.exit(1);
  }

  log(colors.green, 'Found OpenCode agents directory');
  if (knownSkills.size > 0) {
    log(colors.green, `Discovered ${knownSkills.size} project skills`);
  } else {
    warnings.push('No skills discovered in .opencode/skills (skill allowlist name validation skipped)');
  }

  // Find agent .md files, excluding README.md
  let agentFiles;
  try {
    agentFiles = fs.readdirSync(agentDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .map(f => ({ name: f, fullPath: path.join(agentDir, f) }));
  } catch (err) {
    log(colors.red, `ERROR: Failed to read agent directory - ${err.message}`);
    process.exit(1);
  }

  if (agentFiles.length === 0) {
    log(colors.red, 'ERROR: No agent files found');
    process.exit(1);
  }

  const knownAgents = new Set(agentFiles.map(f => path.basename(f.name, '.md')));
  const agentRecords = loadAgentRecords(agentFiles, errors);

  const knownAgentModes = new Map();
  for (const record of agentRecords) {
    if (!record.frontmatter) continue;
    const modeMatch = record.frontmatter.match(/^(?!\s*#)\s*mode\s*:\s*(.+)$/m);
    if (!modeMatch) continue;
    knownAgentModes.set(path.basename(record.name, '.md'), modeMatch[1].trim());
  }

  const builtinTaskSubagents = new Set(['general', 'explore']);
  const knownTaskSubagents = new Set([...builtinTaskSubagents]);
  for (const [agentName, mode] of knownAgentModes.entries()) {
    if (mode === 'subagent' || mode === 'all') {
      knownTaskSubagents.add(agentName);
    }
  }

  log(colors.green, `Found ${agentFiles.length} agent files\n`);

  const requiredFields = ['description', 'mode'];
  const validModes = ['primary', 'secondary', 'utility', 'subagent'];

  for (const record of agentRecords) {
    const file = { name: record.name, fullPath: record.fullPath };
    log(colors.yellow, `Validating: ${file.name}`);

    if (!record.frontmatter) {
      continue;
    }

    const frontmatter = record.frontmatter;

    // Check required fields (anchored to reject commented-out lines)
    for (const field of requiredFields) {
      const fieldRegex = new RegExp(`^(?!\\s*#)\\s*${field}\\s*:`, 'm');
      if (!fieldRegex.test(frontmatter)) {
        errors.push(`${file.name}: Missing required field '${field}'`);
      }
    }

    // Check mode value (anchored to reject commented-out lines)
    const modeMatch = frontmatter.match(/^(?!\s*#)\s*mode\s*:\s*(.+)/m);
    if (modeMatch) {
      const mode = modeMatch[1].trim();
      if (!validModes.includes(mode)) {
        warnings.push(`${file.name}: Unusual mode value: '${mode}' (expected: primary, secondary, utility, or subagent)`);
      }
    }

    // Check for permission section
    if (!/^permission\s*:/m.test(frontmatter)) {
      warnings.push(`${file.name}: Missing 'permission' section`);
    }

    // Check for a meaningful introductory heading in body
    // Accept: Role, Description, Responsibilities, Core Responsibilities,
    //         Review Areas, Profile Detection, When to Use, Core Principle, etc.
    const body = record.body;
    if (!/^##?\s+\w/m.test(body)) {
      warnings.push(`${file.name}: Missing content headings`);
    }

    // If skill tool is enabled, require explicit activation policy guidance
    const hasSkillTool = /^\s*tools\s*:[\s\S]*?^\s*skill\s*:\s*true\s*$/m.test(frontmatter);
    if (hasSkillTool && !/^##\s+Skill Activation Policy\s*$/m.test(body)) {
      warnings.push(`${file.name}: Missing '## Skill Activation Policy' section (recommended when skill tool is enabled)`);
    }

    // Enforce least-privilege allowlist when skill tool is enabled
    const permissionSkillBlock = extractPermissionSkillBlock(frontmatter);
    if (hasSkillTool && !permissionSkillBlock) {
      warnings.push(`${file.name}: Missing 'permission.skill' allowlist (recommended when skill tool is enabled)`);
    }

    if (hasSkillTool && permissionSkillBlock) {
      const permissionMap = parsePermissionMap(permissionSkillBlock, 4);

      // Require deny-by-default rule
      if (permissionMap.get('*') !== 'deny') {
        errors.push(`${file.name}: permission.skill must include "*": "deny" (deny-by-default)`);
      }

      const allowedSkills = [...permissionMap.entries()]
        .filter(([skillName, decision]) => skillName !== '*' && decision === 'allow')
        .map(([skillName]) => skillName);

      if (allowedSkills.length === 0) {
        warnings.push(`${file.name}: permission.skill has no explicit allow entries`);
      }

      // Validate explicit allow names against discovered project skills
      if (knownSkills.size > 0) {
        for (const allowedSkill of allowedSkills) {
          // Wildcards are valid patterns; skip strict existence check
          if (allowedSkill.includes('*')) continue;
          if (!knownSkills.has(allowedSkill)) {
            errors.push(`${file.name}: permission.skill allow entry '${allowedSkill}' does not match any .opencode/skills/<name>/SKILL.md`);
          }
        }
      }
    }

    // Validate task permissions when task tool is enabled
    const hasTaskTool = /^\s*tools\s*:[\s\S]*?^\s*task\s*:\s*true\s*$/m.test(frontmatter);
    const permissionTaskBlock = extractPermissionTaskBlock(frontmatter);

    if (hasTaskTool && !permissionTaskBlock) {
      warnings.push(`${file.name}: Missing 'permission.task' allowlist (recommended when task tool is enabled)`);
    }

    if (hasTaskTool && permissionTaskBlock) {
      const taskPermissionMap = parsePermissionMap(permissionTaskBlock, 4);
      const wildcardDecision = taskPermissionMap.get('*');

      if (!wildcardDecision) {
        warnings.push(`${file.name}: permission.task should include an explicit '*' baseline rule`);
      } else if (wildcardDecision === 'allow') {
        warnings.push(`${file.name}: permission.task uses "*": "allow" (flexible but broad; explicit allowlist is safer)`);
      } else if (!['deny', 'ask', 'allow'].includes(wildcardDecision)) {
        warnings.push(`${file.name}: permission.task wildcard has unexpected decision '${wildcardDecision}'`);
      }

      const allowedTaskTargets = [...taskPermissionMap.entries()]
        .filter(([name, decision]) => name !== '*' && decision === 'allow')
        .map(([name]) => name);

      for (const target of allowedTaskTargets) {
        if (target.includes('*')) continue;

        if (knownAgentModes.has(target)) {
          const mode = knownAgentModes.get(target);
          if (mode !== 'subagent' && mode !== 'all') {
            warnings.push(`${file.name}: permission.task allow entry '${target}' points to a non-subagent mode ('${mode}')`);
          }
          continue;
        }

        if (!knownTaskSubagents.has(target)) {
          warnings.push(`${file.name}: permission.task allow entry '${target}' is unknown (expected known subagent or builtin task agent)`);
        }
      }
    }

    log(colors.green, '  ✓ Basic structure valid');
  }

  validateCommands(errors, warnings, knownAgents);

  // Results
  console.log('');
  log(colors.cyan, '================================');
  log(colors.cyan, 'Validation Results');
  log(colors.cyan, '================================');

  if (errors.length === 0 && warnings.length === 0) {
    log(colors.green, '✅ All agents validated successfully!');
    process.exit(0);
  }

  if (errors.length > 0) {
    log(colors.red, `\n❌ ERRORS (${errors.length}):`);
    for (const err of errors) {
      log(colors.red, `  • ${err}`);
    }
  }

  if (warnings.length > 0) {
    log(colors.yellow, `\n⚠️  WARNINGS (${warnings.length}):`);
    for (const warn of warnings) {
      log(colors.yellow, `  • ${warn}`);
    }
    log(colors.green, '\n✅ Validation complete (warnings only)');
  }

  if (errors.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main();
