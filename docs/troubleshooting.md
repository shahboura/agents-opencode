---
layout: default
title: Troubleshooting
nav_order: 7
description: Common issues and solutions for OpenCode agent configurations.
---

# Troubleshooting

## Common Issues

### Agents not showing up

- Verify `.opencode/agent/*.md` exists
- Reload OpenCode / editor
- Check that frontmatter has `description` and `mode` fields

### Agent ignores standards

- Run `/init` to create `AGENTS.md`
- Add project context to `AGENTS.md`
- Check that instruction files exist in `.opencode/instructions/`

### Wrong language detected

- Add `*.sln`, `pyproject.toml`, or `tsconfig.json`
- The `@codebase` agent auto-detects based on project markers

### Tests failing after changes

- Ask the agent to fix with error output
- Include the full error message for context

### Commands not showing

- Verify command files in `.opencode/commands/*.md`
- Reload OpenCode
- Check that the command file has valid frontmatter (`description`, `agent`)

### Installation fails

- Ensure Git and Node.js are installed
- Check internet connectivity for repository clone
- Try `npx agents-opencode --global` instead of curl

### Skills not loading

- Skills are invoked through agents, not directly from the TUI
- Ask an agent to use the skill by name (e.g., "Use the project-bootstrap skill")
- Verify skill files exist in `.opencode/skills/[skill-name]/SKILL.md`
- Confirm the requested skill matches the active task domain (skills load on demand)
- If stack/domain is unclear, clarify the target language before asking for skill usage
- Note: this repository currently ships **core-only skills**; if you request a non-core skill, it will not be available.

### Skill permission denied

- Check `permission.skill` in the agent file
- Ensure `"*": "deny"` is followed by explicit allow rules for required skills
- Verify skill name matches directory and frontmatter `name`
- Confirm the agent still has `tools.skill: true`

### Context file too large

- Run `node scripts/check-context-size.js` to check size
- The script auto-prunes `AGENTS.md` when it exceeds 100 KB
- Keep milestone entries concise (3-5 bullets max)

### Agent permissions denied

- Check the `permission` section in the agent's `.md` file
- `"deny"` blocks the action entirely; `"ask"` prompts for confirmation
- Edit the agent file to change permission levels

## Help

- [Getting Started](./getting-started)
- [Agents](./agents/README)
- [Commands & Skills](./commands)
