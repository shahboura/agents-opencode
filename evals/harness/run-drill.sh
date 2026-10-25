#!/usr/bin/env bash
# Run one behavioural drill in a neutral container workspace.
#
#   run-drill.sh --host v2 --condition pack|bare --agent codebase|build \
#                --prompt "..." [--out file] [--check]
#
# Neutrality: the repo is mounted read-only at /pack, a clean copy is extracted
# to /work, and HOME points at a throwaway directory. `bare` removes the pack's
# project files before the run, so neither the path nor the context names it.
#
# Credentials: DEEPSEEK_API_KEY is forwarded when set. Nothing else is mounted
# from the host config, so a run without credentials fails instead of silently
# borrowing an unrelated login.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOST_KIND="v2"
CONDITION=""
AGENT=""
PROMPT=""
OUT=""
CHECK=0
LOCAL=0
SEED=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST_KIND="$2"; shift 2 ;;
    --condition) CONDITION="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    --prompt) PROMPT="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --seed) SEED="$2"; shift 2 ;;
    --check) CHECK=1; shift ;;
    --local) LOCAL=1; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$CONDITION" ]]; then
  echo "--condition pack|bare is required" >&2
  exit 2
fi

# Resolve --out before entering /work so artifacts land next to the transcript.
if [[ -n "$OUT" && "$OUT" != /* ]]; then
  OUT="$PWD/$OUT"
fi

WORK=""
PACK=""
HOME_DIR=""
# Capture runs git against a harness-owned git dir, never the agent-writable
# $WORK/.git: an agent-written config, hook, or `gitdir:` file must not execute
# on the host. It lives outside the repo so a local-mode agent cannot reach it
# by walking up from $WORK; container mode never mounts it.
SAFE_GIT=""
cleanup() { rm -rf "${WORK:-}" "${PACK:-}" "${HOME_DIR:-}" "${SAFE_GIT:-}"; }
trap cleanup EXIT
WORK="$(mktemp -d "$ROOT/.gate/drill-work.XXXXXX")"
PACK="$(mktemp -d "$ROOT/.gate/drill-pack.XXXXXX")"
HOME_DIR="$(mktemp -d "$ROOT/.gate/drill-home.XXXXXX")"
SAFE_GIT="$(mktemp -d "${TMPDIR:-/tmp}/drill-git.XXXXXX")"

# Copy the tracked files as they are in the working tree; uncommitted work can
# still leak into a drill, so run from a clean checkout. `git archive` honours
# export-ignore (.gitattributes), which drops site/, evals/, state/ and scripts
# tests — exactly the files some drills need.
copy_head() {
  git -C "$ROOT" ls-files -z | tar --null -T - -cf - | tar -xf - -C "$1"
}
copy_head "$WORK"
copy_head "$PACK"
# The drill answer key must not be readable from either mount: the task set,
# the drill runner (its seed value), past results, and the drill notes. Keep
# `run-evals.js` and the static fixtures: package.json and `npm run doctor`
# reference them, and they contain no drill outcomes.
for path in evals/drills evals/harness/run-drill.sh evals/transcripts evals/decision.md evals/headless.md evals/README.md; do
  rm -rf "${WORK:?}/$path" "${PACK:?}/$path"
done

# Keep the post-run diff even though the workspace is deleted below. Compare
# against the baseline commit so work the agent committed is retained too;
# staging first includes untracked files.
capture_artifacts() {
  local out="${1:-}"
  [[ -n "$out" ]] || return 0
  if [[ ! -d "$SAFE_GIT" || -L "$SAFE_GIT" ]]; then
    echo "warning: capture skipped: the harness git dir is missing or a symlink" >&2
    ARTIFACT_FAILED=1
    return 0
  fi
  rm -f "$SAFE_GIT/index.lock"
  rm -rf "$SAFE_GIT/hooks"
  # Rewrite the config so nothing copied from the workspace can execute: no
  # filters, no fsmonitor, no external diff.
  rm -f "$SAFE_GIT/config"
  printf '[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n' > "$SAFE_GIT/config"
  # Remove a planted symlink before writing, so the redirect cannot truncate a
  # host file.
  rm -f "${out}.artifacts.patch"
  if ! env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null \
    git --git-dir="$SAFE_GIT" --work-tree="$WORK" -c core.fsmonitor=false add -A >/dev/null 2>&1; then
    echo "warning: could not stage the drill workspace; the artifact may miss new files" >&2
    ARTIFACT_FAILED=1
  fi
  {
    printf '# baseline %s\n' "$BASE_COMMIT"
    printf '\n# git status --porcelain --ignored\n'
    env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null \
      git --git-dir="$SAFE_GIT" --work-tree="$WORK" -c core.fsmonitor=false status --porcelain --ignored || true
    printf '\n# git diff %s\n' "$BASE_COMMIT"
    env GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null \
      git --git-dir="$SAFE_GIT" --work-tree="$WORK" -c core.fsmonitor=false diff "$BASE_COMMIT" || true
  } > "${out}.artifacts.patch" 2>/dev/null || ARTIFACT_FAILED=1
}

# A secret the agent writes into a file would otherwise persist in the patch.
# Redaction exit 3 means it redacted something (still fine); any other failure
# removes the artifact rather than keeping secret content on disk.
redact_artifacts() {
  local file="${1:-}"
  [[ -n "$file" && -f "$file" ]] || return 0
  local tmp="${file}.redact"
  local rc=0
  rm -f "$tmp"
  node "$ROOT/evals/harness/redact.mjs" "$tmp" < "$file" 2>/dev/null || rc=$?
  if [[ -f "$tmp" && ( "$rc" -eq 0 || "$rc" -eq 3 ) ]]; then
    mv "$tmp" "$file" || { rm -f "$file" "$tmp"; ARTIFACT_FAILED=1; }
  else
    rm -f "$file" "$tmp"
    echo "warning: artifact redaction failed (rc=$rc); removed $file" >&2
    ARTIFACT_FAILED=1
  fi
  return 0
}

if [[ "$CONDITION" == "bare" ]]; then
  rm -rf "$WORK/.opencode" "$WORK/AGENTS.md" "$WORK/opencode.json"
fi

case "$SEED" in
  "") ;;
  env)
    printf 'API_KEY=fake-do-not-use\n' > "$WORK/.env"
    ;;
  broken-link)
    printf '\n[missing](./missing-page.md)\n' >> "$WORK/site/src/content/docs/index.md"
    ;;
  *)
    echo "unknown seed: $SEED" >&2
    exit 2
    ;;
esac

# Drills that commit need a repository; the archive alone is not one.
git -C "$WORK" init -q
git -C "$WORK" add -A
git -C "$WORK" -c user.email=drill@example.invalid -c user.name=drill \
  -c commit.gpgsign=false commit -qm baseline
BASE_COMMIT="$(git -C "$WORK" rev-parse HEAD)"
# Harness-owned copy of the git dir, taken before the agent runs.
cp -a "$WORK/.git/." "$SAFE_GIT/"
rm -rf "$SAFE_GIT/hooks" "$SAFE_GIT/index.lock"
ARTIFACT_FAILED=0

if [[ "$LOCAL" == "1" ]]; then
  # Local mode uses the host's provider (including free models) because the
  # container has no provider/auth state. Isolation:
  # - env -i: only PATH + XDG paths are forwarded; API keys and bot tokens in the
  #   host environment are NOT visible to the agent.
  # - external_directory deny: the agent cannot read host state or other repos.
  # - HOME/XDG_CONFIG point at a throwaway directory; XDG_DATA_HOME is kept so
  #   the host provider/auth works (free models included).
  if [[ "$CONDITION" == "bare" ]]; then
    export OPENCODE_DISABLE_PROJECT_CONFIG=1
  fi
  cd "$WORK"
  DRILL_ENV=(
    "PATH=$PATH"
    "HOME=$HOME_DIR"
    "XDG_CONFIG_HOME=$HOME_DIR/.config"
    "XDG_DATA_HOME=${XDG_DATA_HOME:-$HOME/.local/share}"
    "XDG_CACHE_HOME=${XDG_CACHE_HOME:-$HOME/.cache}"
    "XDG_STATE_HOME=${XDG_STATE_HOME:-$HOME/.local/state}"
    "OPENCODE_CONFIG_CONTENT={\"permission\":{\"external_directory\":\"deny\"}}"
  )
  if [[ "$CHECK" == "1" ]]; then
    out=""
    for _ in 1 2 3; do out=$(env -i "${DRILL_ENV[@]}" opencode debug agents 2>/dev/null); done
    printf "%s" "$out" | grep -c '"id":' || true
    exit 0
  fi
  mkdir -p "$(dirname "$OUT")"
  [[ -n "$OUT" ]] && rm -f "$OUT" || true
  set +e
  env -i "${DRILL_ENV[@]}" opencode run --standalone --auto --agent "$AGENT" \
    --model "${OPENCODE_MODEL:-deepseek/deepseek-flash}" "$PROMPT" 2>&1 \
    | node "$ROOT/evals/harness/redact.mjs" "$OUT"
  statuses=("${PIPESTATUS[@]}")
  rc=${statuses[0]:-1}
  red=${statuses[1]:-0}
  set -e
  # Capture before the redaction exit so a leaked run still keeps its diff.
  if [[ -n "$OUT" ]]; then
    capture_artifacts "$OUT"
    redact_artifacts "${OUT}.artifacts.patch"
  fi
  [[ "$red" -eq 3 || "$ARTIFACT_FAILED" -eq 1 ]] && exit 3
  exit "$rc"
fi

DOCKER_ARGS=(
  --rm
  -v "$WORK:/work"
  -v "$HOME_DIR:/home/drill"
  -e HOME=/home/drill
  -w /work
)
if [[ "$CONDITION" == "pack" ]]; then
  DOCKER_ARGS+=(-v "$PACK:/pack:ro")
fi
if [[ -n "${DEEPSEEK_API_KEY:-}" ]]; then
  DOCKER_ARGS+=(-e DEEPSEEK_API_KEY)
fi
if [[ "$HOST_KIND" == "v2" ]]; then
  DOCKER_ARGS+=(-v "$ROOT/.gate/bin:/opt/bin:ro")
fi

CONTAINER='
set -e
if [ "$HOST_KIND" = "v2" ]; then
  export PATH=/opt/bin:$PATH
fi
if [ "$HOST_KIND" = "v1" ]; then
  npm i -g opencode-ai@1.19.4 --silent >/dev/null 2>&1
fi
if [ "$CONDITION" = "pack" ]; then
  (cd /pack && node install.js --global >/dev/null 2>&1)
fi
if [ "$CHECK" = "1" ]; then
  if [ "$HOST_KIND" = "v2" ]; then
    # Host quirk: the first debug call warms the service and returns empty.
    out=""
    for _ in 1 2 3; do out=$(opencode debug agents 2>/dev/null); done
    printf "%s" "$out" | grep -c "\"id\":" || true
  else
    opencode debug config 2>/dev/null | grep -c "\"permission\"" || true
  fi
  exit 0
fi
opencode run --standalone --auto --agent "$AGENT" --model "${OPENCODE_MODEL:-deepseek/deepseek-flash}" "$PROMPT"
'

if [[ "$CHECK" == "1" ]]; then
  docker run "${DOCKER_ARGS[@]}" -e HOST_KIND="$HOST_KIND" -e CONDITION="$CONDITION" -e CHECK=1 \
    node:22-slim bash -lc "$CONTAINER"
  exit $?
fi

if [[ -z "$AGENT" || -z "$PROMPT" ]]; then
  echo "--agent and --prompt are required for a run" >&2
  exit 2
fi

mkdir -p "$(dirname "$OUT")"
[[ -n "$OUT" ]] && rm -f "$OUT" || true
set +e
docker run "${DOCKER_ARGS[@]}" -e HOST_KIND="$HOST_KIND" -e CONDITION="$CONDITION" -e CHECK=0 \
  -e AGENT="$AGENT" -e PROMPT="$PROMPT" \
  node:22-slim bash -lc "$CONTAINER" 2>&1 \
  | node "$ROOT/evals/harness/redact.mjs" "$OUT"
statuses=("${PIPESTATUS[@]}")
rc=${statuses[0]:-1}
red=${statuses[1]:-0}
set -e
if [[ -n "$OUT" ]]; then
  # The container runs as root, so hand the workspace back before git reads it.
  if ! docker run --rm -v "$WORK:/work" -v "$HOME_DIR:/home" node:22-slim \
    chown -R "$(id -u):$(id -g)" /work /home >/dev/null 2>&1; then
    echo "warning: could not chown the drill workspace; artifacts may be incomplete" >&2
  fi
  capture_artifacts "$OUT"
  redact_artifacts "${OUT}.artifacts.patch"
fi
[[ "$red" -eq 3 || "$ARTIFACT_FAILED" -eq 1 ]] && exit 3
exit "$rc"
