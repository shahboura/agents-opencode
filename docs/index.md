---
layout: default
title: Home
nav_order: 1
permalink: /
description: Lean OpenCode agents pack with 8 specialized agents, 14 coding standards, and slash commands.
keywords: opencode, ai agents, code generation, development workflow, .NET, Python, TypeScript, Flutter, code review, documentation
---

# OpenCode Agents

Lean agent pack for OpenCode workflows.

## Quick Start

1. Install:

   ```bash
   npx agents-opencode --global
   ```

2. Run:

   ```
   opencode
   /init
   @orchestrator Build a user API
   ```

## Agents

| Agent | Purpose |
|-------|---------|
| `@orchestrator` | Planning & coordination |
| `@planner` | Read-only planning |
| `@codebase` | Code implementation |
| `@review` | Security & quality audits |
| `@docs` | Documentation |
| `@em-advisor` | Leadership guidance |
| `@blogger` | Content creation |
| `@brutal-critic` | Content review |

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
