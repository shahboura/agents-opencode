# OpenCode Agents

[![Validate Agents & Documentation](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml/badge.svg)](https://github.com/shahboura/agents-opencode/actions/workflows/validate.yml)
[![npm version](https://img.shields.io/npm/v/agents-opencode)](https://www.npmjs.com/package/agents-opencode)
[![Socket Badge](https://badge.socket.dev/npm/package/agents-opencode)](https://socket.dev/npm/package/agents-opencode)
[![Documentation](https://img.shields.io/badge/docs-Cloudflare%20Workers-blue)](https://agnts.elkodr.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Ten specialist agents. 29 on-demand skills. One install.**

Turn a single prompt into a full delivery loop — plan → implement → review → document —
without leaving the terminal you already use. Built for [OpenCode](https://opencode.ai).
Already on Claude Code? The same 29 skills ship as a [plugin](./adapters/claude-code/).

## Why this pack is different

- **One prompt, four disciplines.** `@orchestrator` scopes the work, then hands off to
  `@codebase` for implementation, `@review` for quality, and `@docs` for documentation — in one session.
- **Skills that don't tax context.** All 29 skills load only when invoked, so an idle skill costs nothing.
- **Least-privilege tools, host-compatible skills.** Tools start at `"*": "deny"` with narrow
  allows; skills are allowed by default so host and plugin skills keep working.
- **Verified, not vibes.** Agent contracts, command matrices, docs links, and plugin guards are
  checked in CI on every change.

## Quick Start

**Requires:** Node.js (current LTS) and the [OpenCode CLI](https://opencode.ai/docs/cli/).

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

# Choose an OpenCode config target (default: auto)
npx agents-opencode --global --target v2    # emit v2 keys ('permissions'; 'plugins' only if a plugin entry exists)
npx agents-opencode --global --target auto  # detect the installed OpenCode version (v2 if major >= 2, else v1)
```

`--languages` prunes non-requested **language skill directories** only — shared workflow skills always stay.

**Install:** npm package and installer command: `agents-opencode`. OpenCode runtime command: `opencode`.
**Uninstall:** targets the current project by default; timestamped backups are created before removal.
**Config:** the installer only manages a small, target-specific key set in `opencode.json`: `$schema`,
the plugin key (`plugin` on v1 / `plugins` on v2), and permission defaults (`permission` on v1 /
`permissions` on v2). It never writes both key sets, and it never rewrites your provider, model,
instructions, share, or session compaction settings.
**Targets:** `--target v1|v2|auto` (default `auto`). See
[OpenCode v1/v2 support](https://agnts.elkodr.com/opencode-v1-v2-support/).

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
| `@brutal-critic` | Delegation target | Ruthless content QA scored against a rubric, with line-cited fixes |
| `@legal-advisor` | Delegation target | License auditing, compliance checks, IP review, export controls |
| `@blogger` | Primary (Tab switch / `@mention`) | Blog posts, YouTube scripts, podcast outlines, resumes, LinkedIn profiles |
| `@em-advisor` | Primary (Tab switch / `@mention`) | 1-on-1 prep, team strategy, roadmap planning |

`@blogger` and `@em-advisor` are **primary agents** — switch to them with Tab or mention them
directly. They are not subagents (callable via the Task tool), so the orchestrator will not delegate to them.

Canonical source for skill triggers and the host-skill policy: [Skills Matrix](https://agnts.elkodr.com/skills-matrix/).

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
| `/design-audit` | Design reference audit (max 3 sourced proposals) |
| `/api-docs` | Generate API documentation |
| `/create-readme` | Generate README |
| `/blog-post` | Blog post creation |
| `/content-review` | Content quality scoring |
| `/plan-project` | Multi-phase project planning |
| `/execution-loop` | Bounded iterative execution workflow |
| `/stop-loop` | Stop loop and summarize state |
| `/checkpoint` | Phase-boundary checkpoint for human decision |
| `/retro` | One durable check, standard, or drill from the last task |
| `/1-on-1-prep` | Meeting preparation |
| `/legal-review` | License, compliance, and data-privacy review |

**Command surface:** the pack registers 57 catalog entries (10 agents + 18 commands + 29 skills).
Kimaki/Discord caps the combined surface (agents + commands + skills + host skills) at 100 slash
commands; if you hit the cap, trim low-value commands first.

## Skills

29 skills live under `.opencode/skills/`, each defined in a `SKILL.md`:

- **11 language skills** — .NET, Flutter, Go, Java/Spring, Node/Express, Python, React/Next.js,
  Ruby/Rails, Rust, SQL migrations, TypeScript.
- **18 workflow skills** — API docs, ADRs, docs validation, project bootstrap, agent diagnostics,
  refactoring, security audit, code-change impact, UX/responsive, decision grounding, systematic
  debugging, test-driven development, verification before completion, blogging, brutal critique,
  legal compliance, alignment, writing for agents.

Skills load on demand via the `skill` tool. Coding standards and language guidance live in these
skills — not in a sprawling instruction directory. A small set of shared reference instructions
stays in `.opencode/instructions/`.

Scope is core-only: additions pass demand, clear-gap, ownership, and licensing/provenance checks.

<details><summary>Permission configuration (host-friendly defaults)</summary>

**Skills are allowed by default.** Nine of the ten agents can load any skill the host exposes
(pack, plugin, or project) so host and plugin skills keep working; `researcher` is intentionally
skill-free (read-only, deny-by-default baseline). To restrict skills, edit `permission.skill` in
the installed agent file, or add a v2 hard-deny policy
(`{ "action": "integration.use", "resource": "skill:<id>", "effect": "deny" }`). A global
`permission.skill` rule does **not** restrict pack agents: agent rules are appended last and win.
Treat project skills in untrusted clones as untrusted content.

**Shell allowlist (codebase / orchestrator / em-advisor only).** These three auto-approve
content-free diagnostics (`git status`, `ls`, `docker ps`, `kimaki session list` — Kimaki is the
Discord front end, inert when absent), `kimaki buttons`, and common test runners
(`npm`/`pnpm`/`yarn`/`bun` test, `pytest`, `go test`, `cargo test`, `dotnet test`, `flutter test`).
Content readers (`git diff/log/show`, `docker logs`, `kimaki session read`) and every other
command still ask; redirection and `git --output` force an ask; `rm -rf` and force-pushes stay
denied. Test runners execute repo code — a deliberate trust decision. The other seven agents deny
shell entirely; built-in agents (`build`) are unaffected by pack agent rules.

**Subagent invocation (`task`) remains deny-by-default** with explicit per-agent allowlists.

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

Use `--project` (defaults to the current directory) for a project install.

### Install mode

| Mode | What you get | Pick this if… |
|---|---|---|
| **File install** (default) | Agents, commands, skills, hooks/guards | You want the full pack — start here |
| **Plugin spec** (`"plugin"` / `"plugins": ["agents-opencode"]`) | Skills and hooks/guards only — no agents or config | You already manage agents yourself |
| **Claude Code adapter** | Skills only — no agents or commands | You use Claude Code |

OpenCode v1 and v2 use different config keys, so the installer emits per-target output and never
mixes the two. Select a target with `--target v1|v2|auto` (default `auto` detects the installed
OpenCode version — v2 when the major is >= 2, else v1; it falls back to v1 when OpenCode is not
detected). The installer records the target so uninstall reverts the right keys.

A file install adds no plugin entry: OpenCode auto-loads the bundled plugin from `.opencode/plugins/`.
To deliver **skills and hooks/guards only** (no agents or global config), add the package as an
OpenCode plugin entry in `opencode.json`: `"plugin": ["agents-opencode"]` (v1) or
`"plugins": ["agents-opencode"]` (v2); a version pin like `agents-opencode@X.Y.Z` also works (use a
build that ships plugin-spec support). Do not combine a file install with the plugin entry.

A sandbox run on v2.0.30 verified the plugin loads, with all 10 agents and 27 skills discovered.
On OpenCode 2.0.32 the resolved rules (`opencode debug agents`) confirm v1-shaped agent
frontmatter translates to the v2 `permissions` array (`bash`→`shell`, `task`→`subagent`,
`skill`→`skill`). v2 runtime hook behaviour is not yet exercised end-to-end. The plugin-spec path
is verified to load on v2.0.30; its runtime skill delivery is likewise not yet exercised end-to-end.

See [OpenCode v1/v2 support](https://agnts.elkodr.com/opencode-v1-v2-support/).

### Claude Code plugin

```bash
# Add marketplace (one-time)
/plugin marketplace add shahboura/agents-opencode-claude

# Install
/plugin install agents-opencode@shahboura

# Update
/plugin update agents-opencode@shahboura
```

This gives Claude Code access to the same 29 on-demand skills — skills only, no agents or slash
commands — which load only when invoked, with no context cost until you use them.
See [adapters/claude-code/](./adapters/claude-code/) for the plugin manifest and generator script.

## Validation

Run `npm run doctor` for the complete local validation suite (agent contracts, markdown linting,
docs links, session state, eval trends, and more). For the full check mapping (local commands ↔ CI
gates), see **[Compatibility](https://agnts.elkodr.com/compatibility/)**.

Agent evals: `npm run eval:agents` runs deterministic contract checks for agent and command
metadata. `npm run eval:agents:json` writes machine-readable output.

## Docs

- **[Getting Started](https://agnts.elkodr.com/getting-started/)**
- **[Commands](https://agnts.elkodr.com/commands/)**
- **[Approval Gates](https://agnts.elkodr.com/approval-gates/)**
- **[Review Gate](https://agnts.elkodr.com/review-gate/)**
- **[Compatibility](https://agnts.elkodr.com/compatibility/)**
- **[Deprecation & Migration Policy](https://agnts.elkodr.com/deprecation-migration/)**
- **[State Management](https://agnts.elkodr.com/state-management/)**
- **[Skills Matrix](https://agnts.elkodr.com/skills-matrix/)**
- **[Decision Grounding](https://agnts.elkodr.com/decision-grounding/)**
- **[OpenCode v1/v2 Support](https://agnts.elkodr.com/opencode-v1-v2-support/)**
- **[Full Documentation](https://agnts.elkodr.com/)**

> **Roadmap:** a future major will standardize on OpenCode v2. Status: [OpenCode v1/v2 support](https://agnts.elkodr.com/opencode-v1-v2-support/).

## License

[MIT](./LICENSE) © 2025–2026 Shehab Elhadidy. Portions adapted from third-party
projects — see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

If this pack saves you time, [star the repo](https://github.com/shahboura/agents-opencode) so others can find it.
