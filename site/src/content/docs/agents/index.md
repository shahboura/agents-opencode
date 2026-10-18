---
title: Agents
description: Overview of the 10 built-in OpenCode agents and their recommended workflow.
sidebar:
  order: 3
---

Lean reference for the built-in agents.

## Why these agents

- **Clear separation of roles** so you can pick the right depth quickly.
- **Safer behavior by default** through deny-by-default tool permissions and host-compatible skill access.
- **Faster handoffs** across planning, implementation, review, and docs.

## Agent Overview

| Agent | Best For |
|-------|----------|
| `@orchestrator` | Multi-phase coordination |
| `@planner` | Read-only architecture/planning |
| `@codebase` | Feature implementation |
| `@review` | Security/performance/code quality |
| `@researcher` | Grounding high-stakes decisions in current best practice |
| `@docs` | Documentation updates |
| `@em-advisor` | Engineering leadership guidance |
| `@blogger` | Blog/video/podcast drafts |
| `@brutal-critic` | Final content quality gate |
| `@legal-advisor` | Legal research, jurisdiction-aware compliance, contract review, license auditing, data privacy, IP, export controls |

Canonical source for skill triggers and the host-skill policy: [Skills Matrix](/skills-matrix/).

## Suggested Flow

```txt
@orchestrator (plan)
→ @codebase (implement)
→ @review (audit)
→ @docs (document)
```

## Skill Usage Guardrails

- All built-in agents support the `skill` tool, except the skill-free `@researcher`.
- Skills are loaded on demand (not eagerly).
- Use one relevant skill per phase by default; add another only for clear cross-domain dependencies.
- If stack/domain is unclear, clarify before loading.

## Skill Permission Model

- Pack agents allow all skills (`"*": "allow"`) so host and plugin skills keep working.
- To restrict skills, edit the installed agent file or add a v2 `integration.use` policy;
  global permission rules lose to agent rules (agent rules are appended last).
- Treat project skills in untrusted clones as untrusted content.

## Task Permission Model

- Agents with Task access should use `permission.task` with deny-by-default and explicit allows.
- Keep subagent invocation scoped to role-appropriate handoffs.
- Rules are matched in order; last matching rule wins.

## Skill Scope Policy

- Keep current **core-only** skill scope.
- Add skills only with repeat demand, clear gap, owner, and clean licensing/provenance.

## Next Steps

- **[Commands & Skills](/commands/)**
- **[Customization](/customization/)**
