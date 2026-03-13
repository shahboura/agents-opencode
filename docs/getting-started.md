---
layout: default
title: Getting Started
nav_order: 2
description: Install and configure OpenCode agents in under 5 minutes with npx or curl.
---

# Getting Started

Get up and running with OpenCode agents in under 5 minutes.

## Prerequisites

- [OpenCode CLI](https://opencode.ai/docs/cli/) installed
- Node.js/npm
- Any project (existing repos work perfectly)

## Quick Setup (60 seconds)

### Via npx (Recommended)

```bash
# Global install
npx agents-opencode --global

# Project install
npx agents-opencode --project .

# Install with specific languages only
npx agents-opencode --global --languages python,typescript

# Update existing installation
npx agents-opencode --update
```

### Via curl

#### Global Installation

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js \
  -o install.js && node install.js --global && rm install.js
```

#### Project Installation

```bash
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js \
  -o install.js && node install.js --project /path/to/your/project && rm install.js
```

#### Windows (PowerShell)

```powershell
curl -fsSL https://raw.githubusercontent.com/shahboura/agents-opencode/main/install.js `
  -o install.js; node install.js --global; rm install.js
```

### Uninstall

```bash
npx agents-opencode --uninstall
```

- Applies to the **current directory** only.
- Removes `.opencode/` and `opencode.json`.
- Backs up `AGENTS.md` as `AGENTS.<timestamp>.bk.md` when present.

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

- Package/installer command: `agents-opencode`
- OpenCode runtime command: `opencode`
- Git is not required for `npx`/`npm` installs.
- `AGENTS.md` is created on first run or via `/init`.
- Coding standards in `.opencode/instructions/` are available as
  reference for agents.

## Next Steps

- **[Agents](./agents/README)**
- **[Coding Standards](./instructions)**
- **[Commands & Skills](./commands)**
- **[Troubleshooting](./troubleshooting)**
