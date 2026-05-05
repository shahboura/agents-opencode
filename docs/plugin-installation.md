---
layout: default
title: Installation
nav_order: 14
description: Install the agents-opencode pack via npx/npm (recommended) or the OpenCode plugin system.
---

# Installation

The agents-opencode pack supports two installation methods: npx/npm (recommended — battle-tested
since v1.0.0) and the OpenCode plugin system (alternative).

## Via npx/npm (Recommended)

```bash
npx agents-opencode --global
```

Or via direct npm install:

```bash
npm install -g agents-opencode && agents-opencode --global
```

For project-scoped installs:

```bash
npx agents-opencode --project .
```

This copies agents, skills, commands, instructions, and the runtime plugin into
`.opencode/`. OpenCode auto-discovers the plugin from `.opencode/plugins/` at startup.
The `"plugin": ["agents-opencode"]` entry is written to `opencode.json` automatically.

## Via OpenCode Plugin (Alternative)

If the pack is already installed via npx, the plugin entry is already present. To add
it manually, include the plugin in your `opencode.json`:

```json
{ "plugin": ["agents-opencode"] }
```

Then restart OpenCode or run `/reload-plugins` inside the TUI.

The plugin provides:

- Compaction hooks to preserve agent context across session boundaries
- Safety checks that block reading sensitive files (.env, credentials, keys)
- Environment injection (`AGENTS_OPENCODE_VERSION`) for project-scoped installs

### Plugin Compatibility

| Runtime | Minimum Version |
|---------|----------------|
| `@opencode-ai/plugin` SDK | 1.14.39 |

## Troubleshooting Plugin Discovery

If the plugin does not load after adding it to `opencode.json`:

1. Verify the plugin entry is in your project's `opencode.json` under the `plugin` array.
2. Run `/reload-plugins` in the OpenCode TUI.
3. Check that your `@opencode-ai/plugin` SDK is at version 1.14.39 or later.
4. Restart OpenCode and check for plugin load messages in the startup log.

If the plugin still does not appear, use the npx/npm install method instead — it copies
the plugin directly into `.opencode/plugins/` where OpenCode discovers it automatically.

## Verifying Installation

Run the status command to check detected installation scopes:

```bash
npx agents-opencode --status
```

Or confirm the plugin is active: run `/legal-review test`. If the `legal-advisor` agent
responds, the pack is installed correctly.

## Update Behavior

- npx/npm installs: run `npx agents-opencode --update` to pull the latest published version.
- Plugin installs: update the plugin version in `opencode.json` and run `/reload-plugins`.

## Uninstall

- npx/npm: `npx agents-opencode --uninstall` (current project), `--global`, or `--all`.
- Plugin: remove the `"agents-opencode"` entry from the `plugin` array in `opencode.json` and restart OpenCode.
