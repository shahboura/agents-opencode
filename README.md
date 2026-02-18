# OpenCode Agents

[![Validate Agents & Documentation](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml/badge.svg)](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://shahboura.github.io/agents-opencode/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Minimal OpenCode agents pack for project workflows.

## Quick Start

**Requires:** Node.js + Git

```bash
# Global install (available in all projects)
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --global && rm install.js

# Project install (current directory only)
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --project . && rm install.js

## Uninstall
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --uninstall
```

Then run:

```bash
opencode
/init
@orchestrator Build a REST API with JWT auth
```

## Quick Usage

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

## Docs

- **[Getting Started](./docs/getting-started.md)**
- **[Full Documentation](https://shahboura.github.io/agents-opencode/)**
