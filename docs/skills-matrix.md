---
layout: default
title: Skills Matrix
nav_order: 8
description: Agent-to-skill allowlist matrix for OpenCode least-privilege configuration.
---

# Agent Skills Matrix

This table reflects `permission.skill` allowlists in `.opencode/agent/*.md`.

Quick read:
- Most agents follow `"*": "deny"` + explicit allowlist.
- Language-heavy agents get language/domain skills.
- Docs/content/EM agents stay intentionally narrow.

| Agent | Allowed skills |
|---|---|
| `codebase` | `dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ruby-rails`, `rust`, `sql-migrations` |
| `orchestrator` | `dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ruby-rails`, `rust`, `sql-migrations`, `project-bootstrap`, `docs-validation`, `agent-diagnostics`, `blogger`, `brutal-critic` |
| `planner` | `dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ruby-rails`, `rust`, `sql-migrations`, `project-bootstrap`, `docs-validation`, `agent-diagnostics` |
| `review` | `dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ruby-rails`, `rust`, `sql-migrations`, `docs-validation`, `agent-diagnostics` |
| `docs` | `docs-validation`, `project-bootstrap`, `agent-diagnostics` |
| `em-advisor` | `project-bootstrap`, `agent-diagnostics`, `docs-validation` |
| `blogger` | `blogger`, `brutal-critic` |
| `brutal-critic` | `brutal-critic`, `blogger` |

## Notes

- Baseline rule for all agents with skill access: `"*": "deny"`.
- Skills load on demand via the `skill` tool.
- Keep allowlists narrow by role to reduce context/tool noise.

## Skill Scope Policy (Current)

- Keep the current core-only skill set.
- Expand only when demand, gap, ownership, and licensing checks are all satisfied.
