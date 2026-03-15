---
layout: default
title: Agents
nav_order: 3
has_children: false
description: Overview of the 8 built-in OpenCode agents and their recommended workflow.
---
# Agents

Lean reference for the built-in agents.

## Why these agents

- **Clear separation of roles** so you can pick the right depth quickly.
- **Safer behavior by default** through scoped skill allowlists.
- **Faster handoffs** across planning, implementation, review, and docs.

## Agent Overview

| Agent | Best For | Allocated Skills (summary) |
|-------|----------|----------------------------|
| `@orchestrator` | Multi-phase coordination | Language skills + utility skills + `ux-responsive` + `blogger`/`brutal-critic` |
| `@planner` | Read-only architecture/planning | Language skills + utility skills + `ux-responsive` |
| `@codebase` | Feature implementation | Language skills + `sql-migrations` + `ux-responsive` |
| `@review` | Security/performance/code quality | Language skills + `docs-validation` + `agent-diagnostics` + `ux-responsive` |
| `@docs` | Documentation updates | `docs-validation` + `project-bootstrap` + `agent-diagnostics` |
| `@em-advisor` | Engineering leadership guidance | `project-bootstrap` + `docs-validation` + `agent-diagnostics` |
| `@blogger` | Blog/video/podcast drafts | `blogger` + `brutal-critic` |
| `@brutal-critic` | Final content quality gate | `brutal-critic` + `blogger` |

See exact allowlists in the [Skills Matrix](../skills-matrix).

## Suggested Flow

```
@orchestrator (plan)
→ @codebase (implement)
→ @review (audit)
→ @docs (document)
```

## Skill Usage Guardrails

- All built-in agents support the `skill` tool.
- Skills are loaded on demand (not eagerly).
- Use one relevant skill per phase by default; add another only for clear cross-domain dependencies.
- If stack/domain is unclear, clarify before loading.

## Skill Permission Model

- Agents use `permission.skill` rules to restrict which skills can load.
- Recommended baseline is `"*": "deny"` with explicit per-skill allows.
- This enforces least privilege and keeps agent behavior domain-scoped.

## Task Permission Model

- Agents with Task access should use `permission.task` with deny-by-default and explicit allows.
- Keep subagent invocation scoped to role-appropriate handoffs.
- Rules are matched in order; last matching rule wins.

## Skill Scope Policy

- Keep current **core-only** skill scope.
- Add skills only with repeat demand, clear gap, owner, and clean licensing/provenance.

## Next Steps

- **[Commands & Skills](../commands)**
- **[Coding Standards](../instructions)**
- **[Customization](../customization)**
