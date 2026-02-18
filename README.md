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

| Agent | Purpose |
|-------|---------|
| `@orchestrator` | Planning & coordination |
| `@planner` | Read-only planning |
| `@codebase` | Code implementation |
| `@review` | Security & quality audits |
| `@docs` | Documentation |
| `@em-advisor` | Leadership guidance |
| `@blogger` | Content creation |
| `@brutal-critic` | Content review |

## Docs

- **[Getting Started](./docs/getting-started.md)**
- **[Full Documentation](https://shahboura.github.io/agents-opencode/)**
