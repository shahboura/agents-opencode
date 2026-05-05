#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const RULES = {
  PLANNER_READ_ONLY: 'planner-read-only',
  ORCHESTRATOR_PLAN_LOOP: 'orchestrator-plan-loop',
  REVIEW_VERIFICATION_GATE: 'review-verification-gate',
  COMMAND_ROUTING_METADATA: 'command-routing-metadata',
  PERMISSION_INVARIANTS: 'permission-invariants',
};

const BUILTIN_TASK_TARGETS = new Set(['general', 'explore']);

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    json: false,
    out: null,
    quiet: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--quiet') {
      options.quiet = true;
      continue;
    }

    if (arg === '--root') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--root requires a path value');
      }
      options.root = path.resolve(next);
      i += 1;
      continue;
    }

    if (arg === '--out') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--out requires a file path value');
      }
      options.out = path.resolve(next);
      i += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function readMarkdownRecords(dirPath, { excludeReadme = false } = {}) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath)
    .filter((entry) => entry.endsWith('.md'))
    .filter((entry) => !(excludeReadme && entry.toLowerCase() === 'readme.md'))
    .sort()
    .map((entry) => {
      const filePath = path.join(dirPath, entry);
      const content = fs.readFileSync(filePath, 'utf8');
      const split = splitFrontmatter(content);
      return {
        name: entry,
        id: path.basename(entry, '.md'),
        path: filePath,
        relativePath: toPosix(path.relative(process.cwd(), filePath)),
        frontmatter: split.frontmatter,
        body: split.body,
      };
    });
}

function splitFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]+?)\n---\s*\n?([\s\S]*)$/);
  if (!match) {
    return {
      frontmatter: null,
      body: content,
    };
  }

  return {
    frontmatter: match[1],
    body: match[2],
  };
}

