---
layout: default
title: Customization
nav_order: 6
description: Customize agents, commands, skills, and project context for your workflow.
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

- Example skills: `ux-responsive`, `project-bootstrap`, `agent-diagnostics`, `docs-validation`
- For the canonical current list, use the [Skills Matrix](./skills-matrix)

Recommended policy:

- Load skills on demand only when the task clearly matches the domain.
- Use one relevant skill by default; add a second only for explicit cross-domain work.

### Skill Permissions per Agent

Harden each agent with `permission.skill` allowlists:

```yaml
permission:
  skill:
    "*": "deny"
    "blogger": "allow"
    "brutal-critic": "allow"
```

This prevents unrelated skills from being loaded and keeps behavior predictable.

### Scope Policy (Core-only)

Current distribution is intentionally core-only; no optional skill packs are shipped.

When evaluating potential additions, use this gate:

1. Repeated demand in real usage
2. Clear capability gap vs current core
3. Named maintenance owner
4. Clean licensing/provenance (or clean-room rewrite)

## Next Steps

- **[Getting Started](./getting-started)**
- **[Agents](./agents/README)**
- **[Coding Standards](./instructions)**
