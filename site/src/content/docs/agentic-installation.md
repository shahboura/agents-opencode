---
title: Agentic Installation
description: Hand the install to the agent you already have open — the prompt, the commands it runs, and the checks that prove it worked.
sidebar:
  order: 2.5
---

Agentic installation means the agent installs the pack for you, using the same commands
you would type yourself. You paste one prompt; the agent checks the environment, runs the
installer, verifies the files, and reports back.

Use it when you already have an agent session open and do not want to switch context, or
when you are setting up several machines and want the checks repeated the same way.

## The Prompt

Paste this into OpenCode (or any agent with shell access) from the project you want the
pack installed into:

```txt title="Agent prompt"
Install the OpenCode agents pack in this session's project.

1. Check that Node.js and npm are on PATH, then check that the OpenCode CLI is available.
   Stop and tell me which one is missing — do not install runtimes.
2. Show me the exact command you are about to run, then wait for my confirmation.
3. Run `npx agents-opencode --project .` to install into this project.
   Do not use `--global` unless I ask for it.
4. Verify the install: list `.opencode/agents/`, `.opencode/skills/`, and
   `.opencode/commands/`, and report the counts.
5. Run `npx agents-opencode --status` and report anything it flags.
6. Print the first prompt I should try, then stop.
```

## What the Agent Runs

| Step | Command | What it proves |
| --- | --- | --- |
| Environment | `node --version`, `npm --version`, `opencode --version` | The prerequisites on [Getting Started](/getting-started/) are actually present |
| Install | `npx agents-opencode --project .` | Writes `.opencode/` in the current project |
| Verify | `ls .opencode/agents`, `ls .opencode/skills`, `ls .opencode/commands` | 10 agents, 28 skills, 18 commands landed |
| Smoke test | `/init` then `@orchestrator <task>` | The orchestrator loads and plans |

## Scope: Project or Global

- `--project .` writes into the current repository. Preferred for agentic installation:
  the agent can see exactly what it changed, and the change is reviewable in a diff.
- `--global` writes into your user config and is shared by every project. Ask for it
  explicitly; it is the one step here that is hard to undo blindly.

Pruning works the same way as a manual install — `--languages python,typescript` keeps only
those language skills. Non-language skills always remain, and skills still load on demand. A pruned install
reports fewer than 28 skills — 28 is the default full install.

## Verify It Worked

```bash
# 10 agents
ls .opencode/agents | wc -l

# 28 skills
ls .opencode/skills | wc -l

# 18 slash commands
ls .opencode/commands/*.md | grep -v README | wc -l
```

Then start a session and confirm the orchestrator is reachable:

```txt title="TUI"
/init
@orchestrator Build a user authentication API with JWT tokens
```

A healthy install replies with a plan and a task breakdown before touching any file.

## Guardrails Worth Stating in the Prompt

- **No runtime installs.** The agent checks for Node and OpenCode; it does not install them.
- **Show the command before running it.** One confirmation beat, no silent writes.
- **Project scope by default.** Global installs need an explicit ask.
- **Report failures, not successes.** A wall of green output hides the one line that failed.
