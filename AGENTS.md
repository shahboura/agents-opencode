# OpenCode Agents Repository

This repository contains customized agents for OpenCode.ai, adapted from GitHub Copilot agents and aligned with Anthropic's skills framework.

## Project Structure

- `.opencode/agent/` - Custom agent configurations for OpenCode
- `docs/` - Documentation for agents and usage
- `AGENTS.md` - This file with project instructions

## Language-Specific Instructions

### .NET/C# Projects
Apply Clean Architecture principles:
- Follow dependency rules: Domain → Application → Infrastructure → WebAPI
- Use async/await with CancellationToken
- Enable nullable reference types
- Constructor injection for dependencies
- Entity Framework with IEntityTypeConfiguration

### Python Projects
- Always use type hints on function signatures
- Use context managers for resource management
- Prefer list comprehensions over loops
- Async/await for I/O operations
- Google-style docstrings for public APIs

### TypeScript Projects
- Enable strict mode in tsconfig.json
- Explicit types, no implicit any
- Strict null checks with optional chaining
- Generics for reusable code
- Utility types (Pick, Omit, Partial, etc.)

## Agent Usage

Primary agents:
- `codebase` - Multi-language development with profile detection
- `orchestrator` - Strategic planning and complex workflow coordination

Subagents:
- `docs` - Documentation creation and maintenance
- `review` - Code review for security, performance, and best practices
- `em-advisor` - Engineering management guidance

## Quality Requirements

All code changes must:
- Pass type checking (mypy, tsc --noEmit)
- Pass linting (ruff, eslint)
- Pass all tests
- Follow language-specific conventions
- Include proper documentation