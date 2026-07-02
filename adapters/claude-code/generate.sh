#!/usr/bin/env bash
set -euo pipefail

# Generate Claude Code plugin distribution from agents-opencode skills.
# Copies skills, strips OpenCode-specific frontmatter and sections.
# Usage:
#   ./generate.sh [output-dir]          Generate distribution
#   ./generate.sh [output-dir] --verify  Generate + validate output

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="dist"
VERIFY=false

for arg in "$@"; do
  if [ "$arg" = "--verify" ]; then
    VERIFY=true
  else
    OUTPUT="$arg"
  fi
done

# Safety: prevent rm -rf on dangerous paths
if [ -z "$OUTPUT" ] || [ "$OUTPUT" = "/" ] || [ "$OUTPUT" = "." ] || [[ "$OUTPUT" == /* ]] && [ ! -d "$OUTPUT" ]; then
  # Allow absolute paths that already exist (e.g., /tmp/dist)
  if [ ! -d "$OUTPUT" ]; then
    echo "ERROR: Output directory must be a relative path or an existing directory"
    exit 1
  fi
fi

SKILLS_SRC="$SCRIPT_DIR/../../.opencode/skills"
PLUGIN_SRC="$SCRIPT_DIR/.claude-plugin"
VERIFY_FAILURES=0

# Auto-detect version from package.json
VERSION=$(node -e "console.log(require('$SCRIPT_DIR/../../package.json').version)" 2>/dev/null || echo "0.0.0")

echo "Generating Claude Code plugin distribution (v$VERSION)..."

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT/skills" "$OUTPUT/.claude-plugin"

# Copy .claude-plugin directory with version substituted
cp "$PLUGIN_SRC/plugin.json" "$OUTPUT/.claude-plugin/plugin.json"
cp "$PLUGIN_SRC/marketplace.json" "$OUTPUT/.claude-plugin/marketplace.json"
node -e "
  const fs = require('fs');
  ['plugin.json', 'marketplace.json'].forEach(f => {
    const p = '$OUTPUT/.claude-plugin/' + f;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (f === 'plugin.json') j.version = '$VERSION';
    if (f === 'marketplace.json') j.plugins[0].version = '$VERSION';
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  });
"

for skill_dir in "$SKILLS_SRC"/*/; do
  name=$(basename "$skill_dir")
  skill_file="$skill_dir/SKILL.md"

  if [ ! -f "$skill_file" ]; then
    continue
  fi

  mkdir -p "$OUTPUT/skills/$name"

  # Copy skill, stripping OpenCode-specific content
  # Remove: compatibility field, metadata block (but preserve closing ---)
  # Remove: Skill Activation Policy section
  awk '
    /^compatibility:/ { next }
    /^metadata:/ { in_meta=1; next }
    in_meta && /^---$/ { in_meta=0; print "---"; next }
    in_meta { next }
    /^## Skill Activation Policy/ { in_skp=1; next }
    in_skp && /^## / { in_skp=0 }
    in_skp { next }
    !in_skp { print }
    END { if (in_skp) in_skp=0 }
  ' "$skill_file" > "$OUTPUT/skills/$name/SKILL.md"

  # Copy reference files if they exist
  if [ -d "$skill_dir/references" ]; then
    cp -r "$skill_dir/references" "$OUTPUT/skills/$name/"
  fi

  echo "  $name"
done

skill_count=$(ls -d "$OUTPUT/skills"/*/ 2>/dev/null | wc -l)
echo ""
echo "Done. $skill_count skills in $OUTPUT/"

if $VERIFY; then
  echo ""
  echo "=== Verification ==="

  # 1. Validate plugin.json
  node -e "
    const fs = require('fs');
    const p = '$OUTPUT/.claude-plugin/plugin.json';
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!j.name || !j.version || !j.description) {
      console.error('❌ plugin.json: missing required fields (name, version, description)');
      process.exit(1);
    }
    console.log('✅ plugin.json: valid (v' + j.version + ')');
  " 2>/dev/null || { echo "❌ plugin.json: INVALID"; VERIFY_FAILURES=$((VERIFY_FAILURES + 1)); }

  # 2. Check all skills have valid frontmatter + stripped correctly
  errors=0
  for skill in "$OUTPUT/skills"/*/SKILL.md; do
    name=$(basename "$(dirname "$skill")")
    if ! head -n 1 "$skill" | grep -q "^---$"; then
      echo "❌ $name: missing opening ---"
      errors=$((errors + 1))
      continue
    fi
    if ! awk 'NR>1 && /^---$/ {found=1; exit} END {exit !found}' "$skill"; then
      echo "❌ $name: missing closing ---"
      errors=$((errors + 1))
      continue
    fi
    if grep -q "^compatibility:" "$skill"; then
      echo "❌ $name: compatibility field not stripped"
      errors=$((errors + 1))
    fi
    if grep -q "Skill Activation Policy" "$skill"; then
      echo "❌ $name: Skill Activation Policy not stripped"
      errors=$((errors + 1))
    fi
  done

  if [ "$errors" -eq 0 ]; then
    echo "✅ All $skill_count skills: valid frontmatter, OpenCode content stripped"
  else
    echo "❌ $errors skill(s) have issues"
    VERIFY_FAILURES=$((VERIFY_FAILURES + 1))
  fi

  # 3. Check for broken internal references
  ref_errors=0
  for skill in "$OUTPUT/skills"/*/SKILL.md; do
    name=$(basename "$(dirname "$skill")")
    skill_dir=$(dirname "$skill")
    while IFS= read -r ref; do
      ref_path=$(echo "$ref" | sed 's/.*](\(.*\)).*/\1/' | sed 's/#.*//')
      if [ -z "$ref_path" ] || [[ "$ref_path" == http* ]]; then
        continue
      fi
      if [ ! -e "$skill_dir/$ref_path" ]; then
        echo "❌ $name: broken reference → $ref_path"
        ref_errors=$((ref_errors + 1))
      fi
    done < <(grep -Eo '\[[^]]*\]\([^)]*\)' "$skill" 2>/dev/null || true)
  done
  if [ "$ref_errors" -eq 0 ]; then
    echo "✅ All internal skill references resolve"
  else
    VERIFY_FAILURES=$((VERIFY_FAILURES + 1))
  fi

  echo ""
  if [ "$VERIFY_FAILURES" -eq 0 ]; then
    echo "✅ Verification passed"
  else
    echo "❌ Verification failed with $VERIFY_FAILURES check(s)"
    exit 1
  fi
fi

echo ""
echo "Publish:  push dist/ contents to github.com/shahboura/agents-opencode-claude"
echo "Install:  /plugin marketplace add shahboura/agents-opencode-claude"
echo "          /plugin install agents-opencode@shahboura"
