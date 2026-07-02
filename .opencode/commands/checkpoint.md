---
description: Emit structured phase-boundary checkpoint for human decision
agent: orchestrator
argument-hint: "[phase name or description]"
subtask: true
---

# Phase Checkpoint

Emit a structured checkpoint at phase boundaries for human steering of multi-phase
orchestration.

## Inputs
- Phase context: `$ARGUMENTS`

## Checkpoint Template

```
## Checkpoint: [Phase] Complete — Human Decision Required
**Phase:** [Description]
**Status:** Complete | Blocked
**Completed:** [What was done — files, key changes]
**Validated:** [Verification results]
**Next phase:** [Name and brief description]
**Decision:** Proceed to next phase?
**Options:**
  [A] Proceed to next phase
  [B] Review changes first, then proceed
  [C] Skip this phase, jump to [alternative]
  [D] Stop and hand off
```

## When to Emit

- At the boundary between completed and pending phases in a multi-phase plan
- After high-risk changes (security, schema, contract, build configuration)
- When the orchestrator needs a decision before continuing
- Before Phase 7 of any plan (final validation gate)
- When a phase completes but validation reveals caveats

The checkpoint pauses execution until the human responds with a decision.
