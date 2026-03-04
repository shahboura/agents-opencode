---
name: python
description: Python best practices with type hints, structure, and testing conventions
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce type hints and docstring standards on all Python code
- Guide proper async patterns, resource management, and error handling
- Apply naming conventions and import organization rules

## When to use me
Use this when working on Python projects that require strict typing and code quality standards.

## Key Rules
- Type hints are REQUIRED on ALL function signatures — no exceptions
- Use Google-style docstrings for all public APIs (Args, Returns, Raises sections)
- Always use context managers (`with`) for file handles, DB sessions, and resources
- Prefer list/dict comprehensions over equivalent for-loops
- Use `async/await` for all I/O-bound operations; use `asyncio.gather` for concurrency
- Use `@dataclass` for data models; avoid plain classes for pure data
- Import order: standard library → third-party → local application (blank line between groups)
- Naming: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants, `_leading_underscore` for private
- Use `pathlib.Path` over `os.path` for file operations
- Prefer `Optional[T]` (or `T | None` on 3.10+) — never leave nullable returns untyped
- Custom context managers via `@contextmanager` for resource lifecycle patterns
- Use `pytest` fixtures with type annotations; mark async tests with `@pytest.mark.asyncio`

## Validation Commands
```bash
ruff check .
ruff format .
mypy .
pytest
```
