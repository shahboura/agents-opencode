---
layout: default
title: Documentation Setup
nav_exclude: true
---

# OpenCode Agents Documentation

Documentation using Just the Docs theme.

## Documentation Structure

The documentation is built from the `docs/` folder:

- **index.md** - Navigation hub
- **getting-started.md** - Quick 5-minute tutorial
- **agents/** - Agent reference and guides
- **prompts.md** - Slash command reference
- **instructions.md** - Coding standards
- **workflows.md** - Real-world examples
- **customization.md** - Adapt to your project
- **troubleshooting.md** - FAQ and solutions

## Theme

Configured with Just the Docs theme via `docs/_config.yml`:

- Clean, professional layout
- Search functionality
- Mobile-responsive
- Navigation sidebar

## Local Preview

To preview locally:

```bash
# Install dependencies
cd docs
bundle install

# Serve locally
bundle exec jekyll serve

# View at http://localhost:4000
```

## More Info

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Documentation](https://jekyllrb.com/)
- [Just-the-Docs Theme](https://just-the-docs.com/)
