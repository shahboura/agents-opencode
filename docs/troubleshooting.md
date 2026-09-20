---
layout: default
title: Troubleshooting
nav_order: 7
description: Common issues and solutions for OpenCode agent configurations.
---

# Troubleshooting

## Common Issues

### Agents not showing up

- Verify agent files exist in `.opencode/agents/*.md`
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

- Ensure Node.js/npm is installed
- Check internet connectivity for npm registry access
- Try `npx agents-opencode --global` instead of curl

### Uninstall does not seem to work

- Check active scope with `npx agents-opencode --status`
- Default `npx agents-opencode --uninstall` only targets the current project scope
- Use `npx agents-opencode --uninstall --global` to remove global install
- Use `npx agents-opencode --uninstall --all` to remove both global and project scopes
- If global is still installed, OpenCode may continue loading global agents/config

### How do I restore from installer backups?

- Project scope backups are in `<project>/.opencode/.backups/`
- Global scope backups are in `~/.config/opencode/.backups/`
- Open the latest session folder and inspect `backup-manifest.json`
- Copy the backed-up files back to their original paths listed in the manifest
- Retention keeps the latest 10 sessions and sessions newer than 30 days

### Existing provider/model config changed unexpectedly

- Installer only manages `$schema`, `plugin`, and missing permission defaults
  (`external_directory`, `doom_loop`); other keys are never written.
- Existing `provider`, `model`, `instructions`, `share`, and `compaction` values are preserved.
- Re-run install with `--project` or `--global` and check logs for `Updated config safely`.

### Agent refuses to read a file that looks like a secret

- The runtime plugin blocks reads of secret-style files: `.env`, `.env.*`, `*.env`,
  `id_rsa`, `id_ed25519`, `id_ecdsa`, `credentials.json`, `credentials.yaml`,
  `credentials.yml`, `secrets.yaml`, `secrets.yml`, `secrets.json`, `.npmrc`,
  `.netrc`, `.p12`, `.pfx`, `.jks`, `.keystore`, `.pem`, and `.key`.
- Checked-in templates (`.env.example`, `.env.sample`, `.env.template`, `.env.dist`,
  `.env.defaults`) and public certs (`*.pub`, `*.crt`, `*.cer`, `*.cert`, `ca.pem`,
  `cert.pem`, `certificate.pem`, `chain.pem`, `fullchain.pem`) remain readable.
- To inspect a blocked file, open it outside the agent session.

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
- Confirm the agent has `permission.skill` allow rules and that the requested skill is permitted

### Context file too large

- Run `node scripts/check-context-size.js` to check size
- The script auto-prunes `AGENTS.md` when it exceeds 100 KB
- Keep milestone entries concise (3-5 bullets max)

### Agent permissions denied

- Check the `permission` section in the agent's `.md` file
- `"deny"` blocks the action entirely; `"ask"` prompts for confirmation
- Edit the agent file to change permission levels

### Socket.dev shows a license warning

- This is a known false positive in Socket's file scanner, not a real licensing issue.
- The package is MIT (`license` field in `package.json` plus the root `LICENSE` file).
- Socket reads `.opencode/skills/legal-advisor/references/license-matrix.md` — a reference that
  documents third-party license types for the `@legal-advisor` agent — and unions the SPDX
  identifiers it finds there into a synthetic `AND` license.
- That synthetic union triggers `mixedLicense`, `licenseSpdxDisj`, `copyleftLicense`, and
  `nonpermissiveLicense` alerts and lowers Socket's License score.
- No third-party license text is redistributed; the matrix ships intentionally so `@legal-advisor`
  can assess dependency compatibility offline.

## Help

- [Getting Started](./getting-started)
- [Agents](./agents/README)
- [Commands & Skills](./commands)
