---
layout: default
title: Deprecation & Migration Policy
nav_order: 12
description: Contract change policy for agents and commands with deprecation windows and migration steps.
---

# Deprecation & Migration Policy

This policy defines how contract-affecting changes are introduced for:

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
- Legacy `.opencode/agent/` tolerated only for migration compatibility checks
- Command docs parity is enforced against canonical command frontmatter
