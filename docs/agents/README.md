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

## Next Steps

- **[Commands & Skills](../commands)**
- **[Coding Standards](../instructions)**
- **[Customization](../customization)**
