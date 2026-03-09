---
layout: default
title: Agents
nav_order: 3
has_children: false
description: Overview of the 8 built-in OpenCode agents and their recommended workflow.
---
# Agents

Lean reference for the built-in agents.

## Agent Overview

| Agent | Purpose | Use For |
|-------|---------|---------|
| `@orchestrator` | Planning & coordination | Multi-phase work, risk assessment |
| `@planner` | Read-only planning | Analysis and plans only |
| `@codebase` | Code implementation | Features, fixes, refactors |
| `@review` | Quality audits | Security, performance, best practices |
| `@docs` | Documentation | README, API docs, guides |
| `@em-advisor` | Leadership guidance | Team management, 1-on-1 prep |
| `@blogger` | Content creation | Tech/blog/podcast scripts |
| `@brutal-critic` | Content review | Critique, framework validation |

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

## Next Steps

- **[Commands & Skills](../commands)**
- **[Coding Standards](../instructions)**
- **[Customization](../customization)**
