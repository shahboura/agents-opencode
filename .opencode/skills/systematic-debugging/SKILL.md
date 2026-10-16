---
name: systematic-debugging
description: >-
  Root-cause debugging discipline for any bug, test failure, or unexpected
  behavior: investigate before proposing fixes. Language- and framework-
  agnostic. Use before attempting a fix, especially under time pressure.
license: MIT
compatibility: opencode
metadata:
  author: shahboura (methodology adapted from obra/superpowers, MIT)
  version: "1.0.0"
  audience: developers
  workflow: debugging
---

# Systematic Debugging — root cause before fixes

## What I do

- Enforce a four-phase investigation before any fix is proposed
- Turn "quick fix" pressure into evidence gathering
- Escalate repeated failed fixes into an architecture question
- Ship root-cause fixes, not symptom patches

## When to use me

Use for ANY technical issue: test failures, production bugs, unexpected
behavior, performance problems, build or integration failures.

Use ESPECIALLY when:

- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You have already tried multiple fixes
- You do not fully understand the issue

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If Phase 1 is not complete, you cannot propose a fix.

## The four phases

Complete each phase before starting the next.

### Phase 1 — Root cause investigation

1. **Read the error carefully** — full stack traces, line numbers, paths, codes.
2. **Reproduce consistently** — exact steps, every time; if it is not reproducible, gather more data, do not guess.
3. **Check recent changes** — VCS diff, new dependencies, config, environment.
4. **Gather evidence at component boundaries** — for multi-component systems, instrument each boundary (log inputs, outputs, config propagation) and run once to see WHERE it breaks before analysing. Log only the specific non-sensitive values needed; never log secrets, tokens, or PII.
5. **Trace the data flow** — follow the bad value backward to its origin and fix at the source. See `references/root-cause-tracing.md`.

### Phase 2 — Pattern analysis

- Find similar working code in the same codebase.
- Read any reference implementation completely — no skimming.
- List every difference between working and broken, however small.
- Understand the dependencies, settings, and assumptions.

### Phase 3 — Hypothesis and testing

- State one specific hypothesis ("X is the cause because Y") and write it down.
- Test with the smallest possible change — one variable at a time.
- Confirmed → Phase 4. Not confirmed → form a NEW hypothesis; do not stack fixes.
- If you do not understand something, say so and research it.

### Phase 4 — Implementation

1. Create a failing test case that reproduces the bug (see `test-driven-development`).
2. Implement ONE fix for the root cause — no bundled refactors, no "while I'm here" changes.
3. Verify: the test passes and nothing else broke (see `verification-before-completion`).
4. If the fix does not work, return to Phase 1 with the new information.
5. **Three or more failed fixes → question the architecture**, not the hypothesis. Each fix revealing a new problem elsewhere is a design signal, not bad luck. Discuss with the user before attempting more fixes.

## Red flags — stop and return to Phase 1

- "Quick fix now, investigate later"
- "Just try changing X and see"
- "Add several changes and run the tests"
- "It's probably X, let me fix that"
- Proposing solutions before tracing the data flow
- "One more fix attempt" after two failures
- Each fix reveals a new problem in a different place

## Common rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, no process needed" | Simple issues have root causes too; the process is fast for them. |
| "Emergency — no time" | Systematic debugging is faster than guess-and-check thrashing. |
| "Just try this first" | The first fix sets the pattern; do it right from the start. |
| "I'll write the test after confirming the fix" | Untested fixes do not stick; a test first proves it. |
| "Several fixes at once saves time" | You cannot isolate what worked, and you cause new bugs. |
| "I see the problem" | Seeing symptoms is not understanding the root cause. |

## When there is genuinely no root cause

If investigation shows the issue is environmental, timing-dependent, or
external: document what you investigated, implement appropriate handling
(retry, timeout, clear error), and add monitoring. Most "no root cause"
conclusions are incomplete investigations.

## Supporting techniques

- `references/root-cause-tracing.md` — trace a bug backward through the call stack to its original trigger
- `references/defense-in-depth.md` — after finding the root cause, validate at every layer
- `references/condition-based-waiting.md` — replace arbitrary delays with condition polling

## Related

- `test-driven-development` — write the failing reproduction first
- `verification-before-completion` — prove the fix before claiming success
- `code-change-impact` — after the fix, trace the blast radius of the change
- Distinct from `agent-diagnostics`, which validates agent configuration rather than code behavior.

## Provenance

Adapted from `obra/superpowers` (MIT), © 2025 Jesse Vincent. See
`THIRD_PARTY_NOTICES.md`.
