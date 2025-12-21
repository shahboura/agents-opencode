# Getting Started

## Quick Setup

1. **Install OpenCode CLI**
2. **Copy agents to your project:**
   ```bash
   cp -r .opencode/agent/ your-project/.opencode/agent/
   ```
3. **Start using:**
   ```bash
   opencode
   @codebase Create a user API endpoint
   ```

## How It Works

- **Plan First**: Agents propose plans, you approve
- **Step-by-Step**: Implementation happens incrementally
- **Multi-Language**: Auto-detects .NET, Python, TypeScript, Flutter
- **Standards**: Auto-applies coding best practices

## Agents

- `@orchestrator` - Planning and coordination
- `@codebase` - Code implementation
- `@review` - Security/quality audits
- `@docs` - Documentation
- `@em-advisor` - Leadership guidance
- `@blogger` - Content creation

## Tips

- Be specific in requests
- Review plans before approval
- Use `/` commands for common tasks
- Add project context to `AGENTS.md`
