# OpenCode Custom Agents

[![Validate Agents & Documentation](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml/badge.svg)](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://shahboura.github.io/agents-opencode/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub last commit](https://img.shields.io/github/last-commit/shahboura/agents-opencode)](https://github.com/shahboura/agents-opencode/commits/main)
[![GitHub Stars](https://img.shields.io/github/stars/shahboura/agents-opencode?style=social)](https://github.com/shahboura/agents-opencode)

**8 specialized AI agents** for intelligent development workflows with multi-language support and auto-applied coding standards.

---

## ⚡ Quick Install (30 seconds)

**One-command installation - downloads everything automatically!**

```bash
# Global installation (available in all projects)
npx https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js --global

# Or for project-specific installation
npx https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js --project /path/to/your/project

# Check version before installing
npx https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js --version

# Uninstall if needed
npx https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js --uninstall
```

**Alternative for Unix systems (Linux/macOS):**

```bash
# Global installation
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.sh | bash -s -- --global

# Project installation
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.sh | bash -s -- --project /path/to/your/project
```

**What happens:** The script automatically downloads the latest agents, instructions,
and prompts from GitHub - no manual cloning required!

**Features:**
- ✅ Automatic backups of existing installations
- ✅ Preserves your session history (AGENTS.md)
- ✅ Post-installation verification
- ✅ Cross-platform support (Windows/Linux/macOS)
- ✅ Includes examples and learning materials

### Manual Installation (Alternative)

If you prefer to download files first:

#### Windows

```powershell
# Download install.ps1, then run:
.\install.ps1

# Or install to specific project directory
.\install.ps1 -TargetDir "C:\path\to\your\project\.opencode"
```

#### Linux/macOS

```bash
# Download install.sh, then run:
./install.sh

# Or install to specific project directory
./install.sh /path/to/your/project/.opencode
```

**Prerequisites:** Git must be installed

**Note:** Installation preserves existing `AGENTS.md` files to maintain your session history and project context.

---

## 🚀 Get Started (60 seconds)

### Use an Agent

1. **Open OpenCode:** Run `opencode` command
2. **Select an agent:** Type `@orchestrator`, `@codebase`, `@review`, etc.
3. **Describe what you want:**

```
@orchestrator Build a user REST API endpoint with JWT authentication
```

**The agent will:**
- 📋 Propose a step-by-step plan
- ⏸️ Wait for your approval (or proceed if you approve execution)
- 🔨 Implement with validation
- ✨ Suggest next steps (docs, review, etc.)

---

## 🎯 What You Get

**8 Specialized Agents:**
- **@orchestrator** - Strategic planning & coordination
- **@planner** - Read-only analysis & implementation planning
- **@codebase** - Multi-language code implementation
- **@blogger** - Content creation & scripting
- **@brutal-critic** - Content review & validation
- **@em-advisor** - Leadership & team guidance
- **@docs** - Documentation generation
- **@review** - Security & quality audits

**15+ Language Standards:**
.NET, Python, TypeScript, Flutter, Go, Java, Node.js, React, Ruby, Rust, and more with auto-applied best practices.

**9 Reusable Prompts:**
API docs, code review, testing, architecture decisions, and more.

---

## 📚 Examples

- **API Development:** `@orchestrator Build REST API with auth, tests, docs`
- **Code Review:** `@review Security audit of authentication module`
- **Content Creation:** `@blogger Write tech post about microservices`
- **Planning:** `@planner Design user management system architecture`

**[📚 View Full Examples](./examples/)** • **[🎥 Watch Demos](https://github.com/shahboura/agents-opencode/discussions)**

---

## 🎯 Auto-Applied Coding Standards

No configuration needed. When you edit files, standards activate automatically:

| Pattern | Standards |
|---------|-----------|
| `.cs` / `.csproj` | .NET Clean Architecture, async/await, nullable types |
| `.py` | Python type hints, pytest, black formatting |
| `.ts` / `.tsx` | TypeScript strict mode, null safety |
| `.dart` | Flutter Riverpod, freezed models, widget testing |
| `.go` | Go modules, testing, concurrency patterns |
| `.js` / `.ts` | Node.js Express, security middleware, async handling |
| `.jsx` / `.tsx` | React Next.js, accessibility, performance |
| `.sql` | SQL migrations, safety, data quality |
| `.md` / `.mdx` | Content creation standards, research validation |

**[👉 View Standards](./docs/instructions.md)**

---

## 💡 Example Workflows

### Build Authentication System (End-to-End)

```
@orchestrator Build JWT auth with endpoints, tests, security review, and docs
```

### Plan Before Implementing (Design Review)

```
@planner Create detailed plan for JWT authentication—analyze current code and
propose architecture
```

This agent is read-only and won't make changes. Perfect for getting a comprehensive
implementation plan before starting work.

### Direct Implementation

```
@codebase Create user CRUD service with repository pattern and unit tests
```

### Code Review

```
@review Security and performance audit of auth module
```

**[👉 More Examples](./docs/workflows.md)**  
**[👉 Runnable Examples](./examples/)**

---

## 🛠️ Customization

Add project context to `AGENTS.md`:

```markdown
## Your Project

Multi-language microservices using:
- Clean Architecture (.NET)
- FastAPI (Python)
- React TypeScript

## Your Standards
- Async/await on all I/O
- Repository pattern for data
- Unit tests for public methods
```

Agents automatically use this context!

**[👉 Full Customization Guide](./docs/customization.md)**

---

## ❓ FAQ & Troubleshooting

**Q: How do I get agents to show up?**  
A: Ensure files are in `.opencode/agent/` with `.md` extension. Restart OpenCode.

**Q: How do I modify agent behavior?**  
A: Edit `.opencode/agent/[agent-name].md` directly.

**Q: Do agents save context between sessions?**  
A: Yes! They update `AGENTS.md` automatically with session summaries.

**[👉 Full FAQ](./docs/troubleshooting.md)**

---

## 🤖 Agent Capabilities Overview

| Agent | Type | Key Capabilities | Best For |
|-------|------|------------------|----------|
| **@orchestrator** | Primary | Strategic planning, multi-phase coordination, risk assessment | Complex projects, end-to-end execution |
| **@planner** | Primary | Read-only analysis, implementation planning, architecture review | Detailed planning without code changes |
| **@codebase** | Primary | Multi-language implementation, auto-applied standards, testing | Direct coding, bug fixes, features |
| **@blogger** | Primary | Content creation, podcast ideation, YouTube scripting | Tech writing, content strategy |
| **@brutal-critic** | Subagent | Content review, framework validation, research validation | Quality assurance, feedback |
| **@em-advisor** | Primary | Leadership guidance, team dynamics, 1-on-1 prep | Management, career development |
| **@docs** | Subagent | Documentation generation, README creation, API docs | Technical writing, knowledge sharing |
| **@review** | Subagent | Security audits, performance analysis, code quality | Quality assurance, compliance |

**All agents support:**
- Context-aware assistance from `AGENTS.md`
- Session summary logging
- Multi-language file handling
- Integration with other agents

---

## 📖 Full Documentation

Complete documentation is available at [https://shahboura.github.io/agents-opencode/](https://shahboura.github.io/agents-opencode/)

### 📚 Documentation Sections

- **[Getting Started Guide](./docs/getting-started.md)** - Step-by-step setup and first usage
- **[Agent Reference](./docs/agents/README.md)** - Detailed capabilities of each agent
- **[Workflow Examples](./docs/workflows.md)** - Real-world usage patterns
- **[Coding Standards](./docs/instructions.md)** - Auto-applied language-specific rules
- **[Prompt Commands](./docs/prompts.md)** - Reusable `/` commands
- **[Customization](./docs/customization.md)** - Adapt agents to your project
- **[Troubleshooting](./docs/troubleshooting.md)** - FAQ and common issues

### 🏗️ Repository Structure

```
├── .opencode/
│   ├── agent/                # OpenCode agent configurations
│   └── instructions/         # Language-specific coding standards
├── docs/                     # Documentation
├── AGENTS.md                 # Session summaries and context
└── opencode.json            # OpenCode configuration
```

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

**Ready to get started?** Check out the [Getting Started Guide](./docs/getting-started.md) 🚀
