---
title: Getting Started
description: Install and configure agents for OpenCode (npx/curl) or Claude Code (plugin).
sidebar:
  order: 2
---

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

# Keep only selected language skills for a lighter install
npx agents-opencode --global --languages python,typescript

# Update existing installation
npx agents-opencode --update

# Force update both global + current project scopes
npx agents-opencode --update --all
```

`--languages` keeps only the requested language skills, pruning the others from `.opencode/skills/`.
Non-language skills always remain, and runtime skills still load on demand via agent skill allowlists.

### Your First Run

1. Open OpenCode:

   ```bash
   opencode
   ```

2. Initialize context:

   ```txt title="TUI"
   /init
   ```

3. Ask for help:

   ```txt title="TUI"
   @orchestrator Build a user authentication API with JWT tokens
   ```

### Claude Code Plugin

```bash
# Add marketplace (one-time)
/plugin marketplace add shahboura/agents-opencode-claude

# Install
/plugin install agents-opencode@shahboura
```

All 27 skills are available immediately. Type `/` in Claude Code to see the full
skill list. Skills load on demand — no context cost until invoked.

## Install reference

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
- Project backups: `<project>/.opencode/.backups/<timestamp>--<operation>--<scope>/`
- Global backups: `$XDG_CONFIG_HOME/opencode/.backups/…` when `XDG_CONFIG_HOME` is an absolute
  path, otherwise `~/.config/opencode/.backups/<timestamp>--<operation>--<scope>/`
- Backup retention: latest 10 sessions and sessions newer than 30 days.
- Installer only manages its target's keys in `opencode.json`: `$schema`, the plugin key
  (`plugin` on v1 / `plugins` on v2), and permission defaults (`permission` on v1 /
  `permissions` on v2). The two key sets are never co-written.
- A file install adds no plugin entry; OpenCode auto-loads the bundled plugin from
  `.opencode/plugins/`.
- Other config keys (provider, model, instructions, share, compaction, watcher, ...) are never written or modified.

To restore files, use `backup-manifest.json` from a backup session and copy the files back to their original paths.

### OpenCode v1/v2 support

The pack fully supports OpenCode **v1** and prepares **v2** support — verified to load
(plugin, all 10 agents, and 27 skills discovered) on v2.0.30, with v2 runtime hook behaviour
not yet exercised.
The two use **disjoint config keys**, so the installer emits per-target output and never
mixes key sets:

```bash
npx agents-opencode --global --target v1    # plugin / permission
npx agents-opencode --global --target v2    # permissions (plugins only if a plugin entry exists)
npx agents-opencode --global --target auto  # detect the installed OpenCode version (v2 if major >= 2, else v1)
```

- `auto` detects the installed OpenCode version (v2 when the major is >= 2, else v1)
  and falls back to v1 when OpenCode is not detected.
- The installer records the target so uninstall reverts the correct keys.
- A **file install** delivers agents, markdown commands, skills, and config/permissions; the bundled
  plugin (auto-loaded from `.opencode/plugins/`) adds the runtime hooks/guards. On a file install the
  plugin's skill registration is a no-op, because the installer already copied the skills.
- A **plugin-spec install** (adding `"plugin": ["agents-opencode"]` on v1 or
  `"plugins": ["agents-opencode"]` on v2) delivers **skills and hooks/guards only** — not agents
  or global config. It is verified to load on v2.0.30; its runtime skill delivery is not yet
  exercised end-to-end.
- Do not combine a file install with the plugin spec.

Full details: **[OpenCode v1/v2 Support](/opencode-v1-v2-support/)**.

## What gets installed

- `.opencode/` agents, markdown commands, skills, and the bundled plugin
- `opencode.json` project config (target-specific keys)

## Notes

- Package/installer command: `agents-opencode`
- OpenCode runtime command: `opencode`
- Git is not required for `npx`/`npm` installs.
- `AGENTS.md` is created on first run or via `/init`.
- Coding standards are delivered as on-demand skills in
  `.opencode/skills/<name>/SKILL.md`.

## Next Steps

- **[Agents](/agents/)**
- **[Customization](/customization/)**
- **[Commands & Skills](/commands/)**
- **[Troubleshooting](/troubleshooting/)**
