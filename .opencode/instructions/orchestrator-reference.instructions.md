---
description: Orchestrator reference — planning templates, agent selection guide, coordination patterns, and progress tracking
---

# Orchestrator Reference

Loaded on demand when the orchestrator needs to create plans, delegate tasks, or track progress.

## Planning Template

Use this format when creating a multi-phase plan:

```markdown
## Orchestration Plan

### Phases
1. **[Phase Name]** (@agent-name)
   - Tasks: [What needs to be done]
   - Dependencies: [What must be complete first]
   - Deliverables: [Expected outputs]

2. **[Phase Name]** (@agent-name)
   - Tasks: [What needs to be done]
   - Dependencies: [Phase 1 completion]
   - Deliverables: [Expected outputs]

### Validation Steps
- [ ] [Validation step 1]
- [ ] [Validation step 2]

### Success Criteria
- [Criterion 1]
- [Criterion 2]
```

## Agent Selection Guide

**Delegation model:** Only `subagent`/`all` agents can be invoked by the orchestrator with the Task tool; `primary` agents (`em-advisor`, `blogger`) require a manual switch (Tab) or a user `@mention`. The orchestrator's `permission.task` allowlist enforces this. Below, `@`-prefixed entries are delegation targets; un-prefixed entries are `primary` agents the user invokes directly.

**@codebase** — Feature implementation, bug fixes, refactoring, test creation. Use for cross-domain or unfamiliar-stack work (multi-language validation, auto-detection). For single-file/single-domain changes, orchestrator may implement directly — see Implementation Routing in the orchestrator agent.

**@docs** — README updates, API documentation, architecture docs, user guides.

**@review** — Security audits, performance reviews, code quality checks, best practices validation.

**@planner** — Read-only codebase analysis, detailed implementation planning, risk assessment before implementation.

**em-advisor** *(primary — manual handoff)* — Engineering leadership guidance, stakeholder communication, team execution and prioritization.

**blogger** *(primary — manual handoff)* — Blog post creation, YouTube scripts, podcast outlines.

**@brutal-critic** — Content quality reviews, framework-based scoring, pre-publish validation.

**@legal-advisor** — Legal research, regulatory compliance, license auditing, data privacy, export control, contract evaluation.

## Coordination Patterns

### Pattern 1: Implementation Cycle
```
orchestrator → @codebase (implement)
          → @review (validate)
          → @codebase (fix issues)
          → @docs (document)
```

### Pattern 2: Documentation Refresh
```
orchestrator → @codebase (analyze changes)
          → @docs (update docs)
          → @review (verify accuracy)
```

### Pattern 3: Full Feature Delivery
```
orchestrator → @codebase (implement + tests)
          → @review (security + performance)
          → @codebase (address issues)
          → @docs (API docs + README)
          → @review (final validation)
```

### Pattern 4: Legal Review Cycle
```
orchestrator → @legal-advisor (legal research / compliance analysis)
            → @review (validate findings)
            → @codebase (remediate issues / apply recommendations)
```

### Pattern 5: Evaluator-Optimizer Loop
```
orchestrator → @codebase (generate solution)
            → @review (evaluate against criteria)
            → @codebase (iterate based on feedback) ⊛ loop
            → @review (final gate)
```
Use when quality criteria are well-defined and iterative refinement demonstrably improves output. The evaluator (`@review` or `@brutal-critic`) provides feedback; the generator (`@codebase`, or `blogger` via manual handoff) iterates. Run up to 3 refinement cycles before gating. Use for generation quality (docs/content/writing) — do NOT run Pattern 5 and Pattern 8 on the same artifact; if the change will hit the Pre-Commit Review Gate (Pattern 8), skip Pattern 5, since the panel already evaluates and refines.

### Pattern 6: Parallelized Sub-Tasks
```
orchestrator → @codebase (frontend) ∥ @codebase (backend)
            → @review (integration / contract gate)
            → @docs (unified documentation)
```
Use when tasks can be cleanly sectioned into independent subtasks (e.g., frontend + backend, API + client SDK). Aggregate results at the integration gate. Ensure consistent contracts across parallel workers.

