# GitHub Copilot Custom Agents

Specialized GitHub Copilot agents for intelligent, plan-first development workflows.

**Agents:** @orchestrator • @codebase • @docs • @review • @em-advisor

---

## 🚀 Quick Start (60 seconds)

### Use an Agent

1. Open GitHub Copilot Chat: `Ctrl+Shift+I` (or `Cmd+Shift+I`)
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

### 6 Specialized Agents

### 6 Specialized Agents

### 5 Specialized Agents

| Agent | Purpose | Use For |
|-------|---------|---------|
| **@orchestrator** | Strategic planning & coordination | Complex features, risk assessment, multi-phase projects, end-to-end execution |
| **@codebase** | Multi-language dev | Direct implementation, bug fixes, code generation |
| **@docs** | Documentation | README, API docs, guides |
| **@review** | Security & quality | Audits, performance, best practices |
| **@em-advisor** | Leadership guidance | Strategy, team dynamics, 1-on-1s |

---

## ⚡ 5 Reusable Prompts

Invoke with `/` in Copilot Chat:

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

Add project context to `.github/copilot-instructions.md`:

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
A: Ensure files are in `.github/agents/` with `.agent.md` extension. Reload VS Code.

**Q: How do I modify agent behavior?**  
A: Edit `.github/agents/[agent-name].agent.md` directly.

**Q: Do agents save context between sessions?**  
A: Yes! They update `.github/copilot-instructions.md` automatically (with your approval).

**[👉 Full FAQ](./docs/troubleshooting.md)**

---

## 📖 Full Documentation
