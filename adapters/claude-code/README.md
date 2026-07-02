# Claude Code Plugin

Install the agents-opencode skill pack for Claude Code.

## Install

```bash
# Add the marketplace (one-time — resolves to github.com/shahboura/agents-opencode-claude)
/plugin marketplace add shahboura/agents-opencode-claude

# Install the plugin
/plugin install agents-opencode@shahboura-agents-opencode-claude
```

23 on-demand skills covering:

- **Languages:** .NET, Python, TypeScript, Go, Java, Rust, Ruby, Flutter, React/Next.js, Node.js, SQL
- **Quality:** code review, security audit, refactoring, impact analysis
- **Documentation:** API docs, ADRs, README generation
- **Content:** blogging, content critique, career content
- **Leadership:** engineering management, legal compliance

Skills load on demand — no context cost until invoked.

## Update

```
/plugin update agents-opencode@shahboura-agents-opencode-claude
```

## Publish (maintainers)

```bash
# Generate the distribution
./adapters/claude-code/generate.sh dist --verify

# Push to the marketplace repo
cp -r dist/* ../agents-opencode-claude/
cd ../agents-opencode-claude && git add -A && git commit -m "release v$(node -e "console.log(require('./package.json').version)")" && git push
```
