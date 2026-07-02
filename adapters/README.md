# Platform Adapters

agents-opencode skills and agents are portable across AI coding platforms.

| Platform | Distribution | Install |
|---|---|---|
| **OpenCode** | npm | `npx agents-opencode --global` |
| **Claude Code** | GitHub plugin | `/plugin marketplace add shahboura/agents-opencode-claude` then `/plugin install agents-opencode@shahboura` |
| **Cursor** | 🔲 Planned | Generate `.cursor/rules/*.mdc` from skills |

## How adapters work

Skills in `.opencode/skills/` are the canonical source. Each adapter:

1. Copies skills from the source
2. Strips platform-specific content (agent references, metadata blocks)
3. Outputs platform-native files

Run the generator for your platform:

```bash
# Claude Code
./adapters/claude-code/generate.sh dist/claude-code

# Cursor (planned)
./adapters/cursor/generate.sh dist/cursor
```
