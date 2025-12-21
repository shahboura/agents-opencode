# Agents

Seven specialized agents for development and content creation tasks.

## Agent Overview

| Agent | Type | Purpose | Use For |
|-------|------|---------|---------|
| @orchestrator | Primary | Planning & coordination | Complex projects, risk assessment |
| @codebase | Primary | Code implementation | Features, bug fixes |
| @blogger | Primary | Content creation | Tech/finance/leadership blogging, podcasting, YouTube scripting |
| @brutal-critic | Primary | Content review | Honest feedback, framework validation, quality assessment |
| @em-advisor | Primary | Leadership guidance | Strategy, team dynamics |
| @review | Subagent | Quality audits | Security, performance, best practices |
| @docs | Subagent | Documentation | README, API docs |

## When to Use Each Agent

- **Planning**: @orchestrator (read-only mode)
- **Implementation**: @codebase
- **Quality Check**: @review
- **Documentation**: @docs
- **Leadership**: @em-advisor
- **Content Creation**: @blogger
- **Content Review**: @brutal-critic

## Workflow

1. Plan with @orchestrator
2. Implement with @codebase
3. Review with @review
4. Document with @docs
5. Create content with @blogger (optional)
6. Review content with @brutal-critic (optional)

## Capabilities

- **Read**: All agents can read code and docs
- **Edit**: @codebase, @orchestrator, @docs
- **Execute**: @codebase, @orchestrator
- **Search**: All agents can search codebase
