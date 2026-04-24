---
description: Execute work with a bounded verify-and-continue loop
agent: orchestrator
argument-hint: "[task goal or deliverable]"
subtask: true
---

# Safe Execution Loop

Use the Safe Execution Loop Protocol to complete this task with controlled iterations.

## Inputs
- Goal: `$ARGUMENTS`

## Loop Rules
1. Define explicit completion criteria before implementation.
2. Run bounded cycles (max 5): plan step -> implement -> validate -> assess gaps.
3. Summarize each cycle with what changed, validation results, and remaining gaps.
4. If the same blocker repeats twice without progress, stop and escalate with options.
5. Before final completion on high-risk changes, run independent verification with `@review`.

## Exit Conditions
- Complete when all completion criteria are satisfied and verification gate passes.
- Stop on explicit user halt.
- Escalate when cycle budget is exhausted.
