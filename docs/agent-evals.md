---
layout: default
title: Agent Evals
nav_order: 9
description: Deterministic contract checks for agent and command behavior metadata.
---

# Agent Eval Harness

The Agent Eval Harness adds deterministic contract checks on top of structural validation.

It verifies behavior-critical metadata and instruction markers for:

- Planner read-only posture
- Orchestrator plan-first and loop protocol markers
- Review verification-gate markers
- Command routing/frontmatter/argument consistency
- Permission skill/task invariants

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
