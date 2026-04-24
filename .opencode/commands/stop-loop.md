---
description: Stop iterative loop execution and report current state
agent: orchestrator
argument-hint: "[optional reason or scope]"
subtask: true
---

# Stop Execution Loop

Stop the current iterative workflow immediately and provide a concise status report.

## Required Output
1. What was completed
2. What remains
3. Current blockers
4. Safe next-step options (2-3)

Optional context: `$ARGUMENTS`
