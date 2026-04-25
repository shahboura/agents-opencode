#!/usr/bin/env node
'use strict';

const fs = require('fs');

const RISK_RANK = {
  low: 0,
  medium: 1,
  high: 2,
};

const HIGH_RULES = [
  { category: 'workflow-edits', test: (p) => p.startsWith('.github/workflows/') },
  { category: 'agent-policy', test: (p) => p.startsWith('.opencode/agents/') },
  { category: 'instruction-policy', test: (p) => p.startsWith('.opencode/instructions/') },
  { category: 'runtime-config', test: (p) => p === 'opencode.json' },
];

const MEDIUM_RULES = [
  { category: 'command-routing', test: (p) => p.startsWith('.opencode/commands/') },
  { category: 'validation-scripts', test: (p) => p.startsWith('scripts/') },
  { category: 'agent-evals', test: (p) => p.startsWith('evals/') },
  { category: 'approval-policy-docs', test: (p) => p === 'docs/approval-gates.md' },
  { category: 'pr-policy-template', test: (p) => p === '.github/pull_request_template.md' },
];

function parseArgs(argv) {
  const options = {
    changedFilesFile: null,
    prBodyFile: null,
    requireAck: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--changed-files-file') {
      options.changedFilesFile = argv[i + 1] || null;
      i += 1;
      continue;
    }

    if (arg === '--pr-body-file') {
      options.prBodyFile = argv[i + 1] || null;
      i += 1;
      continue;
    }

    if (arg === '--require-ack') {
      options.requireAck = true;
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.changedFilesFile) {
    throw new Error('Missing required argument: --changed-files-file <path>');
  }

  return options;
}

function readLines(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function classifyPath(filePath) {
  const normalized = normalizePath(filePath);

  for (const rule of HIGH_RULES) {
    if (rule.test(normalized)) {
      return {
        risk: 'high',
        category: rule.category,
      };
    }
  }

  for (const rule of MEDIUM_RULES) {
    if (rule.test(normalized)) {
      return {
        risk: 'medium',
        category: rule.category,
      };
    }
  }

  return {
    risk: 'low',
    category: 'general-changes',
  };
}

function readTextOrEmpty(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return '';
  }

  return fs.readFileSync(filePath, 'utf8');
}

function extractAcknowledgedRiskLevel(prBody) {
  if (!prBody || !prBody.trim()) {
    return null;
  }

  const lineMatch = prBody.match(/^[\-\*]?\s*Risk level:\s*(.+)$/im);
  if (!lineMatch) {
    return null;
  }

  const raw = lineMatch[1].trim().toLowerCase();
  if (raw.includes('[low / medium / high]')) {
    return null;
  }

  const riskMatch = raw.match(/\b(low|medium|high)\b/);
  return riskMatch ? riskMatch[1] : null;
}

function assessRisk(changedFiles, prBody, options) {
  let computedRisk = 'low';
  const categories = new Set();
  const byRisk = {
    high: [],
    medium: [],
    low: [],
  };

  for (const filePath of changedFiles) {
    const normalized = normalizePath(filePath);
    const classification = classifyPath(normalized);
    categories.add(classification.category);
    byRisk[classification.risk].push(normalized);

    if (RISK_RANK[classification.risk] > RISK_RANK[computedRisk]) {
      computedRisk = classification.risk;
    }
  }

  const acknowledgedRisk = extractAcknowledgedRiskLevel(prBody);
  const requireAcknowledgment = options.requireAck && computedRisk !== 'low';
  const acknowledgmentSufficient =
    !requireAcknowledgment ||
    (acknowledgedRisk !== null && RISK_RANK[acknowledgedRisk] >= RISK_RANK[computedRisk]);

  return {
    changedFilesCount: changedFiles.length,
    computedRisk,
    acknowledgedRisk,
    requireAcknowledgment,
    acknowledgmentSufficient,
    categories: Array.from(categories).sort(),
    filesByRisk: byRisk,
  };
}

function printHumanSummary(result) {
  console.log('Risk-Scored Review Path');
  console.log(`- Changed files: ${result.changedFilesCount}`);
  console.log(`- Computed risk: ${result.computedRisk}`);
  console.log(`- Triggered categories: ${result.categories.join(', ') || 'none'}`);
  console.log(`- Require PR acknowledgment: ${result.requireAcknowledgment ? 'yes' : 'no'}`);
  console.log(`- Acknowledged risk in PR: ${result.acknowledgedRisk || 'not provided'}`);

  if (result.filesByRisk.high.length > 0) {
    console.log(`- High-risk files: ${result.filesByRisk.high.join(', ')}`);
  }

  if (result.filesByRisk.medium.length > 0) {
    console.log(`- Medium-risk files: ${result.filesByRisk.medium.join(', ')}`);
  }

  if (result.acknowledgmentSufficient) {
    console.log('✅ Risk acknowledgment check passed');
    return;
  }

  console.log('❌ Risk acknowledgment check failed');
  console.log(
    `Action: set PR template \"Risk level\" to at least \"${result.computedRisk}\" and describe rollback approach.`
  );
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
    return;
  }

  const changedFiles = readLines(options.changedFilesFile);
  const prBody = readTextOrEmpty(options.prBodyFile);

  const result = assessRisk(changedFiles, prBody, options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHumanSummary(result);
  }

  process.exit(result.acknowledgmentSufficient ? 0 : 1);
}

main();
