---
name: agent-diagnostics
description: Validate agent config, instructions, and project setup for common issues
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: troubleshooting
---

## What I do
- Check for missing or mismatched agent files
- Validate instruction file paths and glob coverage
- Flag outdated references in docs (legacy paths)

## When to use me
Use this when agents are not loading, instructions seem ignored, or setup is inconsistent.

## Key Rules
- Verify agent files exist in `.opencode/agent/` for each expected agent
- Check that `opencode.json` instruction globs resolve to actual files
- Confirm skill directories have a `SKILL.md` with valid frontmatter
- Look for stale references to renamed or removed files
- Cross-check AGENTS.md skill/agent lists against actual filesystem
- Enforce current distribution scope: core-only skills (flag docs or guidance that imply optional packs)
- Flag references to non-existent/non-core skills unless explicitly marked as future roadmap

## Validation Commands
```bash
node scripts/validate-agents.js
```
