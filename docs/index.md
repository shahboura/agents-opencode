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

## Agents

- **@orchestrator** - Strategic planning and multi-phase workflow coordination
- **@planner** - Read-only analysis and detailed implementation planning (no code changes)
- **@codebase** - Multi-language code implementation
- **@blogger** - Content creation for blogging, podcasting, and YouTube scripting
- **@brutal-critic** - Ruthless content reviewer with framework-based criticism
- **@em-advisor** - Leadership and strategy guidance
- **@docs** - Documentation creation
- **@review** - Security and quality audits

## Reusable Prompts

8 structured templates for common tasks:

- Documentation: API docs, README generation, ADRs
- Quality: Code review, security audit, test generation
- Development: Refactoring plans
- Management: 1-on-1 preparation

[View all prompts](prompts.md)

## Quick Start

1. Install agents: Copy `.opencode/agent/` to your project
2. Use in OpenCode: `@orchestrator Build a user API`
3. Agents plan, seek approval, then implement

## Features

- Plan-first workflow with approval steps
- Multi-language support (.NET, Python, TypeScript, Flutter)
- Auto-applied coding standards
- Agent handoffs and context persistence

## Installation

```bash
# Copy to your project
cp -r .opencode/agent/ your-project/.opencode/agent/
```

## Documentation

- [Getting Started](getting-started.md)
- [Agent Details](agents/README.md)
- [Workflows](workflows.md)
- [Agent Collaboration](collaboration.md)
- [Performance Metrics](performance-metrics.md)
- [Troubleshooting](troubleshooting.md)
