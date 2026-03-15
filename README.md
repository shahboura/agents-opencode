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

# Filter language instruction references for a lighter install
npx agents-opencode --global --languages python,typescript

# Update existing installation
npx agents-opencode --update

# Force update both global + current project scopes
npx agents-opencode --update --all

# Uninstall current project scope (default)
npx agents-opencode --uninstall

# Uninstall global scope only
npx agents-opencode --uninstall --global

# Uninstall both global + current project scopes
npx agents-opencode --uninstall --all

# Check detected installation scopes
npx agents-opencode --status
```

Install behavior note:
- `npx`/`npm` installs from the published npm package version (deterministic release artifact).
- npm package and installer command: `agents-opencode`
- OpenCode CLI runtime command: `opencode`
- `--languages` filters language instruction reference files; runtime skill loading remains on-demand per agent allowlists.

Uninstall behavior:
- `npx agents-opencode --uninstall` targets the **current project** by default.
- Use `--global` or `--all` for explicit scope control.
- Uninstall removes installer-managed files via install manifest tracking.
- Project backups: `<project>/.opencode/.backups/<timestamp>--<operation>--<scope>/`
- Global backups: `~/.config/opencode/.backups/<timestamp>--<operation>--<scope>/`
- Backup retention: latest 10 sessions and sessions newer than 30 days.

Restore from backup:
1. Open the latest backup session folder.
2. Review `backup-manifest.json` for file paths.
3. Copy files back to their original paths.

Update behavior:
- `npx agents-opencode --update` auto-detects and updates installed scopes (global and/or current project).
- Use `--all`, `--global`, or `--project [dir]` to force explicit update scope.

Configuration behavior:
- Installer merges only missing global permission defaults (`external_directory`, `doom_loop`) into `opencode.json`.
- Existing provider/model/instructions settings are preserved and never overwritten by installer defaults.

Then run:

```bash
opencode
/init
@orchestrator Build a REST API with JWT auth
```

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

Canonical source for exact allowlists and skill triggers: [Skills Matrix](./docs/skills-matrix.md)

## Skill Loading (OpenCode)

- Instruction files live in `.opencode/instructions/*.instructions.md` as reference material.
- Reusable skill packs live in `.opencode/skills/<name>/SKILL.md`.
- Skills are the primary runtime mechanism and are loaded on demand via the `skill` tool.
- Use one relevant skill per task/phase by default; add another only for clear cross-domain work.
- If stack/domain is unclear, ask for clarification before loading.

## Skill Scope Policy

- Scope remains **core-only** skills (no optional skill packs).
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

## Task Permissions (Subagent Hardening)

Use `permission.task` allowlists to control which subagents each agent can invoke.

```yaml
permission:
  task:
    "*": "deny"
    "explore": "allow"
    "review": "allow"
```

Pattern notes:
- Start with `"*": "deny"`, then add explicit allows.
- Keep allowlists narrow by role.
- Rules are matched in order and the last matching rule wins.

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
