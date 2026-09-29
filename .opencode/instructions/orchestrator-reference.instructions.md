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

**@researcher** — Read-only grounding of high-stakes (T1–T4) decisions in current primary sources; see Pattern 9.

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
orchestrator → chunk → implement (per Implementation Routing)
            → freeze the diff snapshot
            → Tier 1: automated harness (npm run doctor / stack equivalent) — fast-fail first
            → Tier 2: concurrent @review lenses on the frozen snapshot (only if Tier 1 clean)
            → triage findings (lens severity authoritative; declined blocking → user panel)
            → apply accepted fixes → scoped re-review of delta only ⊛ max 2 cycles
            → ✅ PASS → commit | ⚠️ caveats → commit with notes | ❌ FAIL → escalate
```
Use as the final gate before a commit leaves your machine (push / PR / merge) — run once
per push, or once per tracked-branch commit. Budget: ≤8 reviewer dispatches per task
(a full panel = 4; delta re-reviews dispatch only affected lenses), max 2 cycles per push;
it **supersedes per-loop caps** and does not multiply the 5-cycle or Pattern 5 budgets.
**Canonical spec — tier rules, lens selection, triage and decision-panel templates, freeze
mechanism, skip criteria, and edge cases: `docs/review-gate.md`.**

### Pattern 9: Decision Grounding Gate
```
orchestrator → detect a high-stakes decision by structure (T1–T4), not self-reported confidence
            → @researcher (input contract: question + context + planned approach)
            → read the output contract (verdict, deprecation_status, claims[])
            → fail-closed parent acceptance:
                 USE_REPLACEMENT → adopt, or document why not
                 INSUFFICIENT_EVIDENCE on T1/T2 → surface/escalate; never silently keep the workaround
            → record the decision + sources (plan / ADR / PR)
```
**When:** before implementing or "flipping" a high-stakes (T1–T4) decision — one-way doors,
cross-module/security blast radius, workaround-smell, or volatile APIs. Not on routine
two-way-door work with in-repo precedent. **Skill:** load `decision-grounding`.
**Budget:** ≤3 grounded decisions per task, ≤6 fetches each, depth 1.

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
