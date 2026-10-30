---
name: verification-before-completion
description: >-
  Evidence-before-claims discipline: run the verification command and read its
  output before reporting work complete, fixed, or passing. Use before any
  success claim, before committing, or before creating a PR.
license: MIT
compatibility: opencode
metadata:
  author: shahboura (methodology adapted from obra/superpowers, MIT)
  version: "1.0.0"
  audience: developers
  workflow: verification
---

# Verification Before Completion

## What I do

- Replace "should work" with fresh, observed evidence
- Gate every completion claim on a command whose output has been read
- Keep delegated work honest by verifying the artifact, not the report

## When to use me

Always, before:

- Any variation of a success or completion claim
- Any expression of satisfaction ("done", "perfect", "should pass")
- Committing, opening a PR, or marking a task complete
- Moving to the next task
- Reporting on delegated agent work

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

A claim is verified here (you ran the command in this message) or by a fresh verifier
whose raw output you paste with its exit code, attributed. A verifier's summary is not
evidence. If neither exists, it cannot be claimed as passing.

## The gate function

1. **Identify** — what command proves this claim?
2. **Run** — execute the full command, fresh.
3. **Read** — read the full output; check the exit code; count failures.
4. **Verify** — does the output confirm the claim?
   - No → state the actual status with evidence.
   - Yes → state the claim with evidence.
5. **Only then** — make the claim.

Skipping a step is not verifying.

## Delegating the final pass

- Dispatch browser, E2E, and user-flow verification to a fresh agent; paste its attributed output, not a summary.

## Claims and the evidence they require

| Claim | Requires | Not sufficient |
|-------|----------|----------------|
| Tests pass | Test output: 0 failures | A previous run, "should pass" |
| Linter clean | Linter output: 0 errors | A partial check, extrapolation |
| Build succeeds | Build exit code 0 | Linter passing, logs look fine |
| Bug fixed | The original symptom's test passing | Code changed, assumed fixed |
| Regression test works | Red → revert fix (must fail) → restore (pass) | The test passing once |
| Requirements met | A line-by-line checklist | Tests passing |
| Delegated work done | The VCS diff shows the change | An agent reporting "success" |
| Delegated check passed | The verifier's pasted output and exit code | The verifier's summary |

## Red flags — stop

- "should", "probably", "seems to"
- Satisfaction before verification
- About to commit, push, or open a PR without running the checks
- Trusting an agent's success report
- "Just this once" / "I'm confident" / "a partial check is enough"

## Rationalization prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | Run the verification. |
| "I'm confident" | Confidence is not evidence. |
| "The linter passed" | Linter is not compiler is not tests. |
| "The agent said it succeeded" | Verify independently. |
| "I'm tired" | Exhaustion is not an excuse. |

## Key patterns

```
✅ [run the test command] [see: 34/34 pass] → "All tests pass"
❌ "Should pass now" / "Looks correct"

✅ [run the build] [see: exit 0] → "Build passes"
❌ "The linter passed" (the linter does not compile)
```

## Related

- `code-change-impact` — the blast-radius analysis to run before a "nothing broke" claim
- `test-driven-development` — the red-green cycle that proves a test can fail
- The repository's review gate — the automated checks to run before committing

## Provenance

Adapted from `obra/superpowers` (MIT), © 2025 Jesse Vincent. See
`THIRD_PARTY_NOTICES.md`.
