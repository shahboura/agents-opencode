# Changelog

## [1.3.0](https://github.com/shahboura/agents-opencode/compare/v1.2.2...v1.3.0) (2026-03-12)


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

## [1.2.0](https://github.com/shahboura/agents-opencode/compare/agents-opencode-v1.1.2...agents-opencode-v1.2.0) (2026-03-09)

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
