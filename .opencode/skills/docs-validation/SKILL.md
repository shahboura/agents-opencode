---
name: docs-validation
description: Run documentation quality checks and link validation guidance
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: documentation
---

## What I do
- Outline required docs validation steps
- Emphasize markdown lint and link checks
- Highlight common docs issues (broken links, duplicate headings)

## When to use me
Use this before merging documentation changes.

## Key Rules
- Run markdown linting before committing docs changes
- Validate internal and external links
- Check for duplicate headings within the same file
- Ensure proper heading hierarchy (single H1, sequential H2/H3)
- Keep it concise and action-oriented
- Keep skill distribution statements consistent with repository policy (currently core-only)
- Ensure skill names listed in docs match `.opencode/skills/*/SKILL.md` exactly

## Validation Commands
```bash
npm run lint:md
npm run validate:docs
```
