---
name: project-bootstrap
description: Create baseline OpenCode project context, AGENTS.md scaffold, and README.md
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "2.0.0"
  audience: maintainers
  workflow: initialization
---

## What I do
- Create a minimal `AGENTS.md` if missing
- Generate a structured `README.md` for new or existing projects
- Add a short project context template
- Explain how to update context over time

## When to use me
Use this when starting a new project or when `AGENTS.md` or `README.md` is missing.
Ask clarifying questions about tech stack and standards before writing.

## Key Rules

### AGENTS.md
- Keep the template short and practical
- Prefer bullet points over long paragraphs
- Include these standard sections:
  - **Project Structure** — `.opencode/`, `docs/`, key directories
  - **Language & Domain Skills** — available skill list
  - **Agent Usage** — primary agents and subagents
  - **Quality Requirements** — lint, test, typecheck standards
  - **Context Persistence Format** — canonical milestone entry template (see below)
  - **Milestones** — placeholder for timestamped entries
- Ask about tech stack and conventions before generating content
- Do not add language-specific rules; those belong in skills
- Respect repository scope decisions (if policy is core-only, do not suggest optional skill packs by default)
- Context Persistence Format template:
  ```
  ### YYYY-MM-DD HH:MM - [Brief Task Description]
  **Agent:** [agent-name]
  **Summary:** [What was done]
  - Key decisions, files changed, patterns used
  - Lessons learned for future sessions

  Format: date to minute precision, latest first (prepend), 3-5 bullets max,
  skip trivial edits, auto-prunes at 100KB.
  ```

### README Creation
Include these standard sections where applicable:

**Overview** — Clear value proposition in first paragraph, target audience, key differentiators.
**Getting Started** — Prerequisites, quick-start commands, verification steps.
**Installation** — Multiple methods (local dev, Docker, platform-specific), common issues.
**Usage** — Start simple, then show advanced; real-world examples; common use cases.
**Configuration** — All env vars documented; required vs optional marked; security considerations.
**API Reference** — Most common endpoints with request/response examples; link to full docs.
**Development** — Dev environment setup, code organization, workflow, testing approach.
**Testing** — How to run tests, coverage targets, test structure (unit/integration/e2e).
**Deployment** — Environment setup, build steps, platform guides (Heroku, Docker, cloud).
**Contributing** — Branch naming, commit conventions, PR process, code standards.
**License** — SPDX identifier and link.
**Support** — Documentation link, community channel, issue tracker, contact info.

Best practices:
- Keep it scannable with headers, lists, and tables
- Show, don't just tell — include real code examples
- Be concise — link to detailed docs instead of dumping everything
- Add badges (build status, coverage, version, license)
- Be welcoming — assume no prior knowledge, use a friendly tone

## Validation Commands
```bash
# No automated validation — manual review
# [ ] AGENTS.md exists and has project context
# [ ] Structure matches repository conventions
# [ ] README.md has clear project description
# [ ] Installation instructions are tested and verifiable
# [ ] All links are valid
# [ ] License and support/contact info present
```
