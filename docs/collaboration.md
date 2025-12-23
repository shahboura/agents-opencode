---
layout: default
title: Agent Collaboration
nav_order: 9
---

# Agent Collaboration Patterns

Effective handoffs and coordination between agents.

## Common Handoff Patterns

- Planning → Implementation → Review → Docs
- Implementation ↔ Review (tight loop for quality)
- Orchestrator → Specialized agents (multi-phase projects)

## Playbooks

### Secure Feature Delivery

1. Plan with threat model (@orchestrator)
2. Implement minimal slice (@codebase)
3. Security review (@review)
4. Fix + harden (@codebase)
5. Document (@docs)

### Hotfix Flow

1. Reproduce + isolate (@codebase)
2. Risk assessment (@orchestrator)
3. Patch + tests (@codebase)
4. Postmortem notes (@docs)

## Decision Tree (Agent Selection)

- Need a plan? → @orchestrator
- Writing code? → @codebase
- Security/quality? → @review
- Documentation? → @docs
- Leadership or team topics? → @em-advisor
- Content creation? → @blogger
- Content critique? → @brutal-critic

## Tips

- Keep context updated in AGENTS.md
- Approve plans before execution
- Prefer small, iterative handoffs
