#!/bin/bash
# OpenCode Agents Installation Script (Linux/macOS)

set -e

echo "🚀 Installing OpenCode Agents..."

# Check if we're in the right directory
if [ ! -d ".opencode/agent" ]; then
    echo "❌ Error: .opencode/agent directory not found. Please run this script from the agents-opencode repository root."
    exit 1
fi

# Create target directory if it doesn't exist
TARGET_DIR="${1:-$HOME/.opencode}"
mkdir -p "$TARGET_DIR"

echo "📁 Installing to: $TARGET_DIR"

# Copy agent files
cp -r .opencode/agent "$TARGET_DIR/"

echo "✅ Installation complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Open OpenCode: opencode"
echo "2. Type @ to see available agents"
echo "3. Try: @codebase Create a user API endpoint"
echo ""
echo "📚 For more info: https://github.com/shahboura/agents-opencode"