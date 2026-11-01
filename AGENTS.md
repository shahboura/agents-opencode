# OpenCode Agents Repository

Customized agents, skills, and commands for OpenCode.ai, aligned with Anthropic's
skills framework.

## Project Structure

- `.opencode/agents/` - agent configurations (canonical path)
- `.opencode/instructions/` - reference instructions (loaded on demand)
- `.opencode/skills/` - skills (loaded on demand via the `skill` tool)
- `.opencode/commands/` - command entry points (`subtask` routes)
- `scripts/` - installer, validators, review gate
- `site/src/content/docs/` - documentation site (Astro Starlight, Cloudflare Workers)

## On-Demand References

- **Skill activation:** each agent's inline Skill Activation Policy; catalog in `.opencode/skills/`.
- **Agent roster and permissions:** `.opencode/agents/`.
- **Coordination patterns:** `.opencode/instructions/orchestrator-reference.instructions.md`.
- **Review gate:** `site/src/content/docs/review-gate.md`.
- **Adoption plan:** `PLAN.md`.
- **Deferred work:** GitHub issues (P1/P2/P3 in the title); `BACKLOG.md` is the index plus
  the OpenCode v1/v2 migration plan.
- **Session history:** `MILESTONES.md`.
- **Knowledge graph:** trigger, fallback, and staleness per the `codebase-discovery` skill.

## Quality Requirements

Run `npm run doctor` before committing. It aggregates lint, test, schema, docs,
install, and gate checks. `CONTRIBUTING.md` documents the review gate and release flow.

## Session State

- **Start:** read `state/session-state.json` (it supersedes `handoff/latest.md`; read the handoff only when state is absent).
- **Finish:** refresh state, regenerate the handoff packet, and log a milestone in
  `MILESTONES.md` (format and rules are at the top of that file). Present for approval.
