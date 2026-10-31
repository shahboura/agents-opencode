---
title: Deprecation & Migration Policy
description: Contract change policy for agents and commands with deprecation windows and migration steps.
sidebar:
  order: 12
---

This policy defines how contract-affecting changes are introduced for:

:::tip[What you get]
- What changed between releases and what to do about it.
- The migration steps that keep existing installs working.
:::

- Agent prompts/behavior guidance (`.opencode/agents/*.md`)
- Agent permissions (`permission`, `permission.skill`, `permission.task`)
- Command frontmatter/routing (`.opencode/commands/*.md`)
- Validation contracts and CI gates (`scripts/validate-*.js`, `evals/harness/**`)

## Change Levels

### Level A — Patch-Safe

Backwards-compatible and low risk.

Examples:

- docs clarifications
- stricter warnings that do not fail CI
- additive guidance without changing defaults

Required actions:

- note in PR summary
- no migration step needed

### Level B — Soft Deprecation

Behavior remains functional, but replacement path is introduced.

Examples:

- legacy field still accepted but discouraged
- old command token still parsed with warning
- migration compatibility fallback retained
- OpenCode v2 accepts the v1 `subtask` command field as a deprecated alias for `subagent`

Required actions:

1. Document deprecation in `CHANGELOG.md` (Unreleased section).
2. Add explicit migration note in affected docs.
3. Keep compatibility window for **at least one release cycle**.

### Level C — Breaking Contract

Defaults or behavior contract changes in a non-compatible way.

Examples:

- removing previously accepted command metadata shape
- changing permission defaults that block previously allowed flows
- removing a compatibility fallback path

Required actions:

1. Announce in `CHANGELOG.md` with `[capability:*]` label.
2. Include a **Migration Guide** section in docs before merge.
3. Provide rollback note in PR template (`Risk & Rollback`).
4. Land with eval/validator coverage updates and passing CI.

## Migration Playbook

When introducing Level B/C changes:

1. **Detect scope**
   - List impacted files and workflows.
2. **Dual-run period (if possible)**
   - Accept both old and new forms while warning.
3. **Document replacement path**
   - Provide before/after examples.
4. **Enforce with validation**
   - Promote warnings to errors only after deprecation window.
5. **Cleanup**
   - Remove deprecated path in a clearly labeled follow-up change.

## Required PR Checklist for Level B/C

- [ ] Changelog entry includes capability label
- [ ] Migration note added to docs
- [ ] Risk level and rollback documented in PR
- [ ] Validator/eval coverage updated
- [ ] `npm run doctor` passes

## Current Compatibility Commitments

- Canonical agent path: `.opencode/agents/`
- Legacy `.opencode/agent/` (singular) is retired; only the canonical `.opencode/agents/` (plural) path is recognized
- Command docs parity is enforced against canonical command frontmatter
- The installer's target adapter emits v1 and v2 config key sets until a future breaking major
  (`--target v1|v2|auto`); the two sets are never co-written. Both are supported; v2 is
  verified to load on v2.0.30 (plugin, all 10 agents, and 27 skills discovered; runtime
  hooks not yet exercised). See
  **[OpenCode v1/v2 Support](/opencode-v1-v2-support/)**.

## Verify It Worked

```bash
npm run doctor
```

Exits 0, and the changelog validator confirms the `[capability:*]` label on the
Unreleased entry is valid alongside the other pack checks.
