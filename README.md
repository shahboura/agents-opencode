# OpenCode Agents

[![Validate Agents & Documentation](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml/badge.svg)](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml)
[![npm version](https://img.shields.io/npm/v/agents-opencode)](https://www.npmjs.com/package/agents-opencode)
[![Socket Badge](https://badge.socket.dev/npm/package/agents-opencode)](https://socket.dev/npm/package/agents-opencode)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://shahboura.github.io/agents-opencode/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**9 specialized agents, 23 on-demand skills, production-ready workflows.**
Install once, get 97% context cache hits — sessions start near-instantly and cost ~20× less.

Also available for Claude Code — see [Installation](#installation).

## Efficiency

OpenCode's context caching dramatically reduces token consumption across sessions.
The following metrics are from production usage (May–July 2026) with the
`deepseek-v4-pro` model.

| Metric | May 2026 | June 2026 | July 2026 | Combined |
|---|---|---|---|---|
| Cache Hit Tokens | 263.3M | 21.9M | 145.0M | 430.2M |
| Cache Miss Tokens | 7.9M | 1.3M | 2.7M | 11.9M |
| Output Tokens | 0.8M | 0.2M | 0.5M | 1.5M |
| Total Requests | 1,407 | 380 | 1,016 | 2,803 |
| **Cache Hit Rate** | **97.1%** | **94.5%** | **98.2%** | **97.3%** |
| Avg Tokens/Request | 193K | 62K | 146K | 158K |

Key takeaway: persistent context reuse keeps ~97% of input tokens in cache,
avoiding costly re-processing across agent sessions. Cache-hit tokens cost
~120× less than cache-miss tokens, translating to substantial efficiency
gains for long-running multi-agent workflows.

## Quick Start

**Requires:** Node.js

```bash
npx agents-opencode --global
```

<details><summary>More install options (filter, update, uninstall, status)</summary>

```bash
# Filter language references for a lighter install
npx agents-opencode --global --languages python,typescript

# Update existing installation
npx agents-opencode --update

# Uninstall
npx agents-opencode --uninstall

# Check detected installation scopes
npx agents-opencode --status
```

**Install:** npm package and installer command: `agents-opencode`. OpenCode CLI runtime command: `opencode`.

**Uninstall:** targets current project by default; use `--global` or `--all` for
explicit scope. Creates timestamped backups before removal.

**Update:** auto-detects installed scopes; use `--all`, `--global`, or
`--project [dir]` for explicit scope.

**Config:** installer merges only missing global permission defaults into
`opencode.json`. Existing provider/model/instructions settings are preserved.

</details>

Then run:

```bash
opencode              # start the TUI
/init                 # initialize a new session
@orchestrator Build a REST API with JWT auth
```

The orchestrator plans, delegates to @codebase for implementation,
@review for quality checks, and @docs for documentation — all in one session.

## Agents

| Agent | Best For |
|---|---|
| `@orchestrator` | End-to-end features: plans, delegates to specialists, validates results |
| `@codebase` | Write code across 10+ languages with auto-detected project conventions |
| `@planner` | Architecture reviews, risk assessment, step-by-step implementation plans |
| `@review` | Catch bugs, security holes, and perf issues before they ship |
| `@docs` | READMEs, API docs, ADRs, wiki pages |
| `@blogger` | Blog posts, YouTube scripts, podcast outlines, resumes, LinkedIn profiles |
| `@brutal-critic` | Ruthless content QA against proven frameworks with actionable scores |
| `@em-advisor` | 1-on-1 prep, team strategy, roadmap planning |
| `@legal-advisor` | License auditing, compliance checks, IP review, export controls |

Canonical source for exact allowlists and skill triggers: [Skills Matrix](./docs/skills-matrix.md)

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

## Why this pack

- **Fast onboarding:** install in minutes with `npx`.
- **Clear execution flow:** plan, implement, review, and document with purpose-built agents.
- **Safer defaults:** on-demand skills + deny-by-default skill permissions.
- **Operationally ready:** built-in validation and release automation.

## Skill Loading (OpenCode)

Skills load on demand via the `skill` tool — no context cost until you use them.
Use one relevant skill per task/phase; add another only for clear cross-domain work.

Instruction files live in `.opencode/instructions/`, skill packs in `.opencode/skills/<name>/SKILL.md`.
Scope remains core-only; additions pass demand, clear-gap, ownership, and licensing/provenance checks.

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

Start with `"*": "deny"`, add explicit allows. Rules match in order — last match wins.

</details>

## Installation

### npx (Recommended)

```bash
npx agents-opencode --global
```

### Claude Code Plugin

```bash
# Add marketplace (one-time)
/plugin marketplace add shahboura/agents-opencode-claude

# Install
/plugin install agents-opencode@shahboura

# Update
/plugin update agents-opencode@shahboura
```

Gives Claude Code access to the same 23 on-demand skills. Skills load only when
invoked — no context cost until you use them. See [adapters/claude-code/](./adapters/claude-code/)
for the plugin manifest and generator script.

## Validation

Run `npm run doctor` for the complete local validation suite (agent contracts,
markdown linting, docs links, session state, eval trends, and more).
For full check mapping (local commands ↔ CI gates), see **[Compatibility](./docs/compatibility.md)**.

Agent evals: `npm run eval:agents` runs deterministic contract checks for agent
and command metadata. `npm run eval:agents:json` writes machine-readable output.

## Docs

- **[Getting Started](./docs/getting-started.md)**
- **[Approval Gates](./docs/approval-gates.md)**
- **[Compatibility](./docs/compatibility.md)**
- **[Deprecation & Migration Policy](./docs/deprecation-migration.md)**
- **[State Management](./docs/state-management.md)**
- **[Full Documentation](https://shahboura.github.io/agents-opencode/)**
