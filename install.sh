#!/bin/bash
# OpenCode Agents Installation Script (Linux/macOS)

set -e

REPO_URL="https://github.com/shahboura/agents-opencode.git"
TEMP_DIR=$(mktemp -d)
TARGET_DIR="${1:-$HOME/.opencode}"

echo "🚀 Installing OpenCode Agents..."

# Download repository
echo "📥 Downloading repository..."
if command -v git >/dev/null 2>&1; then
    git clone --depth 1 --quiet "$REPO_URL" "$TEMP_DIR"
else
    echo "❌ Error: git is required but not installed."
    exit 1
fi

# Change to downloaded directory
cd "$TEMP_DIR"

# Verify we have the right files
if [ ! -d ".opencode/agent" ]; then
    echo "❌ Error: Downloaded repository is missing .opencode/agent directory."
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

echo "📁 Installing to: $TARGET_DIR"

# Copy all OpenCode directories
for dir in .opencode/*/; do
    if [ -d "$dir" ]; then
        dirname=$(basename "$dir")
        echo "📋 Copying $dirname..."
        cp -r "$dir" "$TARGET_DIR/"
    fi
done

# Copy configuration files
if [ -f "opencode.json" ]; then
    cp opencode.json "$TARGET_DIR/"
fi

# Copy AGENTS.md template only if it doesn't exist (preserve user history)
if [ -f "AGENTS.md" ] && [ ! -f "$TARGET_DIR/AGENTS.md" ]; then
    cp AGENTS.md "$TARGET_DIR/"
fi

# Clean up
cd /
rm -rf "$TEMP_DIR"

echo "✅ Installation complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Open OpenCode: opencode"
echo "2. Type @ to see available agents"
echo "3. Try: @codebase Create a user API endpoint"
echo ""
echo "📚 For more info: https://github.com/shahboura/agents-opencode"