---
layout: default
title: Home
nav_order: 1
permalink: /
description: Lean OpenCode agents pack with 8 specialized agents, core language/domain skills, and slash commands.
keywords: opencode, ai agents, code generation, development workflow, .NET, Python, TypeScript, Flutter, code review, documentation
---

# OpenCode Agents

Lean agent pack for OpenCode workflows.

## Why this pack

- **Fast setup:** install and run in minutes.
- **Clear workflow:** orchestrate → implement → review → document.
- **Safe skill model:** on-demand loading + least-privilege allowlists.
- **Release-ready defaults:** validation and CI/CD hygiene included.

Quick jump: [Agents](agents/README) · [Skills Matrix](skills-matrix) · [Commands](commands)

## Quick Start

1. Install:

   ```bash
   npx agents-opencode --global
   ```

   Installer package/command: `agents-opencode`

2. Run:

   ```
   opencode
   /init
   @orchestrator Build a user API
   ```

   OpenCode runtime command: `opencode`

## Agents

| Agent | Best For | Allocated Skills (summary) |
|-------|----------|----------------------------|
| `@orchestrator` | Multi-phase coordination | Language skills + utility skills + `ux-responsive` + `blogger`/`brutal-critic` |
| `@planner` | Read-only architecture/planning | Language skills + utility skills + `ux-responsive` |
| `@codebase` | Feature implementation | Language skills + `sql-migrations` + `ux-responsive` |
| `@review` | Security/performance/code quality | Language skills + `docs-validation` + `agent-diagnostics` + `ux-responsive` |
| `@docs` | Documentation updates | `docs-validation` + `project-bootstrap` + `agent-diagnostics` |
| `@em-advisor` | EM/leadership guidance | `project-bootstrap` + `docs-validation` + `agent-diagnostics` |
| `@blogger` | Blog/video/podcast drafting | `blogger` + `brutal-critic` |
| `@brutal-critic` | Final content quality gate | `brutal-critic` + `blogger` |

For exact allowlists, use the [Skills Matrix](skills-matrix).

## Docs

- [Getting Started](getting-started)
- [Agents](agents/README)
- [Coding Standards](instructions)
- [Commands & Skills](commands)
- [Troubleshooting](troubleshooting)
- [Skills Matrix](skills-matrix)

## Skill Loading Model

- Skills live under `.opencode/skills/`.
- Agents load skills on demand via the `skill` tool.
- Keep to one relevant skill per phase unless cross-domain work requires more.

## Skill Scope Policy

- Keep core-only scope for now.
- Add new skills only when there is clear demand, a real gap, ownership, and clean licensing.
