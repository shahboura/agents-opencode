---
layout: default
title: Customization
nav_order: 7
---

# Customization

## Project Context

Create or update `AGENTS.md` (created on first run or via `/init`) with a short project summary:

```markdown
# Project

## Tech
- Node.js, TypeScript, PostgreSQL

## Standards
- Async/await everywhere
- Tests for new features
- No hardcoded secrets
```

## Agent Configuration

Edit `.opencode/agent/[agent].md` to adjust behavior (model, permissions, tools).

## Custom Commands

Add command files to `.opencode/commands/` with frontmatter (`description`, `agent`).
Type `/command-name` in the TUI to run.

## Skills

Skills live in `.opencode/skills/` and can be loaded on demand:

- `project-bootstrap`
- `agent-diagnostics`
- `docs-validation`

## Next Steps

- **[Getting Started](./getting-started)**
- **[Agents](./agents/README)**
- **[Coding Standards](./instructions)**
