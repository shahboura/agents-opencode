---
layout: default
title: Commands & Skills
nav_order: 4
description: Slash commands and reusable skills for OpenCode agent workflows.
---

# Commands & Skills

## Commands

Type `/command-name` in the OpenCode TUI to run.

Most commands accept an optional argument to scope the task:
`/command-name [argument]` — the argument is passed directly to the target agent.

| Command | Argument hint | Purpose |
|---|---|---|
| `/api-docs` | `[module, file, or endpoint path]` | Generate API reference docs |
| `/architecture-decision` | `[decision topic or system name]` | Create an ADR |
| `/architecture-review` | `[system, component, or design document]` | Review design for quality attributes |
| `/blog-post` | `[topic or title]` | Write a blog post |
| `/code-review` | `[file, PR, or scope — blank for current changes]` | Security, perf, and style review |
| `/content-review` | `[content text, file path, or topic]` | Score and critique content quality |
| `/create-readme` | `[project name or path]` | Generate or improve a README |
| `/generate-tests` | `[file, class, or function name]` | Generate targeted tests |
| `/plan-project` | `[feature, objective, or epic]` | Multi-phase implementation plan |
| `/refactor-plan` | `[target module, file, or scope]` | Safe staged refactor strategy |
| `/security-audit` | `[scope, file, component, or 'full project']` | Security-focused code review |
| `/1-on-1-prep` | `[person] [context]` | Prepare for a 1-on-1 meeting |

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

### Skill Selection Guardrails

- Load skills on demand for matching tasks only.
- Use one relevant skill by default; add a second only for clear cross-domain need.
- If technology/domain is ambiguous, ask for clarification before loading.

### Skill Permission Hardening

OpenCode supports skill-level permissions. Use these in agent frontmatter:

```yaml
permission:
  skill:
    "*": "deny"
    "docs-validation": "allow"
    "agent-diagnostics": "allow"
```

Pattern notes:

- `"*": "deny"` first, then explicit allows.
- Use wildcard patterns for groups (for example, `"internal-*": "allow"`).
- Prefer narrow allowlists per agent role for least privilege.

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
