---
layout: default
title: Instructions
nav_order: 5
description: Coding standards for 14 languages and frameworks loaded on demand by agents.
---

# Coding Standards

Reference standards for each language. Available as on-demand skills in `.opencode/skills/`
and as detailed reference files in `.opencode/instructions/`.

Agents load the relevant skill automatically when working on matching file types.
Only `ci-cd-hygiene` is loaded globally; all other standards are on-demand.

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
