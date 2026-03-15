---
description: Python best practices with type hints and testing conventions
---

# Python Instructions

## Skill-First Runtime
- For Python implementation and review work, load the `python` skill on demand.
- Keep this file as a concise reference layer; use the skill as canonical runtime guidance.

## Core Guardrails
- Require explicit typing on public APIs and maintain type-safe interfaces.
- Prefer small, cohesive functions and explicit error handling.
- Use context managers for resources and deterministic cleanup.
- Keep imports organized (stdlib → third-party → local).
- Preserve backward-compatible behavior unless change is explicitly required.

## Testing & Quality
- Cover success + failure paths; include regression tests for bug fixes.
- Prefer deterministic tests (no real network calls in unit tests).
- Keep lint/type/test checks green before completion.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
ruff check .
ruff format .
mypy .
pytest
```
