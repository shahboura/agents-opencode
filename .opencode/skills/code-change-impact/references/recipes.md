# Recipes — per-ecosystem detection, reverse-deps, coupling, silent risks

Companion to `SKILL.md`. Read the section for the language(s) the change touches.
All `rg` (ripgrep) commands fall back to `grep -rn` if `rg` is absent.

> Source: [mghareeb/code-change-impact](https://github.com/mghareeb/code-change-impact)
> (MIT licensed). Adapted for OpenCode agent skill format.

## 1. Reverse-dependency recipes by ecosystem

### JavaScript / TypeScript
- Imports: `rg -n "from ['\"].*<modulePathOrPkg>['\"]" <root> -l`
- Path aliases: read `tsconfig.json` `compilerOptions.paths`
- Barrel files: grep the **symbol name**, not just the file path:
  `rg -n "\b<Symbol>\b" <root> --type ts -l`

### Python
- Imports: `rg -n "^\s*(from|import)\s+<dotted.module>" <root>`
- No compiler — signature changes are silent. Run `mypy`/`pyright` if configured.

### Go
- Imports: `rg -n "\"<module/import/path>\"" <root>`
- Exported identifiers: `rg -n "\b<pkg>\.<Symbol>\b" <root>`
- `go build ./...` and `go vet ./...` catch most ripples.

### Java / Kotlin
- Imports: `rg -n "import\s+<package>\.<Class>" <root>`
- Symbol use: `rg -n "\b<Class>\b" <root> -l`

### C# / .NET
- `using <Namespace>;` + symbol grep `rg -n "\b<Type>\b" <root> -l`

### Ruby
- `rg -n "require(_relative)?\s+['\"].*<file>" <root>` + constant grep

### Rust
- `rg -n "use\s+(crate|super|<crate_name>)::.*<item>" <root>` + symbol grep

### PHP
- `rg -n "use\s+<Namespace>\\\\<Class>" <root>` + `new <Class>` grep

### Cross-cutting
- Config/contract by string: `rg -n "<literal>" <root>`

## 2. Detecting verify commands

| Ecosystem | Where commands live | Typical typecheck / build / test / lint |
|---|---|---|
| JS/TS | `package.json` `scripts` | `tsc --noEmit` · `build` · `test` · `eslint` |
| Python | `pyproject.toml`, `Makefile` | `mypy`/`pyright` · — · `pytest` · `ruff` |
| Go | `go.mod`, `Makefile` | `go build ./...` · same · `go test ./...` · `go vet` |
| Java/Kotlin | `pom.xml`, `build.gradle` | `mvn compile` · same · `mvn test` · checkstyle |
| C#/.NET | `*.sln`/`*.csproj` | `dotnet build` · same · `dotnet test` · analyzers |
| Ruby | `Rakefile`, `Gemfile` | — · — · `rspec` · `rubocop` |
| Rust | `Cargo.toml` | `cargo check` · `cargo build` · `cargo test` · `cargo clippy` |
| PHP | `composer.json` | `phpstan` · — · `phpunit` · `php-cs-fixer` |

Also check CI config — it is the canonical list of "what must pass".

## 3. Generic coupling taxonomy

| Changed file is… | Reach | Where it ripples |
|---|---|---|
| shared/core/common/util module | **wide** | every importer |
| a public/exported symbol | callers in + out of module | every caller |
| a type / interface / schema | wide | usages (compiler-caught in typed; silent in dynamic) |
| a serialized contract | cross-service | the other side of the wire |
| a config/registry | fan-out | everything derived from it |
| a DB schema / migration | data layer | queries, models, other services |
| global config / styles / theme / i18n | **global, silent** | every screen/string |
| build / deps / lockfile / Dockerfile / CI | build & runtime | the whole app |
| an internal change in a single leaf file | **local** | itself |

## 4. Mirror/twin files + silent-risk catalog

### Finding mirror/twin files
- **Generated code** — `// Code generated` / `@generated` header
- **Cross-language duplicated constants** — grep literal values across repo
- **Paired fixtures / golden files / snapshots**
- **Docs/specs that encode behavior** — OpenAPI, .proto files

### Silent-risk catalog
- Cache / memoization key change
- Changed default value / sort order / comparator / rounding
- Serialization drift (field nullable/optional, enum value added)
- Global mutable state / singleton shape
- Concurrency & transaction boundaries
- Locale / time zone / number & date formatting
- Regex / validation predicate changes
- Feature flag / env var default flip
- Error-handling control flow changes
- Theme / token / i18n string changes

## 5. Surface-mapping cheats

- **Web app** — find the route/page rendering the impacted component
- **Service/API** — find the controller/handler, path + method, consumers
- **CLI** — find the command/subcommand wired to the impacted function
- **Library** — the public API + its tests, downstream consumers
- **Background job / queue** — find the worker/handler and trigger
