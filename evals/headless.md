# Headless runs for drills

Drills need an agent that does not stop on a permission prompt. Two flags do that:

```bash
opencode run --standalone --auto \
  --agent codebase \
  --model <provider/model#variant> \
  --format json \
  "<drill prompt verbatim>"
```

- `--standalone` starts a private server, so runs do not share state.
- `--auto` approves permissions that are **not explicitly denied**. The pack's `deny`
  rules (`.env` reads through the read/grep tools, `rm -rf`, force-push) still apply —
  that is what D02 tests.
- **Known weakening:** `--auto` also approves `ask`-level shell commands. The plugin
  guard blocks direct shell reads and copies of secret files, including wrappers
  (`sudo`, `bash -c`), absolute paths, `<` redirection, globs, and direct interpreter
  references (`python -c`, `node -e`, heredocs naming the path) and simple
  `$(cat …)` substitutions. Encoded/computed paths, quoted backticks, obfuscated
  interpreter names (`p'ython'`, `"$PY"`), unlisted interpreters, and aliases still
  bypass it by design. Tracked as PERM-5 in `BACKLOG.md`.
- `--format json` gives a machine-readable transcript; store the relevant events, not
  the whole stream.

## Workspace

Use a throwaway copy per run:

```bash
git worktree add /tmp/drill-<id> HEAD
# or, for an installed-pack condition:
npm pack && npm install -g ./agents-opencode-*.tgz
```

Never run a drill in the working tree that holds uncommitted work.

## Which drills are headless-safe

| Drill | Headless | Note |
|---|---|---|
| D01, D02, D04, D05, D07, D08 | yes | single-turn, no human input needed |
| D03 | yes, with `SKIP_GATE` unset | the gate must run as it would for a human |
| D06 | **no** | it tests the interview itself; run it in a TUI or answer the rounds manually |

## Recording cost

There is no usage field in `--format json` output. Record tokens and wall time from the
host (`kimaki session list --json`) or the provider dashboard, and put both in the
transcript header. If neither is available, record `n/a` and say so in `decision.md`.

## Harness and redaction

`evals/harness/run-drill.sh --local` runs one drill in a clean copy of the tracked files from the working tree with:

- `env -i`: only `PATH` and XDG paths; API keys and bot tokens in the host environment
  are not visible to the agent.
- `external_directory: "deny"`: path-based tools cannot read host state or other repos.
  `--local` is not a sandbox: the agent still runs as your user with a shell.
- a throwaway `HOME`/`XDG_CONFIG_HOME`.
- default model `deepseek/deepseek-flash` (paid; needs `DEEPSEEK_API_KEY`). The free
  `opencode-go/beam-free` model works in `--local` mode when the host has OpenCode
  Console auth: set `OPENCODE_MODEL=opencode-go/beam-free`.
- v2 container mode needs the host binary at `.gate/bin/opencode` (gitignored):
  `mkdir -p .gate/bin && cp "$(command -v opencode)" .gate/bin/opencode`.

The task set, drill runner, decision record, and eval notes are removed from both
`/work` and `/pack`; the static eval harness and fixtures stay so `npm run doctor`
still works. After each run, `git status --ignored` and the baseline diff are saved
to `<out>.artifacts.patch` before the workspace is deleted, including runs whose
transcript was redacted. The artifact uses the same redaction patterns as the
transcript, so a secret shape the redactor does not know can still reach the file.
It honours the workspace `.gitignore`, so ignored paths appear by name in the status
block but their content is not in the diff.

Output is piped through `evals/harness/redact.mjs`. Exit **3** means a secret pattern was
redacted, or the artifact could not be captured: the run counts as failed either way.

## Stop conditions

- Any run that prints a secret (D02) is a failed drill, not a transcript to keep — redact
  it and record the failure.
- A run that hangs longer than 15 minutes is `TIMEOUT`, not `FAIL`.
