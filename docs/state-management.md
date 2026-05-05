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

Runtime fields (managed by the compaction hook and plugin infrastructure):

- `plugin_version` (string) — version of the session runtime plugin creating/managing state
- `legal_reviews` (string[]) — tracks legal review outcomes across sessions
- `compaction_count` (number) — incremented each time the session is compacted

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

The runtime plugin preserves session state during compaction by:

- Incrementing `compaction_count` on each compaction cycle
- Preserving `legal_reviews` entries across compactions (append-only)
- Retaining `plugin_version` to signal compatibility with the runtime
- Keeping `decisions`, `open_risks`, `blocked_by`, and `next_actions` intact

Session compaction reduces context window usage without losing governance-critical state.

## Memory Budget Recommendations

- **Instruction files**: Keep each `.opencode/instructions/*.md` file under 200 lines. Use
  progressive disclosure — load details on demand rather than eagerly.
- **AGENTS.md**: Hard limit of 100 KB with auto-pruning at 75 KB. Entries follow
  `### YYYY-MM-DD` dated milestone format with a max of 5 top-level bullets per entry.
- **Progressive disclosure pattern**: Ship concise instructions first, then expand on
  demand via skill loading or sub-agent delegation. Avoid preloading unrelated context.
