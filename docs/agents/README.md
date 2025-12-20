---
layout: default
title: Agents
nav_order: 2
has_children: true
---

# GitHub Copilot Agents

Five specialized agents, each excelling at specific tasks.

## Overview

| Agent | Specialization | Key Capability |
|-------|---|---|
| [@orchestrator](./orchestrator.md) | Planning & Coordination | Strategic analysis, planning, multi-phase workflows |
| [@codebase](./codebase.md) | Development | Multi-language implementation |
| [@docs](./docs.md) | Documentation | README, API docs, guides |
| [@review](./review.md) | Quality | Security, performance, best practices |
| [@em-advisor](./em-advisor.md) | Leadership | Strategy, team dynamics |

---

## When to Use Each Agent

### Need a Detailed Plan or Risk Assessment?
👉 Use **[@orchestrator](./orchestrator.md)** in Planning Mode - Analyzes, plans, identifies risks (read-only option available)

### Implementing Features?
👉 Use **[@codebase](./codebase.md)** - Writes code, runs tests, validates (multi-language)

### Coordinating Big Projects End-to-End?
👉 Use **[@orchestrator](./orchestrator.md)** in Execution Mode - Plans + delegates to specialists

### Checking Quality?
👉 Use **[@review](./review.md)** - Security audits, performance checks, best practices

### Need Documentation?
👉 Use **[@docs](./docs.md)** - README, API docs, user guides

### Leading People?
👉 Use **[@em-advisor](./em-advisor.md)** - 1-on-1 prep, strategy, team issues

---

## Agent Capabilities

### Read & Search
All agents can:
- Read code and documentation
- Search by filename and content
- Analyze codebase patterns
- Find all usages of functions/classes

### Edit & Create
Only some agents can:
- **@codebase** - Full edit access
- **@orchestrator** - Full edit access (planning mode reads-only, execution mode edits)
- **@docs** - Documentation edit access
- **@review** - Read-only (no edits)
- **@em-advisor** - Read-only (no edits)

### Execute
Some agents can run commands:
- **@codebase** - Run tests, builds, linters
- **@orchestrator** - Run tests, builds, terminal commands

### External Resources
All agents can:
- Fetch documentation from web
- Look up best practices
- Reference external APIs
---

## Agent Workflow

### Phase 1: Planning
Agent analyzes your request and proposes a plan.

### Phase 2: Approval
You review and approve before any changes.

### Phase 3: Execution
Agent implements step-by-step with validation.

### Phase 4: Handoff
Agent suggests next steps (review, document, etc.).

---

## Quick Examples

### Example 1: Build Authentication
```
@orchestrator Build JWT authentication with:
- Login/logout endpoints
- Refresh tokens
- Rate limiting
- Comprehensive tests
- Security review
- API documentation
```

**Flow:**
1. Plan created → You approve
2. @codebase implements endpoints
3. @review audits for security
4. @codebase addresses findings
5. @docs creates API docs
6. Done!

### Example 2: Fix a Bug
```
@codebase Fix: Users can't update their profile picture
- Identify root cause
- Implement fix
- Add tests to prevent regression
- Validate with existing tests
```

### Example 3: Code Review
```
@review Audit the payment processing module for:
- Security vulnerabilities
- Performance issues
- Best practices violations
```

---

## Detailed Agent Guides

- **[@orchestrator](./orchestrator.md)** - Planning & execution coordinator
- **[@codebase](./codebase.md)** - Multi-language development
- **[@docs](./docs.md)** - Documentation creation
- **[@review](./review.md)** - Code quality audits
- **[@em-advisor](./em-advisor.md)** - Leadership guidance
---

## Profile Auto-Detection

@codebase automatically detects your project type:

| Detection | Language | Adaptations |
|-----------|----------|-------------|
| `*.sln`, `*.csproj` | .NET | Clean Architecture, async/await, nullable types |
| `pyproject.toml`, `requirements.txt` | Python | Virtual env, type hints, pytest |
| `package.json`, `tsconfig.json` | TypeScript | Strict types, incremental builds |
| Mixed or unclear | Generic | Language-agnostic patterns |

**Tip:** Mention your language if detection is ambiguous:
```
@codebase Using TypeScript with React, create...
```

---

## Agent Handoffs

Agents can hand off to each other seamlessly:

```
@codebase (implement)
  ↓ handoff
@review (audit)
  ↓ handoff
@docs (document)
```

Each handoff includes context, so the next agent understands the full picture.

---

## Context Persistence

Agents automatically save important decisions to `.github/copilot-instructions.md`:

- Architectural patterns established
- Coding standards developed
- Project-specific conventions
- Technical constraints

This context is reused in all future sessions!

---

## Next Steps

- **[Deep Dive: @orchestrator](./orchestrator.md)** - Master planning and execution workflows
- **[Deep Dive: @codebase](./codebase.md)** - Multi-language development
- **[View Workflows](../workflows.md)** - Real-world examples
- **[Reference: Tools & Capabilities](../reference/README.md)** - What each agent can do
