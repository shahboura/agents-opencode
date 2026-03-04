---
layout: default
title: Commands & Skills
nav_order: 4
description: Slash commands and reusable skills for OpenCode agent workflows.
---

# Commands & Skills

## Commands

Type `/command-name` in the OpenCode TUI to run.

### Documentation

- `/api-docs` - Generate comprehensive API documentation
- `/create-readme` - Generate professional README
- `/architecture-decision` - ADR creation

### Testing & Quality

- `/generate-tests` - Unit test generation
- `/code-review` - Comprehensive code review
- `/security-audit` - Conduct security audits
- `/architecture-review` - Review architectural decisions

### Content Creation

- `/blog-post` - Write a blog post with research and fact validation
- `/content-review` - Review content with framework-based criticism

### Development & Planning

- `/refactor-plan` - Create refactoring plans
- `/plan-project` - Plan and coordinate multi-phase projects

### Management

- `/1-on-1-prep` - Meeting preparation

## Skills

Skills are reusable behaviors loaded on demand:

- `project-bootstrap` - Create a minimal `AGENTS.md` scaffold
- `agent-diagnostics` - Validate agent setup and instruction coverage
- `docs-validation` - Outline docs lint and link checks

### Using Skills

Skills are defined in `.opencode/skills/[skill-name]/SKILL.md`. Agents load them
via the `skill` tool when the task matches. To invoke a skill manually, ask an
agent to use it:

```
@codebase Use the project-bootstrap skill to create AGENTS.md
@codebase Run agent-diagnostics to check my setup
```

Skills cannot be called directly from the TUI — they are invoked through agents.

## Custom Commands

Add command files to `.opencode/commands/` with frontmatter:

```yaml
---
description: What this command does
agent: recommended-agent
subtask: true
---
```

See [OpenCode Commands docs](https://opencode.ai/docs/commands/) for full reference.

## Next Steps

- **[Agents](./agents/README)**
- **[Customization](./customization)**
