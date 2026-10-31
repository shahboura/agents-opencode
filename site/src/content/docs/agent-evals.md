---
title: Agent Eval Harness
description: Deterministic contract checks for agent and command behavior metadata.
sidebar:
  order: 9
---

The Agent Eval Harness adds deterministic contract checks on top of structural validation.

It verifies behavior-critical metadata and instruction markers for:

- Planner read-only posture
- Orchestrator plan-first and loop protocol markers
- Review verification-gate markers
- Command routing/frontmatter/argument consistency
- Permission skill/task invariants

:::tip[What you get]
- A pass/fail summary for every agent and command contract check.
- A JSON report at `evals/reports/latest.json` when you ask for one.
- A trend snapshot you can compare against the previous run.
:::

## Commands

```bash
npm run eval:agents
npm run eval:agents:json
npm run eval:agents:trend
```

## Output

- Human-readable summary in terminal
- Optional JSON report at `evals/reports/latest.json`
- Trend snapshot markdown at `evals/reports/trend-summary.md`

In CI (`validate-agent-evals`), the JSON report and trend snapshot are uploaded
as workflow artifacts.

## Design Notes

- Static and deterministic (no model calls)
- No external dependencies
- Designed as a lightweight contract gate, not a benchmark framework

## Fixtures

Regression fixtures for harness and validator tests live under `scripts/fixtures/`.
This keeps golden inputs explicit and reusable across tests.

## Verify It Worked

```bash
npm run eval:agents
```

Prints `Agent eval passed` and exits 0 when every contract check holds.

## Next

Continue with [Agent Skills Matrix](/skills-matrix/).
