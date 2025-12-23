---
layout: default
title: Agents
nav_order: 3
has_children: false
---
# Agents

Eight specialized agents for development and content creation tasks.

## Agent Overview

| Agent | Type | Purpose | Use For |
|-------|------|---------|---------|
| @orchestrator | Primary | Planning & coordination | Complex projects, risk assessment, end-to-end execution |
| @planner | Primary | Read-only planning | Detailed analysis, architecture plans (no code changes) |
| @codebase | Primary | Code implementation | Features, bug fixes, direct implementation |
| @blogger | Primary | Content creation | Tech/finance/leadership blogging, podcasting, YouTube scripting |
| @brutal-critic | Primary | Content review | Honest feedback, framework validation, quality assessment |
| @em-advisor | Primary | Leadership guidance | Strategy, team dynamics, 1-on-1 preparation |
| @review | Subagent | Quality audits | Security, performance, best practices |
| @docs | Subagent | Documentation | README, API docs, guides |

## When to Use Each Agent

- **Strategic Planning**: @orchestrator (can execute plans)
- **Detailed Planning**: @planner (read-only, analysis only)
- **Implementation**: @codebase
- **Quality Check**: @review
- **Documentation**: @docs
- **Leadership**: @em-advisor
- **Content Creation**: @blogger
- **Content Review**: @brutal-critic

## Workflow

1. Analyze with @planner (optional, for complex features)
2. Plan with @orchestrator
3. Implement with @codebase
4. Review with @review
5. Document with @docs
6. Create content with @blogger (optional)
7. Review content with @brutal-critic (optional)

## Capabilities

- **Read**: All agents can read code and docs
- **Edit**: @codebase, @orchestrator, @docs, @blogger
- **Execute**: @codebase, @orchestrator
- **Search**: All agents can search codebase
- **Read-Only**: @planner, @review, @em-advisor, @brutal-critic
