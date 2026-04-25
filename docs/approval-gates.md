---
layout: default
title: Approval Gates
nav_order: 10
description: Human approval rubric for medium and high risk repository operations.
---

# Human Approval Gates

Use this rubric before applying repository-changing actions.

## Risk Levels

- **Low** — Safe, reversible, no security/release impact.
  - Examples: docs wording updates, non-critical refactors, tests, formatting.
  - Approval: not required.

- **Medium** — Operational or policy impact, generally recoverable.
  - Examples: CI/workflow edits, non-destructive permission/policy adjustments.
  - Approval: required before applying changes.

- **High** — Security-sensitive, destructive, or external-impact actions.
  - Examples: destructive file operations, secrets/security file changes, release/publish actions.
  - Approval: required before any execution.

## Mandatory Explicit Approval Triggers

Require explicit approval when changes touch:

1. **CI/workflow edits** (`.github/workflows/**`)
2. **Permissions/policy changes** (agent permissions, skill/task allowlists, auth/policy baselines)
3. **Destructive file operations** (bulk deletes/moves, force-overwrites, history rewrites)
4. **Release/publish actions** (tagging, publishing, deployment)
5. **Secrets/security-sensitive files** (`.env*`, key/cert/token/credential files)

## What Counts as Explicit Approval

Approval must be clear and affirmative in the current thread (for example: "Approved", "Proceed").
Silence or implied intent does not count.

## If Approval Is Missing

- Do not execute medium/high-risk actions.
- Continue with safe work only (analysis, plans, draft patches).
- Provide an approval request with:
  - risk level,
  - affected files/commands,
  - expected impact,
  - rollback plan.

## Context Log Quality Guardrail

For `AGENTS.md` milestone entries, keep updates concise:

- Aim for **3-5 top-level bullets** per entry.
- Prefer one decision-oriented bullet per major outcome.
- Avoid copying large diffs or command output into entries.

The context checker surfaces warnings when entries exceed the bullet guidance.
