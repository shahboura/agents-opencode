# OpenCode Custom Agents

Specialized OpenCode agents for intelligent, plan-first development workflows.

**Agents:** @orchestrator • @codebase • @docs • @review • @em-advisor

---

## 🚀 Quick Start (60 seconds)

### Use an Agent

1. Open OpenCode: `opencode` command
2. Select an agent: `@orchestrator`, `@codebase`, `@review`, etc.
3. Describe what you want:

```
@orchestrator Build a user REST API endpoint with JWT authentication
```

**The agent will:**
- 📋 Propose a step-by-step plan
- ⏸️ Wait for your approval (or proceed if you approve execution)
- 🔨 Implement with validation
- ✨ Suggest next steps (docs, review, etc.)

---

## 📚 Core Concepts

### 5 Specialized Agents

| Agent | Purpose | Use For |
|-------|---------|---------|
| **@orchestrator** | Strategic planning & coordination | Complex features, risk assessment, multi-phase projects, end-to-end execution |
| **@codebase** | Multi-language dev | Direct implementation, bug fixes, code generation |
| **@docs** | Documentation | README, API docs, guides |
| **@review** | Security & quality | Audits, performance, best practices |
| **@em-advisor** | Leadership guidance | Strategy, team dynamics, 1-on-1s |

**Note:** All agents automatically add session summaries to AGENTS.md after task completion.

---

## ⚡ 5 Reusable Prompts

Invoke with `/` in OpenCode:

- `/create-readme` - Generate professional README
- `/code-review` - Comprehensive code review
- `/generate-tests` - Unit test generation
- `/1-on-1-prep` - EM meeting prep
- `/architecture-decision` - ADR creation

**[👉 Learn More](./docs/prompts.md)**

---

## 🎯 Auto-Applied Coding Standards

No configuration needed. When you edit files, standards activate automatically:

| Pattern | Standards |
|---------|-----------|
| `.cs` / `.csproj` | .NET Clean Architecture, async/await, nullable types |
| `.py` | Python type hints, pytest, black formatting |
| `.ts` / `.tsx` | TypeScript strict mode, null safety |
| `.dart` | Flutter Riverpod, freezed models, widget testing |

**[👉 View Standards](./docs/instructions.md)**

---

## 💡 Example Workflows

### Build Authentication System (End-to-End)
```
@orchestrator Build JWT auth with endpoints, tests, security review, and docs
```

### Plan Before Implementing (Design Review)
```
@orchestrator Create detailed plan for JWT authentication—analyze current code and propose architecture
```

### Direct Implementation
```
@codebase Create user CRUD service with repository pattern and unit tests
```

### Code Review
```
@review Security and performance audit of auth module
```

**[👉 More Examples](./docs/workflows.md)**

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

## 📦 Installation & Setup

### Prerequisites
- [OpenCode CLI](https://opencode.ai/docs/cli/) installed
- Any project (works with existing repos)

### Install Agents

1. **Clone this repository:**
```bash
git clone https://github.com/your-username/agents-opencode.git
cd agents-opencode
```

2. **Copy agent configurations:**
```bash
# For global installation (available in all projects)
cp -r .opencode/agent/ ~/.config/opencode/agent/

# Or for project-specific installation
cp -r .opencode/agent/ your-project/.opencode/agent/
```

3. **Copy language instructions (optional):**
```bash
cp -r .github/instructions/ your-project/.github/instructions/
```

4. **Set up AGENTS.md (optional):**
```bash
cp AGENTS.md your-project/
# Edit to match your project
```

### Verify Installation

```bash
opencode
# Type @ in chat to see available agents
```

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
├── .opencode/agent/          # OpenCode agent configurations
├── .github/
│   ├── agents/               # GitHub Copilot agent definitions
│   ├── instructions/         # Language-specific coding standards
│   └── prompts/              # Reusable prompt templates
├── docs/                     # GitHub Pages documentation
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
