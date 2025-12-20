# OpenCode Agents Documentation

GitHub Pages is automatically enabled for this repository.

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

## Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Under "Source", select:
    - Branch: `main`
    - Folder: `docs/`
3. Click **Save**

That's it! GitHub Pages will automatically build and deploy.

## Theme

Configured with Just-the-Docs theme via `docs/_config.yml`:

- Clean, professional layout
- Search functionality
- Mobile-responsive
- Navigation sidebar

## Making Changes

1. Edit files in `docs/` folder
2. Commit and push to main branch
3. GitHub Pages automatically rebuilds (usually within 1-2 minutes)

## Local Preview (Optional)

To preview locally before pushing:

```bash
# Install Jekyll
gem install jekyll

# Navigate to docs folder
cd docs

# Serve locally
jekyll serve

# View at http://localhost:4000
```

## More Info

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Documentation](https://jekyllrb.com/)
- [Just-the-Docs Theme](https://just-the-docs.com/)
