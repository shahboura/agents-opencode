# Troubleshooting

## Common Issues

### Agents not showing up
- Verify `.opencode/agent/*.md` exists
- Reload OpenCode / editor

### Agent ignores standards
- Run `/init` to create `AGENTS.md`
- Add project context to `AGENTS.md`

### Wrong language detected
- Add `*.sln`, `pyproject.toml`, or `tsconfig.json`

### Tests failing after changes
- Ask the agent to fix with error output

### Commands not showing
- Verify command files in `.opencode/commands/*.md`
- Reload OpenCode

## Help

- [Getting Started](./getting-started)
- [Agents](./agents/README)
- [Commands & Skills](./commands)