### Pattern 7: Analyze-Then-Act
```
orchestrator → @planner (deep analysis, no code changes)
            → [present findings to human]
            → @codebase (implement approved plan)
            → @review (validate)
```
Use for high-risk or unfamiliar codebases where understanding must precede action. The read-only planner phase prevents premature implementation.

### Pattern 8: Pre-Commit Review Gate (Multi-Lens)
```
orchestrator → chunk the work → implement (per Implementation Routing)
            → freeze the diff snapshot
            → Tier 1: automated harness (npm run doctor / stack equivalent) — fast-fail first
            → Tier 2: concurrent @review lenses on the frozen snapshot (only if Tier 1 clean)
                 requirements · code · security · ux-responsive (see Lens Selection)
            → triage findings (see Review Triage & Decision Panel)
            → apply accepted fixes → scoped re-review of delta only ⊛ max 2 cycles
            → ✅ PASS → commit | ⚠️ caveats → commit with notes | ❌ FAIL → escalate
```
Use as the final gate before a commit leaves your machine (push / PR / merge) — run once per push, or once per commit when committing to a tracked/shared branch. Never push an ungated commit. (Using a WIP commit as a freeze fallback is discouraged — prefer `gate:freeze`.)

**Tier 1 (Automated Harness):** Run `npm run doctor` (or equivalent) FIRST; start Tier 2 lenses only if Tier 1 has no hard failures (fast-fail — don't spend 4 reviewer dispatches on a diff that does not build). Only block on new failures — compare against branch-point state. If tooling unavailable, warn and proceed (for security-surface changes, escalate instead). For validation infra changes, establish baseline first.

**Tier 2 (Multi-Lens Adversarial Review):** REQUIRED for agent/skill/instruction/CI/security/feature changes, or any refactor, spanning 3+ files; OPTIONAL otherwise (docs/comments/mechanical bumps always skip). Freeze the diff, then dispatch one fresh `@review` subagent per lens, concurrently (Pattern 6 semantics), each receiving ONLY the frozen diff + plan + its lens brief — never the implementation reasoning. Restart the gate if the diff changes mid-cycle.

**Freeze mechanism:** run `npm run gate:freeze` to write `.gate/diff.patch` plus
`.gate/manifest.json` (base/head SHA, staged-tree hash). Pass lenses the `.gate/diff.patch`
path (they `read` it; they cannot run git). After ✅ PASS, run `npm run gate:pass` to record
`.gate/pass.json`; commit only once that marker exists.

**Lens Selection:**

| Lens | Run when | Focus |
|---|---|---|
| requirements | features/behavior changes | acceptance criteria met; nothing out of scope |
| code | whenever Tier 2 triggers | logic errors, correctness, maintainability, tests, performance |
| security | security surface touched (auth, input, secrets, deps, data) | vulnerabilities, secrets, PII, license (load `security-audit` skill) |
| ux-responsive | UI/markup changes | accessibility, responsive logic, input modes (load `ux-responsive` skill) |

Precondition for the requirements lens: the plan must state concrete acceptance criteria; if it does not, flag this and skip that lens rather than review against a soft spec.

**Review Triage & Decision Panel:**
1. Classify each finding: critical (blocking) / high / medium / low; dedupe across lenses by `file:line` + finding. Lens-reported severity is authoritative — the orchestrator may escalate severity, never downgrade it.
2. Apply objective, low-risk findings directly (style, minor perf, clarity).
3. Blocking findings (critical, or any security/data-loss/requirement-miss at any severity) the orchestrator declines MUST go to the user decision panel — no orchestrator veto, and dedupe must never drop a security/data-loss tag.
4. Non-critical declined findings go to the rationale table (informational).

```
## Decision Panel — Declined Blocking Findings (commit blocked)
| ID | Lens | Finding (reviewer) | Location | Why declined | Decision |
|----|------|--------------------|----------|--------------|----------|
| C1 | security | [verbatim] | file:line | [orchestrator rationale] | [ ] Apply [ ] Accept risk [ ] Defer |
```

```
## Review Triage — Declined Non-Critical Findings
| ID | Lens | Reviewer comment | Severity | Why declined | Disposition |
|----|------|------------------|----------|--------------|-------------|
| M1 | code | [verbatim] | medium | [rationale] | informational |
```

**Re-review & budget:** After applying fixes, re-review ONLY the delta. A cycle = one review pass (the initial multi-lens panel, or a scoped delta re-review); the initial panel is cycle 1, so max 2 cycles = the initial panel plus at most one delta re-review. The gate runs once per push (or per tracked-branch commit), not per chunk. Binding task budget: ≤ 8 reviewer dispatches per task (a full panel = 4; delta re-reviews dispatch only affected lenses); it supersedes per-loop caps. Gate cycles are a sub-loop inside the outer execution loop and do not multiply the 5-cycle or Pattern 5 budgets. On exhaustion, escalate to human.

**Gate outcomes:**

| Outcome | Action |
|---|---|
| ✅ PASS | Proceed to commit |
| ⚠️ PASS-WITH-CAVEATS | Commit with documented notes on remaining medium/low items — never a declined security/data-loss finding |
| ❌ FAIL | Escalate to human with structured options |

**Skip criteria (any one):** Trivial (single-line/docs/comment — unless modifying permissions/bash/tool grants), mechanical bumps, pre-existing gate pass, Planning Mode, user opt-out.

**Edge cases:** Baseline pollution (only new failures, check branch-point); chicken-and-egg (baseline-first for validation infra changes); offline/degraded (warn, proceed); reviewer unavailability (escalate); self-referential changes (escalate to human, exempt from REQUIRED); idempotency (cache per diff, skip on rebase); mid-cycle diff changes (restart gate); cascading Tier 2→Tier 1 failures (same cycle, not new); concurrent-lens drift (all lenses share one frozen snapshot — restart if it changes); committed-before-gating (treat branch-tip vs base as the frozen snapshot and remediate via amend/fixup before push).

## Checkpoint Format

At multi-phase boundaries, emit a structured checkpoint for human decision:

```
## Checkpoint: [Phase Name] Complete — Human Decision Required
**Phase:** [Phase description]
**Status:** Complete
**Goal:** [Measurable condition — the loop continues until this holds. Leave blank if not a loop.]
**Completed:** [What was done — files, key changes]
**Validated:** [Verification results — tests, lint, doctor]
**Next phase:** [Phase name and brief description]
**Decision:** Proceed to next phase?
**Options:**
  [A] Proceed
  [B] Review changes first, then proceed
  [C] Skip this phase, jump to [alternative]
  [D] Stop and hand off
```

Checkpoints should be emitted at:
- Phase boundaries in multi-phase plans
- After high-risk changes (security, schema, contract, build)
- When the orchestrator needs a decision before continuing
- Before Phase 7 of any plan (final validation gate)

## Fallback Routing

When a primary path fails, route to alternatives instead of blocking:

```
orchestrator → @review (primary gate)
            → if FAIL → @planner (diagnose root cause)
                       → @codebase (remediate)
                       → @review (re-validate)
            → if FAIL again → escalate to human with options
```

Fallback patterns per failure type:
- **Pre-commit review failure** → @planner diagnose root cause → @codebase fix → re-run the frozen-snapshot gate (delta re-review; max 2 cycles, ≤8 dispatches/task). Failing after 2 cycles → escalate to human with structured options.
- **Build break** → @codebase fix (auto if safe) → build → re-validate
- **Test failure** → @planner analyze → @codebase fix → test → re-validate
- **Multiple cycles fail** → escalate with structured options (do not loop)

## Idempotency & Resumption

When resuming or retrying, avoid re-executing completed work:
- Before each sub-task, check if it was already completed (`git diff --stat`, artifact existence, test-pass status).
- Skip completed sub-tasks; report them as "already done" in checkpoint; reference `state/session-state.json` for prior phase status.

## Progress Tracking for Long-Running Work

For complex or multi-phase tasks, include and maintain a status table in updates.

Use this format:

```markdown
## Workstream Status

| ID | Initiative | Impact / Effort | Status | Notes |
|---|---|---|---|---|
| S1 | [Initiative] | [High/Medium/Low] / [High/Medium/Low] | [✅ Done / 🔄 In Progress / ⏳ Planned / ⛔ Blocked] | [Short note] |
```

Update cadence:
- Include the table at plan start; update it after each phase or loop cycle.
- Keep exactly one `🔄 In Progress`; reflect blockers immediately as `⛔ Blocked` with mitigations.
