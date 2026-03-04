# OpenCode Agents

[![Validate Agents & Documentation](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml/badge.svg)](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml)
[![npm version](https://img.shields.io/npm/v/agents-opencode)](https://www.npmjs.com/package/agents-opencode)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://shahboura.github.io/agents-opencode/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Minimal OpenCode agents pack for project workflows.

## Quick Start

**Requires:** Node.js + Git

```bash
# Via npx (recommended)
npx agents-opencode --global

# Or curl + node
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --global && rm install.js

# Project install (current directory only)
npx agents-opencode --project .

# Install with specific languages only
npx agents-opencode --global --languages python,typescript

# Update existing installation
npx agents-opencode --update

# Uninstall
npx agents-opencode --uninstall
```

Then run:

```bash
opencode
/init
@orchestrator Build a REST API with JWT auth
```

## Agents

| Agent | Purpose | Use For |
|-------|---------|---------|
| `@orchestrator` | Planning & coordination | Multi-phase work, risk assessment |
| `@planner` | Read-only planning | Analysis and plans only |
| `@codebase` | Code implementation | Features, fixes, refactors |
| `@review` | Security & quality audits | Security, performance, best practices |
| `@docs` | Documentation | README, API docs, guides |
| `@em-advisor` | Leadership guidance | Team management, 1-on-1 prep |
| `@blogger` | Content creation | Tech/blog/podcast scripts |
| `@brutal-critic` | Content review | Critique, framework validation |

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