function extractField(frontmatter, field) {
  if (!frontmatter) {
    return null;
  }
  const match = frontmatter.match(new RegExp(`^(?!\\s*#)\\s*${field}\\s*:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^"|"$/g, '') : null;
}

function extractPermissionBlock(frontmatter) {
  if (!frontmatter) {
    return null;
  }
  const match = frontmatter.match(/^permission\s*:\s*\n([\s\S]*?)(?=^\S|(?![\s\S]))/m);
  return match ? match[1] : null;
}

function extractNestedBlock(block, key) {
  if (!block) {
    return null;
  }
  const match = block.match(new RegExp(`^\\s{2}${key}\\s*:\\s*\\n([\\s\\S]*?)(?=^\\s{2}\\S|(?![\\s\\S]))`, 'm'));
  return match ? match[1] : null;
}

function parseMapEntries(block, indent = 2) {
  const map = new Map();
  if (!block) {
    return map;
  }

  const lines = block.split('\n');
  for (const line of lines) {
    if (!line.trim() || /^\s*#/.test(line)) {
      continue;
    }

    const match = line.match(new RegExp(`^\\s{${indent},}([^:]+):\\s*(.+)\\s*$`));
    if (!match) {
      continue;
    }

    const key = match[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    const value = match[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    map.set(key, value);
  }

  return map;
}

function toPosix(inputPath) {
  return inputPath.split(path.sep).join('/');
}

function readExpectedContracts(rootDir) {
  const contractPath = path.join(rootDir, 'evals', 'fixtures', 'expected-contracts.json');
  if (!fs.existsSync(contractPath)) {
    return {
      planner: {
        requiredBodyPatterns: ['read-only', 'no code edits'],
      },
      orchestrator: {
        requiredBodyPatterns: ['planning phase', 'await approval', 'safe execution loop protocol'],
      },
      review: {
        requiredBodyPatterns: ['verification gate', 'pass / pass-with-conditions / fail'],
      },
    };
  }

  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

function collectSkillNames(rootDir) {
  const skillsDir = path.join(rootDir, '.opencode', 'skills');
  if (!fs.existsSync(skillsDir)) {
    return new Set();
  }

  const names = new Set();
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      names.add(entry.name);
    }
  }

  return names;
}

function addIssue(issues, ruleId, target, message) {
  issues.push({
    ruleId,
    severity: 'error',
    target,
    message,
  });
}

function expectBodyPatterns(issues, ruleId, target, body, patterns) {
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, 'i');
    if (!regex.test(body)) {
      addIssue(issues, ruleId, target, `Missing required body marker: ${pattern}`);
    }
  }
}

function runPlannerReadOnlyRule(issues, planner, expectedContracts) {
  if (!planner) {
    addIssue(issues, RULES.PLANNER_READ_ONLY, '.opencode/agents/planner.md', 'Planner agent file is missing');
    return;
  }

  const permissionBlock = extractPermissionBlock(planner.frontmatter);
  const permissionMap = parseMapEntries(permissionBlock, 2);

  if (permissionMap.get('*') !== 'deny') {
    addIssue(issues, RULES.PLANNER_READ_ONLY, planner.relativePath, 'Planner permission must include "*": "deny"');
  }

  if (permissionMap.get('edit') !== 'deny') {
    addIssue(issues, RULES.PLANNER_READ_ONLY, planner.relativePath, 'Planner edit permission must be deny');
  }

  if (permissionMap.get('bash') !== 'deny') {
    addIssue(issues, RULES.PLANNER_READ_ONLY, planner.relativePath, 'Planner bash permission must be deny');
  }

  expectBodyPatterns(
    issues,
    RULES.PLANNER_READ_ONLY,
    planner.relativePath,
    planner.body,
    expectedContracts.planner.requiredBodyPatterns
  );
}

function runOrchestratorPlanLoopRule(issues, orchestrator, expectedContracts) {
  if (!orchestrator) {
    addIssue(issues, RULES.ORCHESTRATOR_PLAN_LOOP, '.opencode/agents/orchestrator.md', 'Orchestrator agent file is missing');
    return;
  }

  expectBodyPatterns(
    issues,
    RULES.ORCHESTRATOR_PLAN_LOOP,
    orchestrator.relativePath,
    orchestrator.body,
    expectedContracts.orchestrator.requiredBodyPatterns
  );
}

function runReviewVerificationRule(issues, review, expectedContracts) {
  if (!review) {
    addIssue(issues, RULES.REVIEW_VERIFICATION_GATE, '.opencode/agents/review.md', 'Review agent file is missing');
    return;
  }

  const permissionBlock = extractPermissionBlock(review.frontmatter);
  const permissionMap = parseMapEntries(permissionBlock, 2);
  if (permissionMap.get('edit') === 'allow' || permissionMap.get('write') === 'allow') {
    addIssue(issues, RULES.REVIEW_VERIFICATION_GATE, review.relativePath, 'Review agent should not allow edit/write permissions');
  }

  expectBodyPatterns(
    issues,
    RULES.REVIEW_VERIFICATION_GATE,
    review.relativePath,
    review.body,
    expectedContracts.review.requiredBodyPatterns
  );
}

function runCommandRoutingRule(issues, commands, knownAgents) {
  for (const command of commands) {
    if (!command.frontmatter) {
      addIssue(issues, RULES.COMMAND_ROUTING_METADATA, command.relativePath, 'Command is missing frontmatter');
      continue;
    }

    const description = extractField(command.frontmatter, 'description');
    const agent = extractField(command.frontmatter, 'agent');
    const subtask = extractField(command.frontmatter, 'subtask');
    const argumentHint = extractField(command.frontmatter, 'argument-hint');

    if (!description) {
      addIssue(issues, RULES.COMMAND_ROUTING_METADATA, command.relativePath, 'Missing required frontmatter field: description');
    }

    if (!agent) {
      addIssue(issues, RULES.COMMAND_ROUTING_METADATA, command.relativePath, 'Missing required frontmatter field: agent');
    } else if (!knownAgents.has(agent)) {
      addIssue(issues, RULES.COMMAND_ROUTING_METADATA, command.relativePath, `Command routes to unknown agent: ${agent}`);
    }

    if (!subtask || !['true', 'false'].includes(subtask)) {
      addIssue(issues, RULES.COMMAND_ROUTING_METADATA, command.relativePath, 'subtask must be an explicit boolean value');
    }

    if (!argumentHint) {
      addIssue(issues, RULES.COMMAND_ROUTING_METADATA, command.relativePath, 'Missing required frontmatter field: argument-hint');
    }

    if (command.body.includes('$ARGUMENTS') && !argumentHint) {
      addIssue(issues, RULES.COMMAND_ROUTING_METADATA, command.relativePath, 'Command uses $ARGUMENTS but argument-hint is missing');
    }
  }
}

function runPermissionInvariantRule(issues, agents, knownSkills, taskTargets) {
  for (const agent of agents) {
    if (!agent.frontmatter) {
      addIssue(issues, RULES.PERMISSION_INVARIANTS, agent.relativePath, 'Agent is missing frontmatter');
      continue;
    }

    const permissionBlock = extractPermissionBlock(agent.frontmatter);
    const permissionMap = parseMapEntries(permissionBlock, 2);

    if (permissionMap.get('*') !== 'deny') {
      addIssue(issues, RULES.PERMISSION_INVARIANTS, agent.relativePath, 'permission must include "*": "deny"');
    }

    const skillBlock = extractNestedBlock(permissionBlock, 'skill');
    if (skillBlock) {
      const skillMap = parseMapEntries(skillBlock, 4);
      if (skillMap.get('*') !== 'deny') {
        addIssue(issues, RULES.PERMISSION_INVARIANTS, agent.relativePath, 'permission.skill must include "*": "deny"');
      }

      for (const [skillName, decision] of skillMap.entries()) {
        if (skillName === '*' || decision !== 'allow' || skillName.includes('*')) {
          continue;
        }
        if (!knownSkills.has(skillName)) {
          addIssue(issues, RULES.PERMISSION_INVARIANTS, agent.relativePath, `Unknown allowed skill: ${skillName}`);
        }
      }
    }

    const taskBlock = extractNestedBlock(permissionBlock, 'task');
    if (taskBlock) {
      const taskMap = parseMapEntries(taskBlock, 4);
      if (taskMap.get('*') !== 'deny') {
        addIssue(issues, RULES.PERMISSION_INVARIANTS, agent.relativePath, 'permission.task must include "*": "deny"');
      }

      for (const [taskTarget, decision] of taskMap.entries()) {
        if (taskTarget === '*' || decision !== 'allow') {
          continue;
        }
        if (taskTarget.includes('*')) {
          addIssue(issues, RULES.PERMISSION_INVARIANTS, agent.relativePath, `Wildcard task allow is not allowed: ${taskTarget}`);
          continue;
        }
        if (!taskTargets.has(taskTarget)) {
          addIssue(issues, RULES.PERMISSION_INVARIANTS, agent.relativePath, `Unknown task allow target: ${taskTarget}`);
        }
      }
    }
  }
}

function printSummary(report, options) {
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('Agent Eval Harness v1\n');
  console.log(`Root: ${report.root}`);
  console.log(`Rules: ${report.summary.rules}`);
  console.log(`Issues: ${report.summary.issues} (errors: ${report.summary.errors})`);

  if (!options.quiet && report.issues.length > 0) {
    console.log('');
    for (const issue of report.issues) {
      console.log(`- [${issue.ruleId}] ${issue.target}: ${issue.message}`);
    }
  }

  console.log('');
  if (report.summary.errors > 0) {
    console.log('❌ Agent eval failed');
  } else {
    console.log('✅ Agent eval passed');
  }
}

function writeReport(report, outputPath) {
  if (!outputPath) {
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(2);
    return;
  }

  const root = options.root;
  const startedAt = new Date();

  const agentDir = path.join(root, '.opencode', 'agents');
  const commandDir = path.join(root, '.opencode', 'commands');

  const agents = readMarkdownRecords(agentDir);
  const commands = readMarkdownRecords(commandDir, { excludeReadme: true });

  const knownAgents = new Set(agents.map((agent) => agent.id));
  const subagentTargets = new Set();
  for (const agent of agents) {
    const mode = extractField(agent.frontmatter, 'mode');
    if (mode === 'subagent' || mode === 'all') {
      subagentTargets.add(agent.id);
    }
  }

  const taskTargets = new Set([...BUILTIN_TASK_TARGETS, ...subagentTargets]);
  const knownSkills = collectSkillNames(root);
  const expectedContracts = readExpectedContracts(root);

  const planner = agents.find((agent) => agent.id === 'planner');
  const orchestrator = agents.find((agent) => agent.id === 'orchestrator');
  const review = agents.find((agent) => agent.id === 'review');

  const issues = [];
  runPlannerReadOnlyRule(issues, planner, expectedContracts);
  runOrchestratorPlanLoopRule(issues, orchestrator, expectedContracts);
  runReviewVerificationRule(issues, review, expectedContracts);
  runCommandRoutingRule(issues, commands, knownAgents);
  runPermissionInvariantRule(issues, agents, knownSkills, taskTargets);

  const endedAt = new Date();
  const report = {
    version: '1.0',
    tool: 'agent-eval-harness',
    root: root,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    summary: {
      rules: Object.keys(RULES).length,
      issues: issues.length,
      errors: issues.filter((issue) => issue.severity === 'error').length,
    },
    issues,
    ok: issues.length === 0,
  };

  writeReport(report, options.out);
  printSummary(report, options);

  process.exit(report.ok ? 0 : 1);
}

main();
