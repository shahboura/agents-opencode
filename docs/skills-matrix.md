---
layout: default
title: Skills Matrix
nav_order: 8
description: Agent-to-skill allowlist matrix for OpenCode least-privilege configuration.
---

# Agent Skills Matrix

This table reflects `permission.skill` allowlists in `.opencode/agents/*.md`.

Quick read:
- Most agents follow `"*": "deny"` + explicit allowlist.
- Language-heavy agents get language/domain skills.
- Docs/content/EM agents stay intentionally narrow.

| Agent | Allowed skills |
|---|---|
| `codebase` | `dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ux-responsive`, `ruby-rails`, `rust`, `sql-migrations`, `legal-advisor`, `code-change-impact`, `refactoring`, `decision-grounding` |
| `orchestrator` | `dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ux-responsive`, `ruby-rails`, `rust`, `sql-migrations`, `project-bootstrap`, `docs-validation`, `agent-diagnostics`, `blogger`, `brutal-critic`, `code-change-impact`, `refactoring`, `legal-advisor`, `decision-grounding` |
| `planner` | `dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ux-responsive`, `ruby-rails`, `rust`, `sql-migrations`, `project-bootstrap`, `docs-validation`, `agent-diagnostics`, `refactoring`, `adr`, `decision-grounding` |
| `review` | `dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ux-responsive`, `ruby-rails`, `rust`, `sql-migrations`, `docs-validation`, `agent-diagnostics`, `code-change-impact`, `security-audit`, `decision-grounding` |
| `researcher` | _(none — read-only evidence gathering; skill-free by design)_ |
| `docs` | `docs-validation`, `project-bootstrap`, `agent-diagnostics`, `api-documentation`, `adr` |
| `em-advisor` | `project-bootstrap`, `agent-diagnostics`, `docs-validation`, `legal-advisor`, `blogger` |
| `blogger` | `blogger`, `brutal-critic` |
| `brutal-critic` | `brutal-critic`, `blogger` |
| `legal-advisor` | `legal-advisor` |

## Notes

- Baseline rule for all agents with skill access: `"*": "deny"`.
- Skills load on demand via the `skill` tool.
- Keep allowlists narrow by role to reduce context/tool noise.
- Installer `--languages` prunes non-requested language skill directories; non-language skills are always kept.

## Skill Trigger Guide (Canonical)

Use this as the canonical trigger reference for when agents should load skills.

| Task intent | Skill to load | Typical agents |
|---|---|---|
| Language/framework implementation or review | Matching stack skill (`dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ruby-rails`, `rust`, `sql-migrations`) | `codebase`, `review`, `planner`, `orchestrator` |
| Responsive UX across phone/tablet/desktop | `ux-responsive` | `codebase`, `review`, `planner`, `orchestrator` |
| Content drafting (blogs, podcasts, YouTube, resumes, LinkedIn, bios) | `blogger` | `blogger`, `orchestrator`, `em-advisor` |
| Content critique and scoring | `brutal-critic` | `brutal-critic`, `blogger`, `orchestrator` |
| Docs quality checks (lint/link/structure) | `docs-validation` | `docs`, `review`, `planner`, `orchestrator`, `em-advisor` |
| Agent/package diagnostics and configuration checks | `agent-diagnostics` | `docs`, `review`, `planner`, `orchestrator`, `em-advisor` |
| Project bootstrap scaffolding | `project-bootstrap` | `docs`, `planner`, `orchestrator`, `em-advisor` |
| Legal research, compliance, contract review, license auditing, data privacy, IP, export controls | `legal-advisor` | `legal-advisor`, `codebase`, `orchestrator`, `em-advisor` |
| Code change impact/blast-radius analysis, regression check, safe-to-merge verification | `code-change-impact` | `review`, `codebase`, `orchestrator` |
| Ground high-stakes decisions in current best practice (dispatch `@researcher`; deprecations, API/version changes, workaround smell) | `decision-grounding` | `orchestrator`, `codebase`, `planner`, `review` |
| Security-focused code and config review, vulnerability scanning, threat modeling | `security-audit` | `review` |
| Safe staged refactoring, structural code improvements without behavior changes | `refactoring` | `codebase`, `planner`, `orchestrator` |
| API reference documentation generation, endpoint docs, OpenAPI/Swagger | `api-documentation` | `docs` |
| Architecture Decision Records, technical decision documentation, design rationale | `adr` | `docs`, `planner` |

Trigger policy:
- Load skills only on demand for the active task/phase.
- Start with one relevant skill; add a second only for explicit cross-domain needs.
- If stack/domain is ambiguous, ask a clarifying question before loading.

## Skill Scope Policy

- Keep the current core-only skill set.
- Expand only when demand, gap, ownership, and licensing checks are all satisfied.

## Command Routing Matrix

OpenCode commands delegate directly to a target agent.
Arguments passed in `/command-name [argument]` are forwarded to the command body via `$ARGUMENTS`.

| Command | Target agent | Purpose |
| --- | --- | --- |
| `/api-docs` | `docs` | Generate API reference documentation |
| `/architecture-decision` | `docs` | Create an ADR |
| `/architecture-review` | `review` | Review design for quality attributes |
| `/code-review` | `review` | Security, performance, and style review |
| `/content-review` | `brutal-critic` | Score and critique content quality |
| `/create-readme` | `docs` | Generate or improve a README |
| `/generate-tests` | `codebase` | Generate targeted tests |
| `/1-on-1-prep` | `em-advisor` | Prepare for a focused 1-on-1 |
| `/execution-loop` | `orchestrator` | Bounded verify-and-continue execution loop |
| `/plan-project` | `orchestrator` | Multi-phase implementation plan |
| `/refactor-plan` | `planner` | Safe staged refactor strategy |
| `/security-audit` | `review` | Security-focused code and config review |
| `/stop-loop` | `orchestrator` | Halt loop execution and report current state |
| `/checkpoint` | `orchestrator` | Structured phase-boundary checkpoint for human decision |
| `/blog-post` | `blogger` | Draft a blog post |
| `/legal-review` | `legal-advisor` | Review licenses, compliance, and data privacy |
