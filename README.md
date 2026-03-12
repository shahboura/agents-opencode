# OpenCode Agents

[![Validate Agents & Documentation](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml/badge.svg)](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml)
[![npm version](https://img.shields.io/npm/v/agents-opencode)](https://www.npmjs.com/package/agents-opencode)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://shahboura.github.io/agents-opencode/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Lean OpenCode agent pack for fast setup, safer skill loading, and production-ready workflows.

## Why this pack

- **Fast onboarding:** install in minutes with `npx`.
- **Clear execution flow:** plan, implement, review, and document with purpose-built agents.
- **Safer defaults:** on-demand skills + deny-by-default skill permissions.
- **Operationally ready:** built-in validation and release automation.

Quick jump: [Agents](#agents) · [Skills Matrix](./docs/skills-matrix.md) · [Commands](#commands) · [Full Docs](https://shahboura.github.io/agents-opencode/)

## Quick Start

**Requires:** Node.js

```bash
# Via npx (recommended)
npx agents-opencode --global

# Alternative (direct npm install)
npm install -g agents-opencode && agents-opencode --global

# Project install (current directory only)
npx agents-opencode --project .

# Install with specific languages only
npx agents-opencode --global --languages python,typescript

# Update existing installation
npx agents-opencode --update

# Uninstall
npx agents-opencode --uninstall
```

Install behavior note:
- `npx`/`npm` installs from the published npm package version (deterministic release artifact).

Then run:

```bash
opencode
/init
@orchestrator Build a REST API with JWT auth
```

## Agents

| Agent | Best For | Allocated Skills (summary) |
|-------|----------|----------------------------|
| `@orchestrator` | Multi-phase coordination | Language skills + utility skills + `blogger`/`brutal-critic` |
| `@planner` | Read-only architecture/planning | Language skills + utility skills |
| `@codebase` | Feature implementation | Language skills + `sql-migrations` |
| `@review` | Security/performance/code quality | Language skills + `docs-validation` + `agent-diagnostics` |
| `@docs` | Documentation updates | `docs-validation` + `project-bootstrap` + `agent-diagnostics` |
| `@em-advisor` | EM/leadership guidance | `project-bootstrap` + `docs-validation` + `agent-diagnostics` |
| `@blogger` | Blog/video/podcast drafting | `blogger` + `brutal-critic` |
| `@brutal-critic` | Final content quality gate | `brutal-critic` + `blogger` |

See full allowlists: [Skills Matrix](./docs/skills-matrix.md)

## Skill Loading (OpenCode)

- Instruction files live in `.opencode/instructions/*.instructions.md`.
- Reusable skill packs live in `.opencode/skills/<name>/SKILL.md`.
- Skills are loaded on demand via the `skill` tool.
- Use one relevant skill per task/phase by default; add another only for clear cross-domain work.
- If stack/domain is unclear, ask for clarification before loading.

## Skill Scope Policy (Keep it)

- **Yes, keep this policy.** It keeps the pack focused and safe.
- Current scope is **core-only** skills (no optional skill packs).
- Additions should pass demand, clear-gap, ownership, and licensing/provenance checks.

## Skill Permissions (Least Privilege)

Use `permission.skill` allowlists in agent frontmatter to prevent unrelated skill loads.

```yaml
permission:
  skill:
    "*": "deny"
    "python": "allow"
    "sql-migrations": "allow"
```

This keeps skills focused by agent role and reduces accidental context bloat.

## Commands

Type `/command-name` in the TUI to run:

| Command | Description |
|---------|-------------|
| `/api-docs` | Generate API documentation |
| `/code-review` | Comprehensive code review |
| `/generate-tests` | Unit test generation |
| `/security-audit` | Security audit |
| `/refactor-plan` | Refactoring plan |
| `/create-readme` | Generate README |
| `/architecture-decision` | ADR creation |
| `/architecture-review` | Architecture review |
| `/blog-post` | Blog post creation |
| `/content-review` | Content quality scoring |
| `/plan-project` | Multi-phase project planning |
| `/1-on-1-prep` | Meeting preparation |

## Docs

- **[Getting Started](./docs/getting-started.md)**
- **[Full Documentation](https://shahboura.github.io/agents-opencode/)**
