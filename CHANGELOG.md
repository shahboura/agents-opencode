# Changelog

## [2.2.0](https://github.com/shahboura/agents-opencode/compare/v2.1.1...v2.2.0) (2026-07-02)


### Features

* v2.2.0 — cache metrics, docs pruning, agent modernization, human-in-loop, code-change-impact skill ([#65](https://github.com/shahboura/agents-opencode/issues/65)) ([24cd6d4](https://github.com/shahboura/agents-opencode/commit/24cd6d4a065e8aabbd28b0b0e06d8b71debe1edb))

## [2.1.1](https://github.com/shahboura/agents-opencode/compare/v2.1.0...v2.1.1) (2026-05-07)


### Bug Fixes

* exclude dev files from GitHub release archives via export-ignore ([#47](https://github.com/shahboura/agents-opencode/issues/47)) ([855507b](https://github.com/shahboura/agents-opencode/commit/855507bd48837cfe28c64afb8cf784c27231fabf))
* exclude dev files from GitHub release archives via export-ignore ([#49](https://github.com/shahboura/agents-opencode/issues/49)) ([2296fbc](https://github.com/shahboura/agents-opencode/commit/2296fbcebb8bbcf7d987f40b64c653300a666fb9))

## [2.1.0](https://github.com/shahboura/agents-opencode/compare/v2.0.1...v2.1.0) (2026-05-07)


### Features

* add career-content skill with cross-review fixes and Skill-First refactor ([#45](https://github.com/shahboura/agents-opencode/issues/45)) ([6519d87](https://github.com/shahboura/agents-opencode/commit/6519d87dd9595436df07780ade90ee68be815d5e))

## [2.0.1](https://github.com/shahboura/agents-opencode/compare/v2.0.0...v2.0.1) (2026-05-07)


### Bug Fixes

* add scripts/lib to npm package files and npx integrity test ([#43](https://github.com/shahboura/agents-opencode/issues/43)) ([dddad7f](https://github.com/shahboura/agents-opencode/commit/dddad7f6688d56a3f6099a5a155ee1407366059c))

## [2.0.0](https://github.com/shahboura/agents-opencode/compare/v1.5.0...v2.0.0) (2026-05-07)


### ⚠ BREAKING CHANGES

* removed legacy .opencode/agent/ directory support. Only .opencode/agents/ (plural) is supported. Users must run 'mv .opencode/agent .opencode/agents' before upgrading.
* removed legacy .opencode/agent/ directory support. Only .opencode/agents/ (plural) is supported. Users must run 'mv .opencode/agent .opencode/agents' before upgrading.

### Features

* add legal-advisor standalone mode and code quality fixes ([#41](https://github.com/shahboura/agents-opencode/issues/41)) ([4c4c259](https://github.com/shahboura/agents-opencode/commit/4c4c259896ba624a70d7f03412d984ca4f435078))
* add OpenCode /plugin install support and legal-advisor standalone mode ([#39](https://github.com/shahboura/agents-opencode/issues/39)) ([b16848b](https://github.com/shahboura/agents-opencode/commit/b16848bc43f329919bf019c65810122e1f7f3fcd))
* **agents:** add plugin compatibility, legal-advisor, and memory optimization ([#37](https://github.com/shahboura/agents-opencode/issues/37)) ([aec36b7](https://github.com/shahboura/agents-opencode/commit/aec36b712332db42292f3a06f2d0df263c0e5c2d))

## [2.0.0] - 2026-05-05

### Breaking Changes [capability:breaking]
- Removed legacy `.opencode/agent/` directory support. Only `.opencode/agents/` (plural) is supported.
  Migrate by running: `mv .opencode/agent .opencode/agents`

### Added [capability:agents]
- `legal-advisor` agent: license auditing, IP review, data privacy assessment, and regulatory guidance
- `/legal-review` command: review licenses, compliance, and data privacy
- `legal-advisor` skill with progressive disclosure (core + license-matrix + privacy-checklists references)

### Added [capability:plugins]
- OpenCode runtime plugin with compaction hooks, safety checks, and environment injection
- Plugin registration via `opencode.json` — compatible with OpenCode `Install plugin` command
- Config merger handles plugin array merging to prevent duplicate entries

### Changed [capability:memory]
- Instruction files refactored for progressive disclosure (core + reference split for 4 files)
- Session state contract expanded with plugin_version, legal_reviews, compaction_count
- Handoff packets now include Plugin Context section
- Context size checker adds per-file instruction budget warnings (200-line threshold)

### Changed [capability:validation]
- Skills standardized against agentskills.io specification (license, compatibility, metadata)
- Removed legacy `$ARGUMENTS` token check from eval harness
- Removed legacy agent directory fallback from validator

### Changed [capability:refactor]
- install.js modularized into scripts/lib/ (paths, file-ops, config-mutator)
- 5 existing agents refreshed with legal-aware and best-practice updates

## [1.5.0](https://github.com/shahboura/agents-opencode/compare/v1.4.2...v1.5.0) (2026-04-25)


### Features

* **governance:** add risk-aware validation, eval artifacts, and project state/handoff workflows ([#31](https://github.com/shahboura/agents-opencode/issues/31)) ([8155365](https://github.com/shahboura/agents-opencode/commit/8155365abe47ff1d3886366810ac32c3d46d476c))

## [1.4.2](https://github.com/shahboura/agents-opencode/compare/v1.4.1...v1.4.2) (2026-04-24)


### Bug Fixes

* **ci:** ensure gitleaks PR scan works in validation workflow ([21f65b1](https://github.com/shahboura/agents-opencode/commit/21f65b10e2dd624b8642c7f1b372c74f30350010))

## [Unreleased]

### Features

* [capability:workflow] add bounded loop execution workflow (`/execution-loop`, `/stop-loop`) with loop protocol guidance across orchestrator/codebase/review agents
* [capability:validation] add `doctor` validation entrypoint and route `validate:all` through it

### Bug Fixes

* [capability:validation] improve validation reliability by excluding `example/**` from markdown/docs checks and fixing Windows npm spawn behavior in doctor
* [capability:agents] migrate agent layout to canonical `.opencode/agents/` and align installer/validation/docs to the plural standard
* [capability:security] add CI secret scanning to validation summary gating

## [1.4.1](https://github.com/shahboura/agents-opencode/compare/v1.4.0...v1.4.1) (2026-03-15)


### Bug Fixes

* **release:** trigger patch release ([af5ecf3](https://github.com/shahboura/agents-opencode/commit/af5ecf3bac0d3ed70cc4bc0999e259ce527ae1cd))
* installer backup redesign with readable sessions and restore hints ([#13](https://github.com/shahboura/agents-opencode/pull/13))

## [1.4.0](https://github.com/shahboura/agents-opencode/compare/v1.3.1...v1.4.0) (2026-03-15)


### Features

* harden installer lifecycle and adopt skill-first instruction model ([#11](https://github.com/shahboura/agents-opencode/issues/11)) ([dddcf8c](https://github.com/shahboura/agents-opencode/commit/dddcf8c338d1bfa38cac62f100886d57b1d9a5d5))

## [1.3.1](https://github.com/shahboura/agents-opencode/compare/v1.3.0...v1.3.1) (2026-03-13)


### Bug Fixes

* remove redundant package entrypoint files ([7438b49](https://github.com/shahboura/agents-opencode/commit/7438b4932022ff4266ce714a0024a8ff62dfeb69))

## [1.3.0](https://github.com/shahboura/agents-opencode/compare/agents-opencode-v1.2.2...v1.3.0) (2026-03-12)


### Features

* add back markdown linting with stable version ([0fae9c2](https://github.com/shahboura/agents-opencode/commit/0fae9c2625eea44b1fedb62c6ae0b0d2f42d1fac))
* Add Ctrl+K search shortcut and search hint ([a710e4b](https://github.com/shahboura/agents-opencode/commit/a710e4bdc818fa59bf5595c60a2c9c5b8ea203b9))
* Add custom dark mode toggle with JavaScript fallback ([5e4f6ad](https://github.com/shahboura/agents-opencode/commit/5e4f6adb3fcf263bce6367fe40f3e3f6845db887))
* Add dark/light mode support with system preference and toggle ([5e79a36](https://github.com/shahboura/agents-opencode/commit/5e79a36dfecbbb73a1feb6dc904a313528b5f9f1))
* add reusable skills ([af814bf](https://github.com/shahboura/agents-opencode/commit/af814bfb97fe8d690697c9d041b64c51bb27c7a4))
* Completely redesign README for better UX ([80eb130](https://github.com/shahboura/agents-opencode/commit/80eb13034baa0dadcb57efdce192701bd0bb0a12))
* enhance brutal-critic with research capabilities and sync docs ([66a29fe](https://github.com/shahboura/agents-opencode/commit/66a29fe7d49976c6dabb7bd3ca420f82a2386dda))
* Enhanced uninstall with global/local modes and complete self-cleanup ([a956fe7](https://github.com/shahboura/agents-opencode/commit/a956fe7ad0de438e1534891cd47728fac93f6770))
* improve command routing metadata and package-based install flow ([a97fbbd](https://github.com/shahboura/agents-opencode/commit/a97fbbd45d4c85184909854b9356b5770a7b6da6))
* Improve installation script performance and features ([254654b](https://github.com/shahboura/agents-opencode/commit/254654bd664c108e3e919677106dbf0e0fcf531c))
* Migrate to Beautiful Jekyll theme ([2861c98](https://github.com/shahboura/agents-opencode/commit/2861c98922115bb629fdd37d8ffca3b71c6bcd54))
* simplify installation for Windows/Linux only ([efc70b6](https://github.com/shahboura/agents-opencode/commit/efc70b6e48dfcb7de09056c99bacd707ff15b5ae))
* Uninstall removes .opencode entirely without backup ([2ab9687](https://github.com/shahboura/agents-opencode/commit/2ab9687dba11d5fc2d89cdebe6d87960b99c9070))
* update installation scripts to download from git ([4a4e932](https://github.com/shahboura/agents-opencode/commit/4a4e9327a438c7ebe44b9b03bc6b6bc08650a8c7))
* Update uninstall to work on current directory with self-cleanup ([909e5b4](https://github.com/shahboura/agents-opencode/commit/909e5b48ed8f25e164b2909d4057fb0493640e09))
* upgrade markdownlint-cli to latest version (0.47.0) ([de19bb8](https://github.com/shahboura/agents-opencode/commit/de19bb8236b519ed69f230fff60ae3e97e5391d3))


### Bug Fixes

* Change em-advisor mode from subagent to primary ([ada298c](https://github.com/shahboura/agents-opencode/commit/ada298c0fe9a34b5557a06d5ec7c0c428fa0c878))
* Comment out avatar field for Beautiful Jekyll compatibility ([6b13aa1](https://github.com/shahboura/agents-opencode/commit/6b13aa1652b63f21e0aad590de237ca016712e85))
* Comment out collections for Beautiful Jekyll compatibility ([25fdcff](https://github.com/shahboura/agents-opencode/commit/25fdcff40b038c5f124dccb0c40d5b9cdfaa46ff))
* configure markdownlint to ignore AGENTS.md and fix line length issues ([4005775](https://github.com/shahboura/agents-opencode/commit/40057758aac87a0ac5217f4258a727ca56e43549))
* correct task permissions, compact em-advisor, add skills and commands ([e4303f7](https://github.com/shahboura/agents-opencode/commit/e4303f77962c81797084045e4a08d991ecac92dc))
* Enhanced repository self-cleanup with AGENTS.md backup and thorough cleanup ([551d176](https://github.com/shahboura/agents-opencode/commit/551d1768c8daba36f0c655d4bc7edc71fc972722))
* harden publish CI, fix agent permissions and consistency ([df926df](https://github.com/shahboura/agents-opencode/commit/df926df6c878db7507272d44805079fa7f692e55))
* harden skill activation policy and permission guardrails across agents ([24c89ae](https://github.com/shahboura/agents-opencode/commit/24c89ae0a7993f4a9044acbad88b120e4ebaaa20))
* Improve search placeholder and dark mode toggle visibility ([f3d6354](https://github.com/shahboura/agents-opencode/commit/f3d63541de71e4a880dd037e4e3c66873ae6cb5a))
* Move uninstall handling before repository cloning ([c5efbb6](https://github.com/shahboura/agents-opencode/commit/c5efbb66b48421503bb20b45ebde641794cd1e64))
* Remove jekyll-sitemap plugin for GitHub Pages compatibility ([34b0184](https://github.com/shahboura/agents-opencode/commit/34b0184f76dc82daa97903f5c523f90cd9013640))
* remove lint-markdown job from GitHub Actions workflow ([bbcede6](https://github.com/shahboura/agents-opencode/commit/bbcede697298435593503538de8dfcb4ac77b141))
* remove references to lint:md script from documentation ([50910c6](https://github.com/shahboura/agents-opencode/commit/50910c675c9fb3f529bd6ece4325a1448ca0a2f7))
* remove remaining linting dependencies and fix README formatting ([f3b31d1](https://github.com/shahboura/agents-opencode/commit/f3b31d1b628e7ba7bfa8c9814abedf4175435417))
* remove remaining linting scripts from package.json ([7bd5759](https://github.com/shahboura/agents-opencode/commit/7bd5759b947793455de592e7152dc9874ee023bd))
* Resolve linting and validation issues ([ad822bc](https://github.com/shahboura/agents-opencode/commit/ad822bccc03309282ce4cf48dc00af6bc39c2941))
* Resolve UI issues with just-the-docs configuration ([845474d](https://github.com/shahboura/agents-opencode/commit/845474dc913b58479bb84baf389b44122a92bece))
* Switch back to just-the-docs with proper dark mode ([3387f2a](https://github.com/shahboura/agents-opencode/commit/3387f2af1781ac92a4ff3e474cecad7ffd283cb8))
* trigger post-concurrency release publish cycle ([874038e](https://github.com/shahboura/agents-opencode/commit/874038e20ad3b32b52a28d1205855635c4b0744a))
* trigger release pipeline for next patch ([40b26e2](https://github.com/shahboura/agents-opencode/commit/40b26e29789da0c8d723e33a95fc730644ec5c7f))

## [1.2.2](https://github.com/shahboura/agents-opencode/compare/agents-opencode-v1.2.1...agents-opencode-v1.2.2) (2026-03-09)


### Bug Fixes

* trigger post-concurrency release publish cycle ([874038e](https://github.com/shahboura/agents-opencode/commit/874038e20ad3b32b52a28d1205855635c4b0744a))

## [1.2.1](https://github.com/shahboura/agents-opencode/compare/agents-opencode-v1.2.0...agents-opencode-v1.2.1) (2026-03-09)


### Bug Fixes

* trigger release pipeline for next patch ([40b26e2](https://github.com/shahboura/agents-opencode/commit/40b26e29789da0c8d723e33a95fc730644ec5c7f))

## [1.2.0](https://github.com/shahboura/agents-opencode/compare/v1.1.2...agents-opencode-v1.2.0) (2026-03-09)

### Features

* add back markdown linting with stable version ([0fae9c2](https://github.com/shahboura/agents-opencode/commit/0fae9c2625eea44b1fedb62c6ae0b0d2f42d1fac))
* Add Ctrl+K search shortcut and search hint ([a710e4b](https://github.com/shahboura/agents-opencode/commit/a710e4bdc818fa59bf5595c60a2c9c5b8ea203b9))
* Add custom dark mode toggle with JavaScript fallback ([5e4f6ad](https://github.com/shahboura/agents-opencode/commit/5e4f6adb3fcf263bce6367fe40f3e3f6845db887))
* Add dark/light mode support with system preference and toggle ([5e79a36](https://github.com/shahboura/agents-opencode/commit/5e79a36dfecbbb73a1feb6dc904a313528b5f9f1))
* add reusable skills ([af814bf](https://github.com/shahboura/agents-opencode/commit/af814bfb97fe8d690697c9d041b64c51bb27c7a4))
* Completely redesign README for better UX ([80eb130](https://github.com/shahboura/agents-opencode/commit/80eb13034baa0dadcb57efdce192701bd0bb0a12))
* enhance brutal-critic with research capabilities and sync docs ([66a29fe](https://github.com/shahboura/agents-opencode/commit/66a29fe7d49976c6dabb7bd3ca420f82a2386dda))
* Enhanced uninstall with global/local modes and complete self-cleanup ([a956fe7](https://github.com/shahboura/agents-opencode/commit/a956fe7ad0de438e1534891cd47728fac93f6770))
* Improve installation script performance and features ([254654b](https://github.com/shahboura/agents-opencode/commit/254654bd664c108e3e919677106dbf0e0fcf531c))
* Migrate to Beautiful Jekyll theme ([2861c98](https://github.com/shahboura/agents-opencode/commit/2861c98922115bb629fdd37d8ffca3b71c6bcd54))
* simplify installation for Windows/Linux only ([efc70b6](https://github.com/shahboura/agents-opencode/commit/efc70b6e48dfcb7de09056c99bacd707ff15b5ae))
* Uninstall removes .opencode entirely without backup ([2ab9687](https://github.com/shahboura/agents-opencode/commit/2ab9687dba11d5fc2d89cdebe6d87960b99c9070))
* update installation scripts to download from git ([4a4e932](https://github.com/shahboura/agents-opencode/commit/4a4e9327a438c7ebe44b9b03bc6b6bc08650a8c7))
* Update uninstall to work on current directory with self-cleanup ([909e5b4](https://github.com/shahboura/agents-opencode/commit/909e5b48ed8f25e164b2909d4057fb0493640e09))
* upgrade markdownlint-cli to latest version (0.47.0) ([de19bb8](https://github.com/shahboura/agents-opencode/commit/de19bb8236b519ed69f230fff60ae3e97e5391d3))

### Bug Fixes

* Change em-advisor mode from subagent to primary ([ada298c](https://github.com/shahboura/agents-opencode/commit/ada298c0fe9a34b5557a06d5ec7c0c428fa0c878))
* Comment out avatar field for Beautiful Jekyll compatibility ([6b13aa1](https://github.com/shahboura/agents-opencode/commit/6b13aa1652b63f21e0aad590de237ca016712e85))
* Comment out collections for Beautiful Jekyll compatibility ([25fdcff](https://github.com/shahboura/agents-opencode/commit/25fdcff40b038c5f124dccb0c40d5b9cdfaa46ff))
* configure markdownlint to ignore AGENTS.md and fix line length issues ([4005775](https://github.com/shahboura/agents-opencode/commit/40057758aac87a0ac5217f4258a727ca56e43549))
* correct task permissions, compact em-advisor, add skills and commands ([e4303f7](https://github.com/shahboura/agents-opencode/commit/e4303f77962c81797084045e4a08d991ecac92dc))
* Enhanced repository self-cleanup with AGENTS.md backup and thorough cleanup ([551d176](https://github.com/shahboura/agents-opencode/commit/551d1768c8daba36f0c655d4bc7edc71fc972722))
* harden publish CI, fix agent permissions and consistency ([df926df](https://github.com/shahboura/agents-opencode/commit/df926df6c878db7507272d44805079fa7f692e55))
* harden skill activation policy and permission guardrails across agents ([24c89ae](https://github.com/shahboura/agents-opencode/commit/24c89ae0a7993f4a9044acbad88b120e4ebaaa20))
* Improve search placeholder and dark mode toggle visibility ([f3d6354](https://github.com/shahboura/agents-opencode/commit/f3d63541de71e4a880dd037e4e3c66873ae6cb5a))
* Move uninstall handling before repository cloning ([c5efbb6](https://github.com/shahboura/agents-opencode/commit/c5efbb66b48421503bb20b45ebde641794cd1e64))
* Remove jekyll-sitemap plugin for GitHub Pages compatibility ([34b0184](https://github.com/shahboura/agents-opencode/commit/34b0184f76dc82daa97903f5c523f90cd9013640))
* remove lint-markdown job from GitHub Actions workflow ([bbcede6](https://github.com/shahboura/agents-opencode/commit/bbcede697298435593503538de8dfcb4ac77b141))
* remove references to lint:md script from documentation ([50910c6](https://github.com/shahboura/agents-opencode/commit/50910c675c9fb3f529bd6ece4325a1448ca0a2f7))
* remove remaining linting dependencies and fix README formatting ([f3b31d1](https://github.com/shahboura/agents-opencode/commit/f3b31d1b628e7ba7bfa8c9814abedf4175435417))
* remove remaining linting scripts from package.json ([7bd5759](https://github.com/shahboura/agents-opencode/commit/7bd5759b947793455de592e7152dc9874ee023bd))
* Resolve linting and validation issues ([ad822bc](https://github.com/shahboura/agents-opencode/commit/ad822bccc03309282ce4cf48dc00af6bc39c2941))
* Resolve UI issues with just-the-docs configuration ([845474d](https://github.com/shahboura/agents-opencode/commit/845474dc913b58479bb84baf389b44122a92bece))
* Switch back to just-the-docs with proper dark mode ([3387f2a](https://github.com/shahboura/agents-opencode/commit/3387f2af1781ac92a4ff3e474cecad7ffd283cb8))
