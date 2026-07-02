# Recipes — per-ecosystem detection, reverse-deps, and silent risks

Companion to `SKILL.md`. Read the section for the language(s) the change touches.
All `rg` (ripgrep) commands fall back to `grep -rn` if `rg` is absent.

## 1. Reverse-dependency grep recipes

### JavaScript / TypeScript
- Imports: `rg -n "from ['\"].*<modulePathOrPkg>['\"]" <root> -l`
- Path aliases: read `tsconfig.json` `compilerOptions.paths`
- Barrel files: grep symbol name: `rg -n "\b<Symbol>\b" <root> --type ts -l`

### Python
- Imports: `rg -n "^\s*(from|import)\s+<dotted.module>" <root>`
- No compiler — signature changes are silent; run `mypy`/`pyright` if configured.

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

### Cross-cutting (any language)
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

## 3. Mirror/twin files

A diff that edits one side and not the other is an impact finding:
- **Generated code** — `// Code generated` / `@generated` / "DO NOT EDIT" header
- **Cross-language duplicated constants** — same enum/status code in FE and BE
- **Paired fixtures / golden files / snapshots** — logic changes need updated recordings
- **Docs/specs that encode behavior** — OpenAPI, `.proto`, CODEOWNERS-flagged contract

## 4. Surface-mapping

- **Web app** — find the route/page rendering the impacted component
- **Service/API** — find controller/handler, path + method, consumers
- **CLI** — find the command/subcommand wired to the impacted function
- **Library** — public API + tests, downstream consumers in monorepo
- **Background job / queue** — worker/handler bound to impacted code and trigger
