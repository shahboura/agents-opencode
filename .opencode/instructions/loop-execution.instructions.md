---
description: Safe execution loop protocol for iterative agent work
---

# Safe Execution Loop Protocol

Use this protocol for iterative implementation tasks that may require multiple cycles.

## Goals
- Prevent premature "done" claims
- Avoid runaway/infinite loops
- Keep progress measurable and auditable
- Enforce independent verification before final completion on high-risk tasks

## Completion Contract
- Define explicit completion criteria before implementation starts.
- Completion criteria should be concrete and testable (for example: tests pass, docs updated, lint clean).
- Do not mark task complete until all criteria are satisfied.

## Loop Budget
- Default max loop cycles: **5**.
- A cycle is: plan step -> implement -> validate -> assess remaining work.
- If criteria are unmet after max cycles, escalate with blocker summary and options.

## Validation Per Cycle
- Run relevant validation checks per stack before advancing.
- Record what passed/failed in the cycle summary.
- If a failure repeats twice without progress, switch strategy instead of retrying unchanged.

## Failure and Escalation
- After 2 consecutive no-progress failures on the same issue:
  1. Pause implementation
  2. Summarize root cause hypotheses
  3. Propose 2-3 alternative paths
  4. Ask for decision/approval to continue

## Stop Conditions
- Stop immediately when user requests halt.
- Stop when max loop cycles reached and escalation is raised.
- Stop when external dependency is unavailable and no safe fallback exists.

## Independent Verification Gate
Apply an independent verification pass before final "done" for:
- Security-sensitive changes
- Broad refactors
- Multi-file behavior changes
- CI/CD or deployment workflow edits

Suggested verifier: `@review` agent.

## Reporting Format
At the end of each cycle include:
1. Cycle number (n/max)
2. Changes made
3. Validation results
4. Remaining gaps vs completion criteria
5. Next action or escalation
