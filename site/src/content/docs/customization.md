---
title: Customization
description: Customize agents, commands, skills, and project context for your workflow.
sidebar:
  order: 6
---

## Project Context

Create or update `AGENTS.md` (created on first run or via `/init`) with a short project summary:

```markdown
# Project

## Tech
- Node.js, TypeScript, PostgreSQL

## Standards
- Async/await everywhere
- Tests for new features
- No hardcoded secrets
```

## Agent Configuration

Edit `.opencode/agents/[agent].md` to adjust behavior (model, permissions).

Note: only the canonical `.opencode/agents/` (plural) path is recognized;
the legacy `.opencode/agent/` (singular) path was removed.

### Permission overrides

The agent markdown file wins. `agents.<id>.permissions` in `opencode.json` cannot override a
pack agent: rules resolve base → global → project → config agent rules → agent markdown, and
the last match wins, so the markdown rule applies. Edit the agent file to change a decision.

The practical lever without editing files is **Allow always**, which saves a project-scoped
rule (an observed saved `edit *` overrode `edit: "ask"`). Two limits:

- A saved rule does not override a configured `deny` per OpenCode's permission docs; that
  interaction is not yet tested here (PERM-2), so do not rely on the markdown `.env` deny alone.
- A saved `read *` can broaden reads to other secret-style files (`.npmrc`, `*.key`, `*.pem`,
  credentials); if saved rules turn out to override markdown denies, it also covers `.env`
  (PERM-2). The runtime plugin's secret-content guard is the backstop, but it is best-effort,
  not a security boundary: it inspects `read` and `grep` paths only (never shell), and fails
  open when it cannot resolve a path.

For cross-directory access (worktrees, shared checkouts), see
[OpenCode v1/v2 Support](/opencode-v1-v2-support/).

## Custom Commands

Add command files to `.opencode/commands/` with frontmatter (`description`, `agent`).
Type `/command-name` in the TUI to run.

## Skills

Skills live in `.opencode/skills/` and can be loaded on demand:

- Example skills: `ux-responsive`, `project-bootstrap`, `decision-grounding`, `writing-for-agents`
- For the canonical current list, use the [Skills Matrix](/skills-matrix/)

Recommended policy:

- Load skills on demand only when the task clearly matches the domain.
- Use one relevant skill by default; add a second only for explicit cross-domain work.

### Skill Permissions per Agent

Pack agents allow all skills by default (`"*": "allow"`) so host and plugin skills keep working.
To restrict skills, edit `permission.skill` in the installed agent file, or add a v2 hard-deny
policy (`integration.use` on `skill:<id>`). A global `permission.skill` deny does not restrict
pack agents — agent rules are appended last and win.

### Scope Policy (Core-only)

Current distribution is intentionally core-only; no optional skill packs are shipped.

When evaluating potential additions, use this gate:

1. Repeated demand in real usage
2. Clear capability gap vs current core
3. Named maintenance owner
4. Clean licensing/provenance (or clean-room rewrite)

### Optional: UI UX Pro Max Delegation

`ux-responsive` optionally delegates to the third-party **UI UX Pro Max** skill when a
project has it installed, preferring it for style, palette, typography, chart, icon, and
stack-specific guidance. It is **not bundled** with this pack — install the pinned
version into the project when you want it (requires Python 3.x):

```bash
npx ui-ux-pro-max-cli@2.15.0 init --ai opencode
```

When UI UX Pro Max is absent, the rules in `ux-responsive` are the fallback.

## Coding Standards

Reference standards for each language. Agents load relevant skills on demand through
the `skill` tool when work matches a language/domain. Skills are not preloaded eagerly.

| Language | Highlights |
|---------|------------|
| .NET (C#) | Clean Architecture, async/await, nullable types |
| Python | Type hints, context managers, pytest |
| TypeScript | Strict mode, null safety |
| Flutter | Riverpod, freezed models, widget testing |
| Go | Modules, context, testing |
| Java | Spring Boot DI, validation, records |
| Node.js | Security middleware, validation, structured logs |
| React | Accessibility, performance, hooks |
| UX Responsive | Breakpoints, reflow, touch/pointer and keyboard accessibility |
| Ruby | MVC, ActiveRecord, RSpec |
| Rust | Ownership, Result/Option, clippy |
| SQL | Safe migrations, constraints, indexes |
| Blogger | Content style, SEO, research validation |
| Brutal Critic | Framework-based scoring, review process |

For detailed standards, open the corresponding skill at `.opencode/skills/<name>/SKILL.md`
(for example `.opencode/skills/python/SKILL.md`, `.opencode/skills/ux-responsive/SKILL.md`).

CI/CD hygiene is not a skill: it ships as the always-installed instruction
`.opencode/instructions/ci-cd-hygiene.instructions.md`.

### Execution Loop

Use the **Safe Execution Loop Protocol** defined in `.opencode/agents/orchestrator.md` (and the
`/execution-loop` command) for bounded iterative execution with completion criteria, cycle limits,
escalation rules, and verification gates.

For multi-phase coordination patterns, checkpoints, fallback routing, and agent delegation
guidance, see `.opencode/instructions/orchestrator-reference.instructions.md`.

### Nested Delegation

Some agents can delegate further (for example `codebase` → `@review`/`@docs` or
`planner` → `@explore`). This requires a subagent depth of at least `2`: use
`experimental.subagent_depth` on v2 (top-level `subagent_depth` is ignored there) and
`subagent_depth` on v1. The installer does not set this for you. The orchestrator's own
coordination patterns work at the default depth because it calls each specialist directly.

### Recommended Project Config

The installer writes only its target's keys (`$schema`, the plugin key, and
permission defaults). To get the pack's full behavior, add these keys to `opencode.json`
(pick the per-target forms):

```json
{
  "experimental": { "subagent_depth": 2 },
  "compaction": { "buffer": 400000, "keep": { "tokens": 8000 } },
  "tool_output": { "max_bytes": 24576 },
  "share": "disabled"
}
```

- `experimental.subagent_depth: 2` enables nested delegation on **v2** (use top-level
  `subagent_depth` on v1).
- `compaction.buffer` is an absolute token count; the host triggers at `window - buffer`.
  `400000` on a 1M window triggers at 600k; use `80000` on a 200k window. Keep the
  value below the window or the host silently falls back to the 15% default.
- `tool_output.max_bytes` caps the **preview**; the host saves the full output and
  prints the path. A read of that path is outside the workspace and triggers
  `external_directory: ask` — keep that prompt. Do not allow the whole `tool-output`
  directory: saved stdout can contain secrets, and the read guard checks paths, not
  content.
- `compaction.keep.tokens` retains the recent tail after a summary; `8000` is the pack
  default. Raise it only when post-compaction continuity matters more than cost.
- The v2 plugin injects a context-band line (30/40/50); the orchestrator prompt defines
  the actions. The 60% compaction trigger is the backstop, not the primary signal.
- Fetched pages are snapshots: prefer version-pinned URLs, revalidate volatile sources
  at the decision, and record URL + `fetched_at` + version in the plan/ADR. Stable docs
  may reuse a 48h snapshot.

### OpenCode v1/v2 config keys

v1 and v2 use disjoint config keys. The installer emits one target's keys and
never mixes them (`--target v1|v2|auto`). In v2, agent `request.body.temperature`
is preserved but not yet sent to the model, and command `subtask` is a deprecated
alias for `subagent`. See **[OpenCode v1/v2 Support](/opencode-v1-v2-support/)**.

## Next Steps

- **[Getting Started](/getting-started/)**
- **[Agents](/agents/)**
