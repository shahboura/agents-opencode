---
title: Commands & Skills
description: Slash commands and reusable skills for OpenCode agent workflows.
sidebar:
  order: 4
---

## Commands

:::tip[What you get]
- Every slash command in the pack, with what it does and when to run it.
- The mapping from command to agent, so you can pick the right entry point.
:::

Type `/command-name` in the OpenCode TUI to run.

Most commands accept an optional argument to scope the task:
`/command-name [argument]` — the argument is passed directly to the target agent.

| Command | Purpose |
| --- | --- |
| `/api-docs` | Generate API reference docs |
| `/architecture-decision` | Create an ADR |
| `/architecture-review` | Review design for quality attributes |
| `/blog-post` | Write a blog post |
| `/code-review` | Security, perf, and style review |
| `/content-review` | Score and critique content quality |
| `/create-readme` | Generate or improve a README |
| `/design-audit` | Reference-first design proposals against DESIGN.md |
| `/generate-tests` | Generate targeted tests |
| `/plan-project` | Multi-phase implementation plan |
| `/execution-loop` | Bounded verify-and-continue execution loop |
| `/legal-review` | Review licenses, compliance, and data privacy |
| `/refactor-plan` | Safe staged refactor strategy |
| `/retro` | One durable check, standard, or drill from the last task |
| `/security-audit` | Security-focused code review |
| `/stop-loop` | Halt loop execution and report state |
| `/checkpoint` | Structured phase-boundary pause for human decision |
| `/1-on-1-prep` | Prepare for a 1-on-1 meeting |

## Skills

Skills are reusable behaviors loaded on demand. Common utility skills include:

- `project-bootstrap` - Create a minimal `AGENTS.md` scaffold

Docs and agent-config checks ship as commands, not skills:

- `npm run validate:docs` - Docs lint and link checks
- `npm run doctor` - Full local validation suite (agents, docs, schema, install)
- `node scripts/validate-agents.js` - Agent config and instruction coverage only

For the canonical current skill inventory and trigger policy, see [Skills Matrix](/skills-matrix/).

### Using Skills

Skills are defined in `.opencode/skills/[skill-name]/SKILL.md`. Agents load them
via the `skill` tool when the task matches. To invoke a skill manually, ask an
agent to use it:

```txt title="TUI"
@codebase Use the project-bootstrap skill to create AGENTS.md
@codebase Run npm run doctor and tell me which checks fail
```

Skills cannot be called directly from the TUI — they are invoked through agents.

### External Link Validation (Optional)

- Internal docs links are validated by default via `npm run validate:docs`.
- External links can be validated on demand via `npm run validate:docs:external`.
- CI runs external checks in a separate scheduled, non-blocking workflow to avoid flaky PR gates.

### Command Matrix Parity Validation

- Command tables are validated against canonical command frontmatter in `.opencode/commands/*.md`.
- Run `npm run validate:commands` to verify command presence and metadata parity.

### Risk-Scored Review Path (CI)

- PR validation includes a risk-path gate that classifies changed files as low/medium/high impact.
- Medium/high changes require the PR template `Risk level` field to acknowledge at least that level.
- Risk-path logic runs in CI via `validate-risk-path` and is covered by local regression tests (`npm run doctor`).

### Changelog Capability Labels

- Unreleased changelog bullets should be prefixed with `[capability:<label>]`.
- Validate locally with `npm run validate:changelog`.
- CI enforces this via the `validate-changelog` gate.

### Skill Selection Guardrails

- Load skills on demand for matching tasks only.
- Use one relevant skill by default; add a second only for clear cross-domain need.
- If technology/domain is ambiguous, ask for clarification before loading.

### Skill Permission Hardening

Pack agents allow all skills by default (`"*": "allow"`) so host skills keep working. To restrict
skills for your own agents, use skill-level permissions in agent frontmatter:

```yaml
permission:
  skill:
    "*": "deny"
    "project-bootstrap": "allow"
    "security-audit": "allow"
```

Pattern notes:

- The pack default is `"*": "allow"`; use `"*": "deny"` + explicit allows when you need least privilege.
- Use wildcard patterns for groups (for example, `"internal-*": "allow"`).
- Restrict pack agents by editing their installed agent file or with a v2 `integration.use` policy;
  global rules lose to agent rules.

### Task Permission Hardening

Control which subagents can be launched via the Task tool:

```yaml
permission:
  task:
    "*": "deny"
    "explore": "allow"
    "review": "allow"
```

Pattern notes:

- Keep `"*": "deny"` first, then explicit allows.
- Keep subagent allowlists role-specific.
- Rules are evaluated in order; last matching rule wins.

## Custom Commands

Add command files to `.opencode/commands/` with frontmatter:

```yaml
---
description: What this command does
agent: recommended-agent
subtask: true
---
```

In OpenCode **v1**, `subtask: true` runs the command as a subtask. In **v2**,
`subtask` is a **deprecated alias** for `subagent`; the shipped commands still use
`subtask` because v2 auto-translates it in memory. OpenCode v2 docs conflict on
whether the alias still delegates, so prefer `subagent` in new v2-native commands.
See [OpenCode v1/v2 Support](/opencode-v1-v2-support/).

See [OpenCode Commands docs](https://opencode.ai/docs/commands/) for full reference.

## Verify It Worked

```bash
ls .opencode/commands/*.md | grep -v README | wc -l
```

Prints 18 — one line per command.

## Next Steps

- **[Agents](/agents/)**
- **[Customization](/customization/)**
