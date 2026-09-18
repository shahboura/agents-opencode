---
layout: default
title: State Management
nav_order: 13
description: Structured session state contract and handoff packet workflow for agentic continuity.
---

# State Management

This repository uses a structured state contract for short-lived working memory,
plus generated handoff packets for session-to-session continuity.

## Files

- `AGENTS.md` — canonical Context Persistence Format (milestone entry template,
  format rules, agent session workflow). All agents reference this format.
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

- `validate-session-state` validates `state/session-state.json`
- `validate-session-state` generates `handoff/latest.md`
- `handoff/latest.md` is uploaded as a workflow artifact for traceability

## Compaction Hook

During compaction the runtime plugin injects a state-context reminder (state
contract, handoff, and milestone locations) so agents keep track of where durable
state lives. Compaction does not modify `state/session-state.json`.

Durable state remains the source of truth across compactions:

- `state/session-state.json` keeps decisions, risks, blockers, and next actions
- `handoff/latest.md` is regenerated from state for session-to-session continuity
- `AGENTS.md` records milestone history

Session compaction reduces context window usage without relying on context alone.

## Memory Budget Recommendations

- **Instruction files**: Keep each `.opencode/instructions/*.md` file under 200 lines. Use
  progressive disclosure — load details on demand rather than eagerly.
- **AGENTS.md**: Hard limit of 100 KB with auto-pruning at 75 KB. Entries follow
  `### YYYY-MM-DD` dated milestone format with a max of 5 top-level bullets per entry.
- **Progressive disclosure pattern**: Ship concise instructions first, then expand on
  demand via skill loading or sub-agent delegation. Avoid preloading unrelated context.
