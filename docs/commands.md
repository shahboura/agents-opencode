---
layout: default
title: Commands & Skills
nav_order: 5
---

# Commands & Skills

## Commands

Type `/command-name` in the OpenCode TUI to run.

- `/api-docs` - Generate comprehensive API documentation
- `/create-readme` - Generate professional README
- `/code-review` - Comprehensive code review
- `/generate-tests` - Unit test generation
- `/security-audit` - Conduct security audits
- `/refactor-plan` - Create refactoring plans
- `/1-on-1-prep` - Meeting preparation
- `/architecture-decision` - ADR creation
- `/architecture-review` - Review architectural decisions

## Skills

Skills are reusable behaviors loaded on demand:

- `project-bootstrap` - Create a minimal `AGENTS.md` scaffold
- `agent-diagnostics` - Validate agent setup and instruction coverage
- `docs-validation` - Outline docs lint and link checks

## Custom Commands

Add command files to `.opencode/commands/` with frontmatter:

```yaml
---
description: What this command does
agent: recommended-agent
---
```

See [OpenCode Commands docs](https://opencode.ai/docs/commands/) for full reference.

## Next Steps

- **[Agents](./agents/README)**
- **[Customization](./customization)**
