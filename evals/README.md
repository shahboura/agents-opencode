# Agent Eval Harness v1

Deterministic, static contract checks for agent and command definitions.

## Goals

- Catch agent-behavior contract drift early.
- Keep checks deterministic and dependency-free.
- Complement `scripts/validate-agents.js` with contract-focused rules.

## Scope (v1)

- Planner read-only contract checks.
- Orchestrator plan-first and loop protocol markers.
- Review verification-gate markers.
- Command routing/frontmatter/argument token checks.
- Permission skill/task invariant checks.

## Usage

```bash
npm run eval:agents
npm run eval:agents:json
```

Optional flags:

```bash
node evals/harness/run-evals.js --json --out evals/reports/latest.json
node evals/harness/run-evals.js --quiet
node evals/harness/run-evals.js --root .
```

## Exit codes

- `0`: all checks pass
- `1`: one or more contract violations
- `2`: invalid CLI usage
