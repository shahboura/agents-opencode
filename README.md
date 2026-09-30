# OpenCode Agents

[![Validate Agents & Documentation](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml/badge.svg)](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml)
[![npm version](https://img.shields.io/npm/v/agents-opencode)](https://www.npmjs.com/package/agents-opencode)
[![Socket Badge](https://badge.socket.dev/npm/package/agents-opencode)](https://socket.dev/npm/package/agents-opencode)
[![Documentation](https://img.shields.io/badge/docs-Cloudflare%20Workers-blue)](https://agnts.elkodr.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Ten specialist agents. 24 on-demand skills. One install.**

Turn a single prompt into a full delivery loop — plan → implement → review → document —
without leaving the terminal you already use. Built for [OpenCode](https://opencode.ai).
Already on Claude Code? The same 24 skills ship as a [plugin](./adapters/claude-code/).

## Why this pack is different

- **One prompt, four disciplines.** `@orchestrator` scopes the work, then hands off to
  `@codebase` for implementation, `@review` for quality, and `@docs` for documentation — in one session.
- **Skills that don't tax context.** All 24 skills load only when invoked, so an idle skill costs nothing.
- **Least privilege by default.** Every agent starts at `"*": "deny"` and grants narrow allows for
  the tools and skills it actually needs.
- **Verified, not vibes.** Agent contracts, command matrices, docs links, and plugin guards are
  checked in CI on every change.

## Quick Start

**Requires:** Node.js (current LTS).

```bash
npx agents-opencode --global      # install into your global OpenCode config
opencode                          # start the TUI
/init                             # initialize a new session
@orchestrator Build a REST API with JWT auth
```

That last line triggers the orchestrator: it plans the work, delegates implementation to
`@codebase`, quality checks to `@review`, and documentation to `@docs` — all in one session.

<details><summary>Install options (filter, update, uninstall, status)</summary>

```bash
# Lighter install: keep only selected language skills
npx agents-opencode --global --languages python,typescript

# Update an existing install (auto-detects scope; --all, --global, or --project [dir] to be explicit)
npx agents-opencode --update

# Uninstall (current project by default; --global or --all for explicit scope)
npx agents-opencode --uninstall

# Show detected installation scopes
npx agents-opencode --status
```

`--languages` prunes non-requested **language skill directories** only — shared workflow skills always stay.

**Install:** npm package and installer command: `agents-opencode`. OpenCode runtime command: `opencode`.
**Uninstall:** targets the current project by default; timestamped backups are created before removal.
**Config:** the installer only manages `$schema`, `plugin`, and missing permission defaults in
`opencode.json`. It never rewrites your provider, model, instructions, share, or compaction settings.

</details>

## A session, end to end

`@orchestrator` coordinates instead of just answering:

1. **Plan** — breaks the request into phases and surfaces risks.
2. **Implement** — delegates build work to `@codebase`, which follows your repo's conventions.
3. **Review** — `@review` checks for bugs, security holes, and performance regressions before you ship.
4. **Document** — `@docs` writes the README, API reference, and ADRs to match.

You approve the checkpoints; the specialists handle the handoffs.

## Agents

Ten agents ship in the pack: **seven delegation targets** that the orchestrator calls, and
**three primary agents** you run directly.

| Agent | Type | Best for |
|---|---|---|
| `@orchestrator` | Primary | End-to-end features: plans, delegates to specialists, validates results |
| `@codebase` | Delegation target | Code across 10+ languages with auto-detected project conventions |
| `@planner` | Delegation target | Architecture reviews, risk assessment, step-by-step plans |
| `@review` | Delegation target | Bugs, security holes, and perf issues before they ship |
| `@researcher` | Delegation target | Grounding high-stakes decisions in current best practice |
| `@docs` | Delegation target | READMEs, API docs, ADRs, wiki pages |
| `@brutal-critic` | Delegation target | Ruthless content QA scored against proven frameworks |
| `@legal-advisor` | Delegation target | License auditing, compliance checks, IP review, export controls |
| `@blogger` | Primary (Tab switch / `@mention`) | Blog posts, YouTube scripts, podcast outlines, resumes, LinkedIn profiles |
| `@em-advisor` | Primary (Tab switch / `@mention`) | 1-on-1 prep, team strategy, roadmap planning |

`@blogger` and `@em-advisor` are **primary agents** — switch to them with Tab or mention them
directly. They are not Task-invocable subagents, so the orchestrator will not delegate to them.

Canonical source for exact allowlists and skill triggers: [Skills Matrix](https://agnts.elkodr.com/skills-matrix/).

## Commands

Type `/command-name` in the TUI to run:

| Command | Description |
|---|---|
| `/code-review` | Comprehensive code review |
| `/security-audit` | Security audit |
| `/generate-tests` | Unit test generation |
| `/refactor-plan` | Refactoring plan |
| `/architecture-review` | Architecture review |
| `/architecture-decision` | ADR creation |
| `/api-docs` | Generate API documentation |
| `/create-readme` | Generate README |
| `/blog-post` | Blog post creation |
| `/content-review` | Content quality scoring |
| `/plan-project` | Multi-phase project planning |
| `/execution-loop` | Bounded iterative execution workflow |
| `/stop-loop` | Stop loop and summarize state |
| `/checkpoint` | Phase-boundary checkpoint for human decision |
| `/1-on-1-prep` | Meeting preparation |
| `/legal-review` | License, compliance, and data-privacy review |

## Skills

24 skills live under `.opencode/skills/`, each defined in a `SKILL.md`:

- **11 language skills** — .NET, Flutter, Go, Java/Spring, Node/Express, Python, React/Next.js,
  Ruby/Rails, Rust, SQL migrations, TypeScript.
- **13 workflow skills** — API docs, ADRs, docs validation, project bootstrap, agent diagnostics,
  refactoring, security audit, code-change impact, UX/responsive, decision grounding, blogging,
  brutal critique, legal compliance.

Skills load on demand via the `skill` tool. Coding standards and language guidance live in these
skills — not in a sprawling instruction directory. A small set of shared reference instructions
stays in `.opencode/instructions/`.

Scope is core-only: additions pass demand, clear-gap, ownership, and licensing/provenance checks.

<details><summary>Permission configuration (least-privilege patterns)</summary>

Skill permissions (prevent unrelated skill loads):

```yaml
permission:
  skill:
    "*": "deny"
    "python": "allow"
    "sql-migrations": "allow"
```

Task permissions (control which subagents each agent can invoke):

```yaml
permission:
  task:
    "*": "deny"
    "explore": "allow"
    "review": "allow"
```

Start with `"*": "deny"`, then add explicit allows. Rules match in order — last match wins.

</details>

## Real-world efficiency

Metrics from production usage (May–July 2026) on the `deepseek-v4-pro` model. Persistent context
reuse keeps the bulk of input tokens cached across agent sessions.

| Metric | May 2026 | June 2026 | July 2026 | Combined |
|---|---|---|---|---|
| Cache Hit Tokens | 263.3M | 21.9M | 145.0M | 430.2M |
| Cache Miss Tokens | 7.9M | 1.3M | 2.7M | 11.9M |
| Output Tokens | 0.8M | 0.2M | 0.5M | 1.5M |
| Total Requests | 1,407 | 380 | 1,016 | 2,803 |
| **Cache Hit Rate** | **97.1%** | **94.4%** | **98.2%** | **97.3%** |
| Avg Tokens/Request | 193K | 62K | 146K | 158K |

Across 2,803 requests, **97.3% of input tokens were served from cache** — less re-processing and
faster session starts. That is the practical payoff of an on-demand skill model.

## Installation

### npx (recommended)

```bash
npx agents-opencode --global
```

Omit `--global` to install into the current project instead.

### Claude Code plugin

```bash
# Add marketplace (one-time)
/plugin marketplace add shahboura/agents-opencode-claude

# Install
/plugin install agents-opencode@shahboura

# Update
/plugin update agents-opencode@shahboura
```

This gives Claude Code access to the same 24 on-demand skills, which load only when invoked —
no context cost until you use them. See [adapters/claude-code/](./adapters/claude-code/) for the
plugin manifest and generator script.

## Validation

Run `npm run doctor` for the complete local validation suite (agent contracts, markdown linting,
docs links, session state, eval trends, and more). For the full check mapping (local commands ↔ CI
gates), see **[Compatibility](https://agnts.elkodr.com/compatibility/)**.

Agent evals: `npm run eval:agents` runs deterministic contract checks for agent and command
metadata. `npm run eval:agents:json` writes machine-readable output.

## Docs

- **[Getting Started](https://agnts.elkodr.com/getting-started/)**
- **[Approval Gates](https://agnts.elkodr.com/approval-gates/)**
- **[Compatibility](https://agnts.elkodr.com/compatibility/)**
- **[Deprecation & Migration Policy](https://agnts.elkodr.com/deprecation-migration/)**
- **[State Management](https://agnts.elkodr.com/state-management/)**
- **[Skills Matrix](https://agnts.elkodr.com/skills-matrix/)**
- **[Decision Grounding](https://agnts.elkodr.com/decision-grounding/)**
- **[Full Documentation](https://agnts.elkodr.com/)**

## License

[MIT](./LICENSE) © 2025–2026 Shehab Elhadidy.

If this pack saves you time, [star the repo](https://github.com/shahboura/agents-opencode) so others can find it.
