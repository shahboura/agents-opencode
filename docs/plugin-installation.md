---
layout: default
title: Plugin Installation
nav_order: 14
description: Install the agents-opencode pack via the OpenCode plugin system or via npx/npm.
---

# Plugin Installation

The agents-opencode pack supports two installation methods: the OpenCode plugin system (recommended for OpenCode runtime integration) and the traditional npx/npm method.

## Via OpenCode Plugin (Recommended)

Add the plugin to your `opencode.json`:

```json
{ "plugin": ["agents-opencode"] }
```

Then restart OpenCode or run `/reload-plugins` inside the TUI.

The plugin provides:

- Compaction hooks to preserve agent context across session boundaries
- Safety checks at plugin load time
- Environment-specific injection for project-scoped installs

### Plugin Compatibility

| Runtime | Minimum Version |
|---------|----------------|
| `@opencode-ai/plugin` SDK | 1.14.39 |

## Via npx/npm (Standalone)

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

## Troubleshooting Plugin Discovery

If the plugin does not load after adding it to `opencode.json`:

1. Verify the plugin entry is in your project's `opencode.json` under the `plugin` array.
2. Run `/reload-plugins` in the OpenCode TUI.
3. Check that your `@opencode-ai/plugin` SDK is at version 1.14.39 or later.
4. Restart OpenCode and check for plugin load messages in the startup log.

If the plugin still does not appear, fall back to the npx/npm install method.

## Verifying Installation

Run the status command to check detected installation scopes:

```bash
npx agents-opencode --status
```

Or confirm the plugin is active by running `/legal-review test` — if the `legal-advisor` agent responds, the pack is installed correctly.

## Update Behavior

- npx/npm installs: run `npx agents-opencode --update` to pull the latest published version.
- Plugin installs: update the plugin version in `opencode.json` and run `/reload-plugins`.

## Uninstall

- npx/npm: `npx agents-opencode --uninstall` (current project), `--global`, or `--all`.
- Plugin: remove the `"agents-opencode"` entry from the `plugin` array in `opencode.json` and restart OpenCode.
