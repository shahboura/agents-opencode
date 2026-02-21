---
layout: default
title: Getting Started
nav_order: 2
---

# Getting Started

Get up and running with OpenCode agents in under 5 minutes.

## Prerequisites

- [OpenCode CLI](https://opencode.ai/docs/cli/) installed
- Node.js/npm and Git
- Any project (existing repos work perfectly)

## Quick Setup (60 seconds)

### Global Installation

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --global && rm install.js
```

### Project Installation

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --project /path/to/your/project && rm install.js
```

### Windows (PowerShell)

```powershell
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js; node install.js --global; rm install.js
```

### Linux/macOS (Bash/Zsh)

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --project . && rm install.js
```

### Uninstall

#### Remove from Current Directory/Project

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --uninstall
```

**What happens:**
- Removes `.opencode/` directory and `opencode.json`
- Preserves `AGENTS.md` if present (session history remains intact)
- Automatically removes the install script itself
- Agent configurations can be re-installed anytime

#### Remove Global Installation

For global installations, navigate to the global config directory and run:

```bash
# Linux/macOS
cd ~/.config/opencode && curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --uninstall

# Windows
cd ~/.config/opencode && curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js -o install.js && node install.js --uninstall
```

**What happens:**
- Removes `.opencode/` directory and `opencode.json` from the global config location
- Preserves global `AGENTS.md` if present (session history remains intact)
- Automatically removes the install script itself

## Your First Run

1. Open OpenCode:

   ```bash
   opencode
   ```

2. Initialize context:

   ```
   /init
   ```

3. Ask for help:

   ```
   @orchestrator Build a user authentication API with JWT tokens
   ```

## What gets installed

- `.opencode/` agent configs
- `opencode.json` project config

## Notes

- `AGENTS.md` is created on first run or via `/init`.
- Standards auto-apply based on file type.

## Next Steps

- **[Agents](./agents/README)**
- **[Coding Standards](./instructions)**
- **[Commands & Skills](./commands)**
- **[Troubleshooting](./troubleshooting)**
