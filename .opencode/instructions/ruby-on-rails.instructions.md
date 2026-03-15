---
description: Ruby on Rails best practices with MVC, ActiveRecord, and testing
---

# Ruby on Rails Instructions

## Skill-First Runtime
- For Rails implementation/review work, load the `ruby-rails` skill on demand.
- Keep this file as a concise policy bridge; the skill contains detailed runtime guidance.

## Core Guardrails
- Maintain clean MVC boundaries and thin controllers.
- Move complex domain logic to service/domain objects when needed.
- Keep database interactions explicit and query-efficient.
- Validate inputs at model/contract boundaries.
- Preserve backward-compatible behavior unless migration is explicit.

## Testing & Quality
- Cover models, services, and request/feature flows as applicable.
- Add regression tests for bug fixes and edge cases.
- Keep lint/tests passing before completion.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
rails test  # or project-configured test runner (e.g., rspec)
rubocop
brakeman
bundle audit
```
