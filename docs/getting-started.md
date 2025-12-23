---
layout: default
title: Getting Started
nav_order: 2
---

# Getting Started

Get up and running with OpenCode agents in under 5 minutes.

## Prerequisites

- [OpenCode CLI](https://opencode.ai/docs/cli/) installed
- Node.js/npm and Git
- Any project (existing repos work perfectly)

## Quick Setup (60 seconds)

### Global Installation

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --global && rm install.js
```

### Project Installation

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --project /path/to/your/project && rm install.js
```

### Windows (PowerShell)

```powershell
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js; node install.js --global; rm install.js
```

### Linux/macOS (Bash/Zsh)

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --project . && rm install.js
```

### Uninstall

#### Remove from Current Directory/Project

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --uninstall && rm install.js
```

**What happens:**
- **Project installations:** Backs up `AGENTS.md` only, removes `.opencode/` and other files entirely
- **Repository self-cleanup:** Backs up `AGENTS.md`, removes generated files (`install.js`, `examples/`, etc.)
- Agent configurations can be re-installed, session history is preserved

#### Remove Global Installation

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --uninstall --global && rm install.js
```

**What happens:**
- Removes agents from `~/.config/opencode/` (Linux/macOS) or `%APPDATA%\Local\opencode\` (Windows)
- Backs up session history before removal
- Safe to run multiple times

## Your First Agent Interaction

1. **Open OpenCode Chat:**

   ```bash
   opencode
   ```

2. **Select an agent and describe what you want:**

   ```
   @orchestrator Build a user authentication API with JWT tokens
   ```

   **The agent will:**
   - 📋 Propose a detailed implementation plan
   - ⏸️ Wait for your approval before proceeding
   - 🔨 Implement step-by-step with validation
   - ✨ Suggest next steps (docs, review, etc.)

## How It Works

### Plan-First Approach
Agents never jump straight into coding. They always:
1. **Analyze** your request and current codebase
2. **Propose** a structured plan with phases and dependencies
3. **Wait** for your approval before implementation
4. **Execute** incrementally with validation at each step

### Multi-Language Support
Agents automatically detect your tech stack and apply appropriate standards:

| Language | Standards Applied |
|----------|-------------------|
| .NET (C#) | Clean Architecture, async/await, nullable types |
| Python | Type hints, pytest, black formatting |
| TypeScript | Strict mode, null safety |
| Flutter (Dart) | Riverpod, freezed models, widget testing |
| Go | Modules, error handling, concurrency |
| Node.js (Express) | Security middleware, async patterns |
| React (Next.js) | Accessibility, performance optimization |

### Context Awareness
Agents read your `AGENTS.md` file to understand:
- Your project architecture and patterns
- Coding standards and conventions
- Team preferences and constraints
- Past decisions and implementations

## Available Agents

| Agent | Purpose | Use When |
|-------|---------|----------|
| `@orchestrator` | Strategic planning & coordination | Complex features, risk assessment, multi-phase projects |
| `@planner` | Read-only analysis & planning | Detailed plans without code changes |
| `@codebase` | Code implementation | Direct implementation, bug fixes, feature development |
| `@blogger` | Content creation | Tech blogging, podcasting, YouTube scripting |
| `@brutal-critic` | Content review | Honest feedback, framework validation |
| `@em-advisor` | Leadership guidance | Team management, 1-on-1 preparation |
| `@docs` | Documentation | README generation, API docs, guides |
| `@review` | Security & quality audits | Code review, security checks, performance analysis |

## Essential Tips for Success

### 🎯 Be Specific

```bash
❌ @codebase Add authentication
✅ @codebase Add JWT authentication with:
    - Login endpoint (email/password)
    - Refresh token mechanism
    - Password hashing with bcrypt
    - Rate limiting on login attempts
```

### 📋 Always Review Plans
- Agents propose plans before implementing
- Take time to review and provide feedback
- Plans can be refined before approval

### 🔄 Use Agent Handoffs
Don't do everything with one agent. Use sequences:

```
@orchestrator (plan) → @codebase (implement) → @review (audit) → @docs (document)
```

### 📚 Leverage Context
Add project details to `AGENTS.md`:

```markdown
## My Project
- Tech: Node.js, TypeScript, PostgreSQL
- Architecture: Clean Architecture with repository pattern
- Standards: Async/await everywhere, comprehensive error handling
```

### ⚡ Use Slash Commands
Type `/` in chat for common tasks:
- `/create-readme` - Generate professional documentation
- `/code-review` - Comprehensive code audit
- `/generate-tests` - Unit test generation
- `/security-audit` - Security vulnerability scan

## Next Steps

- **[Agent Reference](./agents/README.md)** - Deep dive into each agent's capabilities
- **[Workflow Examples](./workflows.md)** - Real-world usage patterns
- **[Customization](./customization.md)** - Tailor agents to your project
- **[Troubleshooting](./troubleshooting.md)** - FAQ and common issues

**Ready to build something amazing?** 🚀

```bash
opencode
@orchestrator What would you like to build?
```
