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
- Include a brief "Milestones" section placeholder
- Ask about tech stack and conventions before generating content
- Do not add language-specific rules; those belong in skills
- Respect repository scope decisions (if policy is core-only, do not suggest optional skill packs by default)

### README Creation
Include these standard sections where applicable: Overview, Getting Started, Installation, Usage, Configuration, API Reference, Development, Testing, Deployment, Contributing, License, Support.

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
