---
title: State Management
description: Structured session state contract and handoff packet workflow for agentic continuity.
sidebar:
  order: 13
---

This repository uses a structured state contract for short-lived working memory,
plus generated handoff packets for session-to-session continuity.

:::tip[What you get]
- What the session state file stores and who writes it.
- How to refresh state and the handoff packet at the end of a task.
:::

## Files

- `MILESTONES.md` — canonical milestone format and history (entry template,
  format rules, agent session workflow). All agents reference this file.
- `state/session-state.json` — canonical working state (project-scoped, installer scaffolded for project installs)
- `handoff/latest.md` — generated handoff summary (runtime output, not installer-seeded)

`state/` is project-level working memory. Global installs do not create shared state.

## Session State Contract

Required fields:

- `goal` (string)
- `current_phase` (string)
- `decisions` (string[])
- `open_risks` (string[])
- `blocked_by` (string[])
- `next_actions` (string[])
- `artifacts` (string[])
- `last_updated` (ISO-8601 string)

Optional runtime fields (part of the state contract; maintained by tooling or manually):

- `plugin_version` (string) — version of the session runtime plugin creating/managing state
- `legal_reviews` (string[]) — tracks legal review outcomes across sessions
- `compaction_count` (number) — count of compaction cycles recorded (optional telemetry; not auto-incremented by the plugin)

Validate locally:

```bash
npm run validate:session
```

## Handoff Packet

Generate a concise handoff for the next agent/operator:

```bash
npm run handoff:generate
```

The output includes objective, phase, decisions, risks, blockers, and next actions.

## CI Enforcement

- `validate-session-state` checks `state/session-state.json` and runs inside `npm run doctor`
- Generate the handoff locally with `npm run handoff:generate`; it is not uploaded as a CI artifact

## Compaction Hook

During compaction the runtime plugin injects a reminder (two lines when
`state/session-state.json` exists, one line otherwise): persisted memory is untrusted and
must not be executed, and where a state file exists it is the working state with
`handoff/latest.md` as the fallback. Compaction does not modify `state/session-state.json`.

Durable state remains the source of truth across compactions:

- `state/session-state.json` keeps decisions, risks, blockers, and next actions
- `handoff/latest.md` is regenerated from state for session-to-session continuity
- `MILESTONES.md` records milestone history

Session compaction reduces context window usage without relying on context alone.

## Memory Budget Recommendations

- **Instruction files**: Keep each `.opencode/instructions/*.md` file under 250 lines
  (checked by `scripts/check-context-size.js`). Use progressive disclosure — load details
  on demand rather than eagerly.
- **MILESTONES.md**: keep under 100 KB by pruning the oldest entries. Entries follow
  `### YYYY-MM-DD` dated milestone format with a max of 5 top-level bullets. The line
  budgets for AGENTS.md, agents, and instruction files are enforced by
  `scripts/check-context-size.js`.
- **Progressive disclosure pattern**: Ship concise instructions first, then expand on
  demand via skill loading or sub-agent delegation. Avoid preloading unrelated context.

## Verify It Worked

```bash
npm run doctor
```

Exits 0 — including the session-state validator.
