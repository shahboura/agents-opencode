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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST_KIND="$2"; shift 2 ;;
    --condition) CONDITION="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    --prompt) PROMPT="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --check) CHECK=1; shift ;;
    --local) LOCAL=1; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$CONDITION" ]]; then
  echo "--condition pack|bare is required" >&2
  exit 2
fi

WORK="$(mktemp -d "$ROOT/.gate/drill-work.XXXXXX")"
HOME_DIR="$(mktemp -d "$ROOT/.gate/drill-home.XXXXXX")"
cleanup() { rm -rf "$WORK" "$HOME_DIR"; }
trap cleanup EXIT

# Clean tree at HEAD; uncommitted work must not leak into a drill.
git -C "$ROOT" archive HEAD | tar -x -C "$WORK"

if [[ "$CONDITION" == "bare" ]]; then
  rm -rf "$WORK/.opencode" "$WORK/AGENTS.md" "$WORK/opencode.json"
fi

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
    env -i "${DRILL_ENV[@]}" opencode debug agents 2>/dev/null | grep -c '"id":' || true
    exit 0
  fi
  mkdir -p "$(dirname "$OUT")"
  set +e
  env -i "${DRILL_ENV[@]}" opencode run --standalone --auto --agent "$AGENT" \
    --model "${OPENCODE_MODEL:-opencode-go/beam-free}" "$PROMPT" 2>&1 \
    | node "$ROOT/evals/harness/redact.mjs" "$OUT"
  rc=${PIPESTATUS[0]}
  red=${PIPESTATUS[1]}
  set -e
  [[ "$red" -eq 3 ]] && exit 3
  exit "$rc"
fi

DOCKER_ARGS=(
  --rm
  -v "$ROOT:/pack:ro"
  -v "$WORK:/work"
  -v "$HOME_DIR:/home/drill"
  -e HOME=/home/drill
  -w /work
)
if [[ -n "${DEEPSEEK_API_KEY:-}" ]]; then
  DOCKER_ARGS+=(-e DEEPSEEK_API_KEY)
fi
if [[ "$HOST_KIND" == "v2" ]]; then
  DOCKER_ARGS+=(-v /root/.opencode/bin/opencode:/usr/local/bin/opencode:ro)
fi

CONTAINER='
set -e
if [ "$HOST_KIND" = "v1" ]; then
  npm i -g opencode-ai@1.19.4 --silent >/dev/null 2>&1
fi
if [ "$CONDITION" = "pack" ]; then
  (cd /pack && node install.js --global >/dev/null 2>&1)
fi
if [ "$CHECK" = "1" ]; then
  if [ "$HOST_KIND" = "v2" ]; then
    opencode debug agents 2>/dev/null | grep -c "\"id\":" || true
  else
    opencode debug config 2>/dev/null | grep -c "\"permission\"" || true
  fi
  exit 0
fi
opencode run --standalone --auto --agent "$AGENT" --model "${OPENCODE_MODEL:-opencode-go/deepseek-v4.1-flash}" "$PROMPT"
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
set +e
docker run "${DOCKER_ARGS[@]}" -e HOST_KIND="$HOST_KIND" -e CONDITION="$CONDITION" -e CHECK=0 \
  -e AGENT="$AGENT" -e PROMPT="$PROMPT" \
  node:22-slim bash -lc "$CONTAINER" 2>&1 \
  | node "$ROOT/evals/harness/redact.mjs" "$OUT"
rc=${PIPESTATUS[0]}
red=${PIPESTATUS[1]}
set -e
[[ "$red" -eq 3 ]] && exit 3
exit "$rc"
