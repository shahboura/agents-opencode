# OpenCode Agents

[![Validate Agents & Documentation](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml/badge.svg)](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://shahboura.github.io/agents-opencode/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**8 specialized AI agents** for intelligent development workflows. Multi-language support with auto-applied coding standards.

## 🚀 One-Command Install

**Requires:** Node.js + Git

```bash
# Global install (available in all projects)
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --global && rm install.js

# Project install (current directory only)
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --project . && rm install.js

# Uninstall
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --uninstall
```

**Installation Locations:**
- **Global:** `~/.config/opencode/` (Linux/macOS/Windows)
- **Project:** `./.opencode/` in your project directory

**That's it!** Agents are ready to use. No configuration needed.

---

## 🎯 Quick Start

1. **Install** (above)
2. **Run:** `opencode`
3. **Use:** `@orchestrator Build a REST API with JWT auth`

**That's it!** Agents handle planning, implementation, testing, and documentation automatically.

## 🤖 Available Agents

| Agent | Purpose |
|-------|---------|
| `@orchestrator` | Strategic planning & coordination |
| `@planner` | Read-only analysis & planning |
| `@codebase` | Multi-language implementation |
| `@blogger` | Content creation & scripting |
| `@brutal-critic` | Content review & validation |
| `@em-advisor` | Leadership & team guidance |
| `@docs` | Documentation generation |
| `@review` | Security & quality audits |

## 🌟 Key Features

- **15+ Languages** with auto-applied standards (.NET, Python, TypeScript, Flutter, Go, etc.)
- **Context Aware** - Learns from your `AGENTS.md` file
- **Session Logging** - Automatic summaries between conversations
- **Multi-Agent Workflows** - Agents can hand off to each other
- **Zero Config** - Works out of the box

## 📚 Examples

```bash
@orchestrator Build JWT auth with endpoints, tests, security review, and docs
@codebase Create user CRUD service with repository pattern and unit tests
@review Security and performance audit of auth module
@blogger Write tech post about microservices architecture
```

---

## 📖 Documentation

- **[Getting Started](./docs/getting-started.md)** - Complete setup guide
- **[Agent Reference](./docs/agents/README.md)** - Detailed agent capabilities
- **[Workflow Examples](./docs/workflows.md)** - Real-world usage patterns
- **[Coding Standards](./docs/instructions.md)** - Auto-applied language rules
- **[Full Documentation](https://shahboura.github.io/agents-opencode/)** - GitHub Pages site

## 🤝 Contributing

We welcome contributions! See our [GitHub Issues](https://github.com/shahboura/agents-opencode/issues) for ways to help.

---

**Built with ❤️ for the OpenCode community** • **License: MIT**
