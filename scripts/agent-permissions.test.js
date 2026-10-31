#!/usr/bin/env node
'use strict';

/**
 * Pack permission-policy checks for .opencode/agents/*.md.
 *
 * These assert the policy this pack ships (secret read-blocking and sample-file
 * allow ordering, skill access, deny ordering, last-match-wins resolution).
 * They do not exercise OpenCode itself: that needs a live host.
 */

const fs = require('fs');
const path = require('path');

const {
  frontmatterOf,
  analyzePermission,
  permissionChildBlock,
  parseMapEntries,
} = require('./lib/opencode-schema');

const repoRoot = path.resolve(__dirname, '..');
const agentsDir = path.join(repoRoot, '.opencode', 'agents');

const SECRET_READ_DENIES = ['.env', '.env.*', '.envrc', '.envrc.*'];
const SECRET_READ_ALLOW = '.env.example';
// Public sample files are safe to read. Each one present must come after the
// secret denies, because the last matching rule wins.
const SECRET_SAMPLE_ALLOWS = ['.env.example', '.env.sample', '.env.template', '.env.dist', '.env.defaults'];
const DENY_FAMILIES = [
  { label: 'rm -rf', pattern: /^rm -rf / },
  { label: 'force-push (--force)', pattern: /^git push\*--force\*$/ },
  { label: 'force-push (-f)', pattern: /^git push -f\*$/ },
  { label: 'force-push (* -f)', pattern: /^git push \* -f\*$/ },
];
const SHELL_AGENTS = ['codebase', 'orchestrator', 'em-advisor'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadAgents() {
  return fs.readdirSync(agentsDir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .map((file) => ({
      name: path.basename(file, '.md'),
      frontmatter: frontmatterOf(fs.readFileSync(path.join(agentsDir, file), 'utf8')),
    }));
}

function permissionBlockOf(agent) {
  assert(agent.frontmatter, `${agent.name}: missing frontmatter`);
  const analysis = analyzePermission(agent.frontmatter);
  assert(analysis.present && !analysis.inline, `${agent.name}: permission must be a block mapping`);
  return analysis.block;
}

// Nested permission child as a Map; null when the child is absent.
function childMap(agent, key) {
  const child = permissionChildBlock(permissionBlockOf(agent), key);
  if (!child) return null;
  assert(!child.inline, `${agent.name}: permission.${key} must be a nested mapping, not an inline value`);
  return parseMapEntries(child.block);
}

// Inline permission child value (e.g. `read: "allow"`); null when nested/absent.
function childValue(agent, key) {
  const block = permissionBlockOf(agent);
  const child = permissionChildBlock(block, key);
  if (!child || !child.inline) return null;
  const line = block.match(new RegExp(`^[ \\t]+["']?${key}["']?\\s*:\\s*([^\\s#]+)`, 'm'));
  return line ? line[1].replace(/^["']|["']$/g, '') : '';
}

function hasReadGrant(agent) {
  // childMap asserts on inline `read:` values, so no inline fallback is reachable.
  const map = childMap(agent, 'read');
  return map !== null && [...map.values()].includes('allow');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Index of the last `<name>$` entry with the given effect; -1 when absent.
function ruleIndex(entries, name, effect) {
  const suffix = new RegExp(`${escapeRegExp(name)}$`);
  let found = -1;
  entries.forEach(([pattern, decision], index) => {
    if (decision === effect && suffix.test(pattern)) found = index;
  });
  return found;
}

function testReadSecretDenies(agents) {
  const readers = agents.filter(hasReadGrant);
  assert(readers.length > 0, 'Expected at least one agent with read access');

  for (const agent of readers) {
    const entries = [...childMap(agent, 'read').entries()];
    for (const pattern of SECRET_READ_DENIES) {
      assert(
        ruleIndex(entries, pattern, 'deny') !== -1,
        `${agent.name}: read must deny "${pattern}" (e.g. "*.env": "deny")`
      );
    }

    const lastDeny = Math.max(...SECRET_READ_DENIES.map((pattern) => ruleIndex(entries, pattern, 'deny')));
    const example = ruleIndex(entries, SECRET_READ_ALLOW, 'allow');
    assert(example !== -1, `${agent.name}: read must allow "${SECRET_READ_ALLOW}"`);
    assert(
      example > lastDeny,
      `${agent.name}: "${SECRET_READ_ALLOW}" allow must come after the .env denies (last match wins)`
    );

    for (const pattern of SECRET_SAMPLE_ALLOWS) {
      const index = ruleIndex(entries, pattern, 'allow');
      if (index === -1) continue;
      assert(
        index > lastDeny,
        `${agent.name}: "${pattern}" allow must come after the .env denies (last match wins)`
      );
    }
  }
}

function testSkillPolicy(agents) {
  for (const agent of agents) {
    if (agent.name === 'researcher') {
      assert(
        childMap(agent, 'skill') === null && childValue(agent, 'skill') === null,
        'researcher: must not have permission.skill'
      );
      continue;
    }

    const map = childMap(agent, 'skill');
    assert(map, `${agent.name}: expected permission.skill`);
    assert(map.get('*') === 'allow', `${agent.name}: expected permission.skill "*": "allow"`);
  }
}

function testDenyOrdering(agents) {
  for (const agent of agents) {
    // `bash: "deny"` has no allowlist to order; only nested bash blocks matter.
    const child = permissionChildBlock(permissionBlockOf(agent), 'bash');
    if (!child || child.inline) continue;
    const entries = [...parseMapEntries(child.block).entries()];
    const lastAllow = entries.map(([, effect]) => effect).lastIndexOf('allow');
    assert(lastAllow !== -1, `${agent.name}: expected shell allow entries`);

    for (const { label, pattern } of DENY_FAMILIES) {
      assert(
        entries.some(([key, effect]) => effect === 'deny' && pattern.test(key)),
        `${agent.name}: missing a "${label}" deny entry`
      );
    }

    // Last match wins, so any deny placed before the last allow is dead.
    entries.forEach(([pattern, effect], index) => {
      if (effect !== 'deny') return;
      assert(index > lastAllow, `${agent.name}: deny "${pattern}" must come after the allows (last match wins)`);
    });
  }
}

function matchesPattern(pattern, command) {
  const match = (value) =>
    new RegExp(`^${value.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(command);
  // OpenCode also matches a pattern ending in " *" against the command without arguments.
  // Host behavior: v2 permission matching (packages/core/src/util/wildcard.ts, docs permissions#matching).
  return match(pattern) || (pattern.endsWith(' *') && match(pattern.slice(0, -2)));
}

// Documents OpenCode behavior: the last matching pattern decides.
function resolveShell(bash, command) {
  let decision = null;
  for (const [pattern, effect] of bash) {
    if (matchesPattern(pattern, command)) decision = effect;
  }
  return decision;
}

// OpenCode v2 may resolve a compound command to several resources, so every part
// has to clear the policy on its own; one ask or deny makes the whole command ask.
function resolveCompound(bash, command) {
  return command
    .split(/\s*(?:&&|\|\||;|\|)\s*/)
    .map((part) => resolveShell(bash, part))
    .reduce((worst, decision) => {
      if (worst === 'deny' || decision === 'deny') return 'deny';
      if (worst === 'ask' || decision !== 'allow') return 'ask';
      return 'allow';
    }, 'allow');
}

function testShellMatcher(agents) {
  for (const name of SHELL_AGENTS) {
    const agent = agents.find((candidate) => candidate.name === name);
    assert(agent, `${name}: agent file not found`);
    const bash = childMap(agent, 'bash');
    assert(bash, `${name}: expected a nested permission.bash mapping`);

    assert(
      resolveShell(bash, 'TEST_DATABASE_URL=x pnpm exec vitest run') === 'ask',
      `${name}: expected an env-prefixed test command to fall through to the "*": "ask" guard`
    );
    // Existing test-runner entries, including bare forms covered by the trailing " *".
    for (const command of [
      'npm test',
      'npm run test',
      'pnpm test',
      'yarn test',
      'yarn run test',
      'bun test',
      'bun run test',
      'pytest',
      'go test',
      'cargo test',
      'mvn test',
      'rails test',
    ]) {
      assert(resolveShell(bash, command) === 'allow', `${name}: expected "${command}" to be allowed`);
    }
    // Playwright's official scaffold commands and the installed binary may run tests;
    // installs, env prefixes, and secret reads chained to them still ask.
    for (const command of [
      'npx playwright test',
      'npx playwright test --project=desktop',
      'pnpm exec playwright test',
      'pnpm exec playwright test --project=desktop',
      'yarn playwright test',
      'yarn playwright test --project=desktop',
      './node_modules/.bin/playwright test',
      './node_modules/.bin/playwright test --project=desktop',
    ]) {
      assert(resolveShell(bash, command) === 'allow', `${name}: expected "${command}" to be allowed`);
    }
    for (const command of [
      'npx playwright install chromium',
      'pnpm exec playwright install',
      'yarn playwright install',
      './node_modules/.bin/playwright install',
      'PLAYWRIGHT_BROWSERS_PATH=x npx playwright test',
      'PLAYWRIGHT_BROWSERS_PATH=x ./node_modules/.bin/playwright test',
      'mvn test exec:exec -Dexec.executable=bash',
      'mvn test -f /tmp/pom.xml',
    ]) {
      assert(resolveShell(bash, command) === 'ask', `${name}: expected "${command}" to ask`);
    }
    assert(
      resolveCompound(bash, 'npx playwright test && cat .env') === 'ask',
      `${name}: expected a &&-chained secret read to ask`
    );
    assert(resolveShell(bash, 'rm -rf build') === 'deny', `${name}: expected "rm -rf" to match a shell deny`);
    // Current behavior: the redirection guards also match `2>&1`, so this asks.
    assert(resolveShell(bash, 'echo 2>&1') === 'ask', `${name}: expected the redirection guard to match "echo 2>&1"`);
    // A secret read hidden behind an allowlisted prefix must not ride through.
    assert(
      resolveCompound(bash, 'git status && cat .env') === 'ask',
      `${name}: expected "git status && cat .env" to resolve to "ask" (compound parts resolve separately)`
    );
  }
}

function main() {
  try {
    console.log('Running agent permission tests...');
    const agents = loadAgents();
    testReadSecretDenies(agents);
    testSkillPolicy(agents);
    testDenyOrdering(agents);
    testShellMatcher(agents);
    console.log('✅ Agent permission tests passed');
  } catch (err) {
    console.error('❌ Agent permission tests failed');
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
