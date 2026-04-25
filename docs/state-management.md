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
