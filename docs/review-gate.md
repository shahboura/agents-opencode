---
layout: default
title: Review Gate
nav_order: 14
description: How changes are reviewed before changes leave your machine (push/PR) - automated Tier 1 checks plus a multi-lens adversarial Tier 2 panel with triage and human decision points.
---

# Review Gate

The Review Gate is the final checkpoint before a commit leaves your machine
(push / PR / merge) - not merely before the first local commit. It has two tiers: a
deterministic automated harness (Tier 1) and a risk-gated, multi-lens adversarial
review (Tier 2).

This page is the **canonical full spec**. The orchestrator loads a compact flow
summary from Pattern 8 in
`.opencode/instructions/orchestrator-reference.instructions.md`, which points here.

## Tier 1 - Automated Harness

- Run `npm run doctor` (or the stack equivalent) first.
- Fast-fail: Tier 2 lenses only start when Tier 1 has no hard failures.
- Only **new** failures block - compare against the branch-point state.
- If tooling is unavailable, warn and proceed; for security-surface changes, escalate.

## Tier 2 - Multi-Lens Adversarial Review

Risk-gated: **required** for agent, skill, instruction, CI, security, or feature
changes, or any refactor spanning 3+ files. Optional otherwise (docs, comments,
and mechanical bumps always skip).

The diff is frozen, then one fresh `@review` subagent runs per lens, concurrently.
Each lens receives only the frozen diff, the plan, and its lens brief - never the
implementation reasoning.

### Lenses

| Lens | Runs when | Focus |
|---|---|---|
| requirements | features / behavior changes | acceptance criteria met; nothing out of scope |
| code | whenever Tier 2 triggers | logic errors, correctness, maintainability, tests, performance |
| security | security surface touched | vulnerabilities, secrets, PII, authn/authz, dependency and license risk (load `security-audit`) |
| ux-responsive | UI / markup changes | accessibility, responsive logic, input modes, loading/empty/error states (load `ux-responsive`) |

Precondition for the requirements lens: the plan must state concrete acceptance
criteria. If it does not, flag this and skip that lens rather than review against a
soft spec.

### Triage and decision panel

1. Classify each finding: critical / high / medium / low. Dedupe across lenses by
   `file:line` + finding. Lens-reported severity is authoritative - the orchestrator
   may escalate but never downgrade it.
2. Apply objective, low-risk findings directly (style, minor perf, clarity).
3. Declined **blocking** findings (critical, or any security / data-loss /
   requirement-miss at any severity) go to a **user decision panel** - the
   orchestrator has no veto over them, and dedupe must never drop a security/data-loss tag.
4. Declined non-critical findings go to a rationale table for the user.

Decision panel - declined blocking findings (commit blocked):

| ID | Lens | Finding (reviewer) | Location | Why declined | Decision |
|----|------|--------------------|----------|--------------|----------|
| C1 | security | [verbatim] | file:line | [orchestrator rationale] | [ ] Apply [ ] Accept risk [ ] Defer |

Rationale table - declined non-critical findings:

| ID | Lens | Reviewer comment | Severity | Why declined | Disposition |
|----|------|------------------|----------|--------------|-------------|
| M1 | code | [verbatim] | medium | [rationale] | informational |

## Cycles and Budget

- A **cycle** is one review pass: the initial panel is cycle 1, and a scoped delta
  re-review of the fixes is cycle 2.
- Maximum **2 cycles** per gate (initial panel plus at most one delta re-review).
- Binding task budget: **8 reviewer dispatches** per task (a full panel = 4; delta
  re-reviews dispatch only the affected lenses). It **supersedes per-loop caps**.
- Gate cycles are a sub-loop inside the outer execution loop and do not multiply the
  5-cycle or Pattern 5 budgets.
- The gate runs **once per push** (or per tracked-branch commit), not once per implementation chunk.
- A WIP commit may be used **only** to freeze the snapshot; after findings, amend/fixup or
  add a follow-up fix commit before pushing - never push an ungated commit.
- On exhaustion, escalate to the human with structured options.

## Outcomes

| Outcome | Action |
|---|---|
| PASS | Proceed to commit |
| PASS-WITH-CAVEATS | Commit with documented notes - never a declined security/data-loss finding |
| FAIL | Escalate to the human with structured options |

## Skip criteria and edge cases

**Skip criteria (any one):** trivial (single-line / docs / comment - unless modifying
permissions, bash, or tool grants), mechanical bumps, a pre-existing gate pass,
Planning Mode, or an explicit user opt-out.

**Edge cases:**

- **Baseline pollution** - only new failures block; compare against the branch point.
- **Chicken-and-egg** - for validation-infra changes, establish the baseline first.
- **Offline / degraded** - warn and proceed; for security-surface changes, escalate.
- **Reviewer unavailability** - escalate to the human.
- **Self-referential changes** - escalate to the human and exempt from REQUIRED.
- **Idempotency** - cache per diff; skip re-running on rebase.
- **Mid-cycle diff changes** - restart the gate.
- **Cascading Tier 2 to Tier 1 failures** - same cycle, not a new one.
- **Concurrent-lens drift** - all lenses share one frozen snapshot; restart if it changes.
- **Committed before gating** - treat branch-tip vs base as the frozen snapshot and
  remediate via amend/fixup before pushing.

## Enforcement

A versioned Git hook stops commits that have not passed the gate. Enable it once
per clone:

```bash
npm run gate:install   # core.hooksPath=.githooks + executable bit on the hook
```

Flow for each push:

```bash
npm run gate:freeze                          # .gate/diff.patch + .gate/manifest.json
# Tier 1 (npm run doctor) + Tier 2 lenses review the frozen diff
npm run gate:pass -- --verdict PASS          # record .gate/pass.json
git commit                                   # hook verifies + consumes the marker
```

The hook allows a commit only when `.gate/pass.json` carries a `PASS` or
`PASS-WITH-CAVEATS` verdict whose `stagedHash` matches the staged tree, then
consumes the marker so one approval cannot be reused. `gate:pass` also requires
`.gate/manifest.json` and refuses if the index moved after `gate:freeze`, so a
pass binds only to the snapshot the lenses reviewed.

`SKIP_GATE=1` is a **per-command** bootstrap/emergency escape hatch - prefix the
single command (`SKIP_GATE=1 git commit ...`). Do **not** export it in a shell
profile or CI job; that would disable the gate for every command.

## Limitations

The pre-commit hook is a **local workflow guardrail, not a security boundary**:

- `.gate/pass.json` is an unsigned, plain-text marker - it can be forged.
- `git commit --no-verify` bypasses the hook entirely.
- Non-fast-forward `git merge` (the `pre-merge-commit` hook) is outside the
  pre-commit hook's scope.

It exists for honest-operator discipline, not to stop a motivated bypass. Commits
made with `--no-verify`, or merges that produce a merge commit, must be gated
manually before they reach a shared branch.

## Related

- [Approval Gates](approval-gates) - human-in-the-loop checkpoints.
- [Compatibility](compatibility) - the CI validation checks matrix.
