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

**@codebase** - Use for:
- Feature implementation
- Bug fixes
- Code refactoring
- Test creation

**@docs** - Use for:
- README updates
- API documentation
- Architecture docs
- User guides

**@review** - Use for:
- Security audits
- Performance reviews
- Code quality checks
- Best practices validation

**@planner** - Use for:
- Read-only codebase analysis
- Detailed implementation planning
- Risk assessment before implementation

**@em-advisor** - Use for:
- Engineering leadership guidance
- Stakeholder communication strategy
- Team execution and prioritization support

**@blogger** - Use for:
- Blog post creation
- YouTube script writing
- Podcast outline brainstorming

**@brutal-critic** - Use for:
- Content quality reviews
- Framework-based scoring
- Pre-publish validation

**@legal-advisor** - Use for:
- Legal research across jurisdictions
- Regulatory compliance analysis
- License auditing and open-source compliance
- Data privacy and export control review
- Contract and agreement evaluation

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
Use when quality criteria are well-defined and iterative refinement demonstrably improves output. The evaluator (`@review` or `@brutal-critic`) provides feedback; the generator (`@codebase` or `@blogger`) iterates. Run up to 3 refinement cycles before gating.

### Pattern 6: Parallelized Sub-Tasks
```
orchestrator → @codebase (frontend) ∥ @codebase (backend)
            → @review (integration / contract gate)
            → @docs (unified documentation)
```
Use when tasks can be cleanly sectioned into independent subtasks (e.g., frontend + backend, API + client SDK, multiple microservices). Aggregate results at the integration gate. Ensure consistent contracts across parallel workers.

### Pattern 7: Analyze-Then-Act
```
orchestrator → @planner (deep analysis, no code changes)
            → [present findings to human]
            → @codebase (implement approved plan)
            → @review (validate)
```
Use for high-risk or unfamiliar codebases where understanding must precede action. The read-only planner phase prevents premature implementation.

## Checkpoint Format

At multi-phase boundaries, emit a structured checkpoint for human decision:

```
## Checkpoint: [Phase Name] Complete — Human Decision Required
**Phase:** [Phase description]
**Status:** Complete
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
- **Review failure** → @planner diagnose → @codebase fix → @review re-validate
- **Build break** → @codebase fix (auto if safe) → build → re-validate
- **Test failure** → @planner analyze → @codebase fix → test → re-validate
- **Multiple cycles fail** → escalate with structured options (do not loop)

## Idempotency & Resumption

When resuming or retrying, avoid re-executing completed work:
- Before each sub-task, check if it was already completed:
  - `git diff --stat` for already-applied changes
  - File existence for generated artifacts
  - Test pass status for already-verified work
- Skip completed sub-tasks; report them as "already done" in checkpoint.
- Reference `state/session-state.json` for prior phase completion status.

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
- Include the table at plan start for long-running/complex tasks.
- Update status after each completed phase or loop cycle.
- Keep exactly one active item as `🔄 In Progress` where possible.
- Reflect blockers immediately with `⛔ Blocked` and mitigation options.
