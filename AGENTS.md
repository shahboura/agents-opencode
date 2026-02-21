# OpenCode Agents Repository

This repository contains customized agents for OpenCode.ai, aligned with Anthropic's skills framework.

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

### Flutter/Dart Projects

- Use Riverpod for state management
- Feature-based architecture with clean separation
- Immutable data models with freezed
- Result pattern for error handling
- Provider pattern for dependency injection
- Widget testing for all UI components

## Agent Usage

Primary agents:

- `codebase` - Multi-language development with profile detection
- `orchestrator` - Strategic planning and complex workflow coordination
- `blogger` - Content creation for blogging, podcasting, and YouTube scripting
- `brutal-critic` - Ruthless content reviewer with framework-based criticism
- `em-advisor` - Engineering management guidance

Subagents:

- `docs` - Documentation creation and maintenance
- `review` - Code review for security, performance, and best practices

## Quality Requirements

All code changes must:

- Pass type checking (mypy, tsc --noEmit, flutter analyze)
- Pass linting (ruff, eslint, dart format)
- Pass all tests
- Follow language-specific conventions
- Include proper documentation

### Documentation Standards

All documentation changes must:

- Pass markdown linting (`npm run lint:md`)
- Have valid internal/external links (`npm run validate:docs`)
- Run validation before committing changes

<!-- Session history managed by OpenCode's built-in memory. Only significant milestones logged here. -->

## Milestones

### 2026-02-21 - Context optimization, commands migration, and installer modernization

- Reduced per-session context by ~70%: removed eager instruction loading (~73 KB), de-duplicated agents, pruned AGENTS.md
- Migrated 9 prompts → commands (`.opencode/commands/`), renamed examples to match
- Replaced 3 PowerShell scripts with Node.js validators; added `npx`, `--update`, `--languages` to installer
- Stripped non-functional `applyTo` frontmatter from 14 instruction files
- Migrated to OpenCode's native memory for session recall

### 2026-02-18 - Trim docs site and audit dependencies

- Ran npm audit fix, trimmed docs to lean set
- Removed nonessential docs pages; kept core onboarding, agents, prompts, standards

### 2026-02-18 - Implement lazy AGENTS.md policy and skills

- Shifted AGENTS.md creation to first run (/init); added three focused skills
- Updated agent context guidance to handle missing AGENTS.md

### 2025-12-24 - Update global config location to match OpenCode standards

- Modified getGlobalConfigDir() to use ~/.config/opencode/ on all platforms
- Updated README.md and install.js help text

### 2025-12-23 - Initial repository setup and migration from Copilot

- Migrated from .github/Copilot to .opencode/OpenCode format
- Created 8 agents, 14 instruction files, 8 prompts, CI/CD workflow
- Committed 54 files; full validation suite passed
