# Examples

Runnable examples demonstrating multi-agent workflows.

## Available Examples

### 1. Simple REST API
**Path:** [simple-rest-api/](simple-rest-api/)  
**Tech:** Python FastAPI  
**Workflow:** @orchestrator → @codebase → @review → @docs  
**Time:** ~15 minutes  
**Demonstrates:** Basic agent collaboration, testing, and documentation

### 2. Microservice Refactor (Coming Soon)
**Tech:** TypeScript Node.js  
**Workflow:** @orchestrator → @codebase (multi-step) → @review  
**Demonstrates:** Incremental migration, feature toggles, rollback safety

### 3. Database Migration (Coming Soon)
**Tech:** C# .NET with EF Core  
**Workflow:** @planner → @codebase → @review  
**Demonstrates:** Zero-downtime migrations, phased rollouts

## Running Examples

Each example includes:
- **BEFORE.md**: Initial code state
- **PROMPTS.md**: Exact agent prompts to use
- **EXPECTED.md**: What the result should look like
- **README.md**: Setup and run instructions

### Quick Start

```bash
cd examples/simple-rest-api
./run.sh  # or run.ps1 on Windows
```

## Learning Path

1. Start with **simple-rest-api** to understand basic workflows
2. Try **database-migration** for safe data operations
3. Tackle **microservice-refactor** for complex multi-phase projects

## Contributing Examples

Want to add an example? Follow this structure:

```
examples/your-example/
├── README.md          (Setup, dependencies, run steps)
├── BEFORE.md          (Initial state)
├── PROMPTS.md         (Agent prompts)
├── EXPECTED.md        (Expected outcome)
├── src/               (Source code)
└── tests/             (Tests)
```
