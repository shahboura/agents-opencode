# OpenCode Agents Repository

This repository contains customized agents for OpenCode.ai, aligned with Anthropic's skills framework.

## Project Structure

- `.opencode/agent/` - Custom agent configurations for OpenCode
- `docs/` - Documentation for agents and usage
- `AGENTS.md` - This file with project instructions

## Language & Domain Skills

Language-specific rules are loaded on-demand via skills (not eagerly). Available skills:
`dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ruby-rails`, `rust`, `sql-migrations`, `blogger`, `brutal-critic`

Utility skills: `project-bootstrap`, `docs-validation`, `agent-diagnostics`

Load a skill with the `skill` tool when working on a specific language or domain.

### Skill Activation Policy (OpenCode)

- Skills are loaded on demand; do not preload unrelated skills.
- Prefer 1 relevant skill per task/phase; load a second only for clear cross-domain dependencies.
- If stack/domain is unclear, ask for clarification before loading a skill.
- Keep skills scoped to active work to minimize context impact.

### Skill Verification Checklist

- [ ] Agent has `skill: true` only when needed by its role
- [ ] Agent guidance explains *when* to load skills (not just that it can)
- [ ] Agent `permission.skill` uses deny-by-default + explicit allowlist
- [ ] On-demand behavior is documented in user-facing docs
- [ ] Validation scripts and CI run agent/doc checks on each PR

## Agent Usage

Primary agents:

- `codebase` - Multi-language development with profile detection
- `orchestrator` - Strategic planning and complex workflow coordination
- `planner` - Read-only analysis and implementation planning
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

<!-- Session history managed by OpenCode's built-in memory. Only significant milestones logged here. Auto-prunes at 100KB. -->

## Milestones

### 2026-03-09 21:54 - Core-only skill policy propagation across docs

**Agent:** orchestrator
**Summary:** Coordinated a repository-wide documentation consistency pass to keep skill distribution explicitly core-only and avoid optional-pack ambiguity.
- Propagated core-only policy language across README and key docs pages (index, getting-started, customization, commands, agents, instructions, troubleshooting, skills matrix).
- Applied a conservative governance gate for future skill additions (demand, gap, ownership, licensing/provenance).
- Validated integration with `npm run validate:all` to ensure links, markdown linting, agent validation, and context checks remained green.
- Workflow pattern that worked: plan policy once, propagate to all user-facing docs, then run full validation before closing.

### 2026-03-09 00:00 - Skill activation hardening and validation updates

- Added explicit "Skill Activation Policy" sections across all 8 agents with on-demand guardrails
- Added validator warning for agents missing `## Skill Activation Policy` when `skill: true` is enabled
- Updated docs to clarify lazy/on-demand skill loading and OpenCode-specific invocation model
- Kept `validate.yml` as a split validation matrix and reused `npm run validate:all` in publish gating

### 2026-03-04 - Audit-driven fixes: factual errors, stale refs, CI hardening

- Fixed 3 factual errors in skills: Rust Go-isms (`fmt::Errorf`, goroutine), Java-Spring .NET annotation (`@ProducesResponseType`)
- Fixed stale tool references in blogger instructions (`websearch`/`codesearch` → `webfetch`/`grep`)
- Removed redundant `black .` from Python skill and instruction (superseded by `ruff format`)
- Updated GitHub Actions: `checkout` v4.2.2→v6.0.2, `setup-node` v4.1.0→v6.3.0, added `persist-credentials: false`
- Fixed AGENTS.md prune threshold comment (50KB → 100KB to match `check-context-size.js`)
- Renamed default branch from `master` to `main` (aligns with workflow triggers)

### 2026-03-04 - OpenCode platform-specific agent optimization (8 phases)

- Enhanced `opencode.json` with global permissions (`external_directory`, `doom_loop` deny) and instruction glob loading
- Added `skill` tool to all 8 agents (closing critical gap — 3 skills existed but no agent could load them)
- Added `todowrite`/`todoread` to 5 workflow agents (codebase, orchestrator, planner, em-advisor, blogger)
- Added `steps` limits to all agents (10–75 based on role), `hidden: true` to brutal-critic
- Added `task` permission controls with agent-specific glob restrictions (e.g., blogger → brutal-critic only)
- Hardened bash permissions: denied `rm -rf *` and `git push --force*` on all bash-enabled agents
- Extended context persistence (AGENTS.md pattern) to orchestrator and codebase agents
- Added `subtask: true` to all 12 commands; created 3 new commands (`/blog-post`, `/content-review`, `/plan-project`)
- Updated orchestrator Agent Selection Guide to include blogger and brutal-critic
- Added `webfetch` to review agent; fixed blogger references from websearch/codesearch to webfetch/grep

### 2026-03-04 - Comprehensive repository optimization (6 phases)

- Enhanced em-advisor agent with file operations, PDF analysis, and context persistence
- Hardened CI/CD: SHA-pinned actions, timeouts, concurrency, push trigger, shell injection fix
- Fixed factual inaccuracies (package.json "15+" → "14", instructions.md missing rows, validate-agents.js warning)
- Standardized all 8 agent configs: alphabetical tool order, correct permissions, removed non-existent tools
- Improved scripts: --check flag for CI, showUsage exit code, filterLanguages edge case, backup logic, regex anchoring
- Documentation: sequential nav_order, dark-theme SCSS, SEO descriptions, expanded troubleshooting, skill usage docs

### 2026-02-21 - Context optimization, commands migration, and installer modernization

- Reduced per-session context by ~70%; migrated 9 prompts to commands; modernized installer

### 2025-12 to 2026-02 - Foundation

- Initial repository setup; migration from Copilot; created 8 agents, 14 instruction files
- Lazy AGENTS.md policy; docs site trimming; global config standardization
