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
- Use `async/await` for I/O-bound operations where async libraries are available; prefer `asyncio.TaskGroup` (3.11+) for structured concurrency
- Prefer typed data models (`@dataclass`, Pydantic models, or `TypedDict`) as appropriate for domain boundaries
- Import order: standard library → third-party → local application (blank line between groups)
- Use `pathlib.Path` over `os.path` for file operations
- Prefer `Optional[T]` (or `T | None` on 3.10+) — never leave nullable returns untyped
- Custom context managers via `@contextmanager` for resource lifecycle patterns
- Use `pytest` fixtures with type annotations; for async tests, use the project's async test setup (for example `@pytest.mark.asyncio` with `pytest-asyncio`)
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Naming Conventions
- `snake_case` for functions/variables/modules
- `PascalCase` for classes and exceptions
- `UPPER_SNAKE_CASE` for constants
- Prefix internal helpers with `_` when they are not part of public API

## Common Pitfalls
- Unannotated public APIs that silently degrade type safety
- Resource leaks from missing context managers (`with`)
- Overusing broad `except Exception` without preserving context
- Async functions called without awaiting in tests or orchestration logic

## Example Patterns
```python
from dataclasses import dataclass
from pathlib import Path

@dataclass
class User:
    id: int
    email: str

def load_email(path: Path) -> str:
    with path.open("r", encoding="utf-8") as handle:
        return handle.read().strip()
```

## Validation Commands
Prefer project scripts when present; use defaults below otherwise.

```bash
ruff check .
ruff format .
mypy .
pytest
```
