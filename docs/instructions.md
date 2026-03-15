---
layout: default
title: Instructions
nav_order: 5
description: Coding standards and domain guidance loaded on demand by agents.
---

# Coding Standards

Reference standards for each language. Available as on-demand skills in `.opencode/skills/`
and as detailed reference files in `.opencode/instructions/`.

Agents load relevant skills on demand through the `skill` tool when work clearly
matches a language/domain. Skills are not preloaded eagerly.
Runtime behavior should prefer skills; instruction files remain a static reference layer.

## Skill Activation Policy (OpenCode)

- Load skills on demand only when the task clearly matches a domain.
- Use one relevant skill by default; load a second only for explicit cross-domain dependencies.
- If stack/domain is unclear, clarify before loading.

## Skill Permission Policy

Agents using `skill: true` should define `permission.skill` with least-privilege rules:

- Start with `"*": "deny"`
- Add explicit `"<skill-name>": "allow"` entries
- Use wildcard patterns only when group-level access is required

## Coverage

| Language | Highlights |
|---------|------------|
| .NET (C#) | Clean Architecture, async/await, nullable types |
| Python | Type hints, context managers, pytest |
| TypeScript | Strict mode, null safety |
| Flutter | Riverpod, freezed models, widget testing |
| Go | Modules, context, testing |
| Java | Spring Boot DI, validation, records |
| Node.js | Security middleware, validation, structured logs |
| React | Accessibility, performance, hooks |
| UX Responsive | Breakpoints, reflow, touch/pointer and keyboard accessibility |
| Ruby | MVC, ActiveRecord, RSpec |
| Rust | Ownership, Result/Option, clippy |
| CI/CD | Fail-fast gates, security, caching |
| SQL | Safe migrations, constraints, indexes |
| Blogger | Content style, SEO, research validation |
| Brutal Critic | Framework-based scoring, review process |

## Full References

For detailed standards, open the corresponding file in `.opencode/instructions/`.

## Next Steps

- **[Customization](./customization)**
- **[Agents](./agents/README)**
