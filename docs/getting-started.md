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

# Filter language instruction references for a lighter install
npx agents-opencode --global --languages python,typescript

# Update existing installation
npx agents-opencode --update

# Force update both global + current project scopes
npx agents-opencode --update --all
```

`--languages` filters language instruction reference files. Runtime skills still load on demand via agent skill allowlists.

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
# Current project scope (default)
npx agents-opencode --uninstall

# Global scope only
npx agents-opencode --uninstall --global

# Both global + current project scopes
npx agents-opencode --uninstall --all

# Check detected install scopes
npx agents-opencode --status
```

- Default uninstall applies to the **current project scope**.
- Use `--global` or `--all` to target non-project scope.
- Removes installer-managed files using install manifest tracking.
- Backs up `AGENTS.md` as `AGENTS.<timestamp>.bk.md` for project-scope uninstall.
- Installer only merges missing permission defaults into existing `opencode.json`.
- Existing provider/model/instruction configuration remains unchanged.

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
