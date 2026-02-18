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

## Output expectations
- Provide a short checklist of issues
- Include exact files/paths to fix
- Suggest validation commands when available
