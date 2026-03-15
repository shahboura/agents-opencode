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

| Agent | Best For |
|-------|----------|
| `@orchestrator` | Multi-phase coordination |
| `@planner` | Read-only architecture/planning |
| `@codebase` | Feature implementation |
| `@review` | Security/performance/code quality |
| `@docs` | Documentation updates |
| `@em-advisor` | EM/leadership guidance |
| `@blogger` | Blog/video/podcast drafting |
| `@brutal-critic` | Final content quality gate |

Canonical source for exact allowlists and skill triggers: [Skills Matrix](skills-matrix).

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
