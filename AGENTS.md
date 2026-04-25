# OpenCode Agents Repository

This repository contains customized agents for OpenCode.ai, aligned with Anthropic's skills framework.

## Project Structure

- `.opencode/agents/` - Custom agent configurations for OpenCode (canonical path)
- `docs/` - Documentation for agents and usage
- `AGENTS.md` - This file with project instructions

## Language & Domain Skills

Language-specific rules are loaded on-demand via skills (not eagerly). Available skills:
`dotnet`, `python`, `typescript`, `flutter`, `go`, `java-spring`, `node-express`, `react-next`, `ux-responsive`, `ruby-rails`, `rust`, `sql-migrations`, `blogger`, `brutal-critic`

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

### 2026-04-25 12:51 - State contract and handoff packet workflow

**Agent:** orchestrator
**Summary:** Coordinated a state-management uplift to introduce structured working memory and deterministic handoff generation, then wired both into CI/doctor quality gates.
- Added canonical session state contract (`state/session-state.json`) plus validator/test coverage (`validate-session-state.js`, `validate-session-state.test.js`) and local npm entrypoint (`validate:session`).
- Added handoff generator/test coverage (`generate-handoff.js`, `generate-handoff.test.js`) with default output `handoff/latest.md` and local npm entrypoint (`handoff:generate`).
- Integrated new CI gate (`validate-session-state`) to validate state, generate handoff output, and upload handoff artifact; propagated status into validation summary fail conditions.
- Documentation integration pattern used: add dedicated `docs/state-management.md`, then link from docs index/README and extend compatibility matrix before full doctor/lint validation.

### 2026-04-25 12:42 - Governance uplift: eval trend artifacts and migration policy

**Agent:** orchestrator
**Summary:** Coordinated a governance-focused follow-up to improve evaluation observability and formalize contract-change handling for agent/command evolution.
- Added eval artifact workflow outputs by generating `evals/reports/latest.json` + `evals/reports/trend-summary.md` and uploading both in CI (`validate-agent-evals`).
- Introduced baseline-vs-current trend comparator (`scripts/compare-eval-trend.js`) and seeded baseline fixture (`evals/fixtures/eval-trend-baseline.json`) for lightweight drift tracking.
- Published `docs/deprecation-migration.md` with Level A/B/C change taxonomy, migration playbook, and required PR checklist for breaking/soft-deprecation flows.
- Documentation alignment pattern used: wire scripts/workflows first, then update docs index + eval/compatibility pages + README links, followed by full doctor/lint validation.

### 2026-04-25 12:32 - Roadmap closure: risk gating, changelog labels, and fixture hardening

**Agent:** orchestrator
**Summary:** Coordinated final roadmap completion by splitting work into cleanup + enforcement + fixture hardening phases, then validating each phase through doctor/CI-aligned checks.
- Phase sequence used: decouple docs-link validator policy logic, implement risk-scored PR gate (`validate-risk-path`), enforce changelog capability labels (`validate-changelog`), then expand golden fixtures under `scripts/fixtures/`.
- Workflow pattern that worked: small scoped commits per initiative (S11, S6, S2) with full validation after each step to keep failures localized and rollback simple.
- CI governance strengthened by adding two explicit gates (`validate-risk-path`, `validate-changelog`) and wiring both into validation summary fail conditions.
- Reliability lesson: keep negative test fixtures outside default docs crawl scope (exclude `scripts/fixtures`) so intentional broken-link fixtures do not pollute repository-wide docs validation.

### 2026-04-25 05:45 - Canonical agents migration and permission-first tightening

**Agent:** orchestrator
**Summary:** Coordinated a migration/tightening pass to standardize on `.opencode/agents/`, remove deprecated agent tool booleans, and harden CI security pinning while preserving migration tolerance.
- Migrated all agent files from `.opencode/agent/` to `.opencode/agents/` and updated installer/validator paths with legacy fallback signaling.
- Converted all agent frontmatters to permission-first controls (`"*": "deny"` baselines + scoped allows), removing deprecated `tools` blocks.
- Tightened orchestrator task delegation from wildcard allow to explicit subagent allowlist.
- Pinned gitleaks workflow action to latest stable SHA (`v2.3.9`) and refreshed docs/changelog path references.
- Cleanup pattern that worked: migrate structure first, refactor policy surface second, then run full doctor + agent validation to confirm parity.

### 2026-04-25 05:05 - Bounded loop workflow and doctor-based validation hardening

**Agent:** orchestrator
**Summary:** Coordinated a reliability-focused execution pass to add bounded loop guidance, tighten validation ergonomics, and keep docs aligned with new workflow commands.
- Added loop execution protocol and commands (`/execution-loop`, `/stop-loop`) plus agent-level loop/verification guidance.
- Introduced `scripts/doctor.js` as the unified validation entrypoint and routed `validate:all` through doctor.
- Hardened validation signal quality by excluding `example/**` from markdown/docs validation paths and fixing Windows npm spawn behavior in doctor.
- Strengthened CI summary gating by adding secret scanning (`gitleaks`) into workflow dependencies.
- Coordination pattern that worked: implement protocol + docs together, run end-to-end validation, then isolate untracked fixture content from quality gates.

### 2026-03-13 12:22 - Docs clarity pass for naming, uninstall behavior, and skill-policy wording

**Agent:** orchestrator
**Summary:** Coordinated a focused docs consistency sweep across README and docs pages to reduce install/uninstall ambiguity while preserving core-skill governance.
- Clarified command naming consistently (`agents-opencode` installer/package vs `opencode` runtime CLI) in README + getting-started + docs index.
- Verified uninstall behavior from `install.js` and documented current-directory scope, `.opencode/` + `opencode.json` removal, and timestamped `AGENTS.md` backup.
- Harmonized policy headers by renaming `Skill Scope Policy (Current/Keep it)` to `Skill Scope Policy` across key docs while keeping core-only criteria unchanged.
- Coordination pattern that worked: source verification first, then propagate concise wording updates across all relevant docs paths.

### 2026-03-12 09:22 - Package-based installer flow and command routing clarity

**Agent:** orchestrator
**Summary:** Coordinated a cross-cutting cleanup to make installs deterministic from npm artifacts and improve command-to-agent usability/documentation consistency.
- Updated installer + package metadata to remove git clone dependency and install from published package contents.
- Added argument-hint conventions and `$ARGUMENTS` scoping across commands, then synchronized README/docs/skills routing matrix.
- Strengthened validation with command frontmatter + agent-target checks to catch routing/config drift early.
- Coordination pattern that worked: implement core behavior, propagate docs/metadata in one sweep, then validate and prepare release-ready commit.

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
