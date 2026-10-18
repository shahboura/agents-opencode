---
title: OpenCode Agents
description: Lean OpenCode agents pack with 10 specialized agents, core language/domain skills, and slash commands.
keywords: opencode, ai agents, code generation, development workflow, .NET, Python, TypeScript, Flutter, code review, documentation
sidebar:
  label: Home
  order: 1
head:
  - tag: title
    content: OpenCode Agents
---

Lean agent pack for OpenCode workflows.

## Why this pack

- **Fast setup:** install and run in minutes.
- **Clear workflow:** orchestrate → implement → review → document.
- **Safe skill model:** on-demand loading + host-compatible skill access.
- **Release-ready defaults:** validation and CI/CD hygiene included.

Quick jump: [Getting Started](/getting-started/) · [Agents](/agents/) ·
[Skills Matrix](/skills-matrix/) · [Commands](/commands/)

## Quick Start

1. Install:

   ```bash
   npx agents-opencode --global
   ```

   Installer package/command: `agents-opencode`

2. Run:

   ```txt title="TUI"
   opencode
   /init
   @orchestrator Build a user API
   ```

   OpenCode runtime command: `opencode`

## OpenCode v1/v2

OpenCode **v1** is fully supported; **v2** installs and loads (plugin, all 10 agents,
and 27 skills verified on v2.0.30) but its runtime hooks are not yet exercised — see
[OpenCode v1/v2 Support](/opencode-v1-v2-support/).

## Claude Code

Also available as a Claude Code plugin:

```txt title="TUI"
/plugin marketplace add shahboura/agents-opencode-claude
/plugin install agents-opencode@shahboura
```

## Agents

| Agent | Best For |
|-------|----------|
| `@orchestrator` | Multi-phase coordination |
| `@planner` | Read-only architecture/planning |
| `@codebase` | Feature implementation |
| `@review` | Security/performance/code quality |
| `@researcher` | Grounding high-stakes decisions in current best practice |
| `@docs` | Documentation updates |
| `@em-advisor` | EM/leadership guidance |
| `@blogger` | Blog/video/podcast drafting |
| `@brutal-critic` | Final content quality gate |
| `@legal-advisor` | Legal research, jurisdiction-aware compliance, contract review, license auditing, data privacy, IP, export controls |

Canonical source for skill triggers and the host-skill policy: [Skills Matrix](/skills-matrix/).

## Docs

- [Getting Started](/getting-started/)
- [Agents](/agents/)
- [Customization](/customization/)
- [Commands & Skills](/commands/)
- [Troubleshooting](/troubleshooting/)
- [Skills Matrix](/skills-matrix/)
- [Agent Evals](/agent-evals/)
- [Approval Gates](/approval-gates/)
- [Review Gate](/review-gate/)
- [Decision Grounding](/decision-grounding/)
- [Compatibility](/compatibility/)
- [OpenCode v1/v2 Support](/opencode-v1-v2-support/)
- [Deprecation & Migration Policy](/deprecation-migration/)
- [State Management](/state-management/)
