---
layout: default
title: Home
nav_order: 1
permalink: /
description: Specialized OpenCode agents for intelligent development workflows with multi-language support, auto-applied coding standards, and plan-first execution.
keywords: opencode, ai agents, code generation, development workflow, .NET, Python, TypeScript, Flutter, code review, documentation
---

# OpenCode Agents

Specialized agents for intelligent development workflows.

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

## Reusable Prompts

9 structured templates for common tasks:

- Documentation: API docs, README generation, ADRs
- Quality: Code review, security audit, test generation
- Development: Refactoring plans
- Management: 1-on-1 preparation

[View all prompts](prompts.md)

## Quick Start

1. Install agents: Copy `.opencode/agent/` to your project
2. Use in OpenCode: `@orchestrator Build a user API`
3. Agents plan, seek approval, then implement

## 🎯 Auto-Applied Coding Standards

No configuration needed. When you edit files, standards activate automatically:

| Pattern | Standards Applied |
|---------|-------------------|
| `.cs` / `.csproj` | .NET Clean Architecture, async/await, nullable types |
| `.py` | Python type hints, pytest, black formatting |
| `.ts` / `.tsx` | TypeScript strict mode, null safety |
| `.dart` | Flutter Riverpod, freezed models, widget testing |
| `.go` | Go modules, testing, concurrency patterns |
| `.js` / `.ts` | Node.js Express, security middleware, async handling |
| `.jsx` / `.tsx` | React Next.js, accessibility, performance |
| `.sql` | SQL migrations, safety, data quality |
| `.md` / `.mdx` | Content creation standards, research validation |

**[View All Standards](instructions.md)**

## Features

- Plan-first workflow with approval steps
- Multi-language support (.NET, Python, TypeScript, Flutter)
- Auto-applied coding standards
- Agent handoffs and context persistence

## Installation

```bash
# Copy to your project
cp -r .opencode/ your-project/.opencode/
cp opencode.json your-project/
```

## Documentation

- [Getting Started](getting-started.md)
- [Agent Details](agents/README.md)
- [Workflows](workflows.md)
- [Agent Collaboration](collaboration.md)
- [Performance Metrics](performance-metrics.md)
- [Troubleshooting](troubleshooting.md)
