# OpenCode Agents Repository

This repository contains customized agents for OpenCode.ai, aligned with Anthropic's skills framework.

## Project Structure

- `.opencode/agent/` - Custom agent configurations for OpenCode
- `docs/` - Documentation for agents and usage
- `AGENTS.md` - This file with project instructions

## Language-Specific Instructions

### .NET/C# Projects
Apply Clean Architecture principles:
- Follow dependency rules: Domain → Application → Infrastructure → WebAPI
- Use async/await with CancellationToken
- Enable nullable reference types
- Constructor injection for dependencies
- Entity Framework with IEntityTypeConfiguration

### Python Projects
- Always use type hints on function signatures
- Use context managers for resource management
- Prefer list comprehensions over loops
- Async/await for I/O operations
- Google-style docstrings for public APIs

### TypeScript Projects
- Enable strict mode in tsconfig.json
- Explicit types, no implicit any
- Strict null checks with optional chaining
- Generics for reusable code
- Utility types (Pick, Omit, Partial, etc.)

### Flutter/Dart Projects
- Use Riverpod for state management
- Feature-based architecture with clean separation
- Immutable data models with freezed
- Result pattern for error handling
- Provider pattern for dependency injection
- Widget testing for all UI components

## Agent Usage

Primary agents:
- `codebase` - Multi-language development with profile detection
- `orchestrator` - Strategic planning and complex workflow coordination
- `blogger` - Content creation for blogging, podcasting, and YouTube scripting
- `brutal-critic` - Ruthless content reviewer with framework-based criticism
- `em-advisor` - Engineering management guidance

Subagents:
- `docs` - Documentation creation and maintenance
- `review` - Code review for security, performance, and best practices

## Quality Requirements

All code changes must:
- Pass type checking (mypy, tsc --noEmit, flutter analyze)
- Pass linting (ruff, eslint, dart format)
- Pass all tests
- Follow language-specific conventions
- Include proper documentation

## Session Summary Requirements

**All agents MUST summarize sessions upon task completion:**

### Summary Format
- **Context**: Brief description of what was accomplished
- **Key Decisions**: Important architectural or implementation choices made
- **Open Items**: Any follow-up tasks or unresolved issues
- **Lessons Learned**: Insights or patterns discovered during the session

### Summary Optimization
- Keep summaries concise and actionable
- Focus on information that would be valuable for future sessions
- Avoid redundant information from previous summaries
- Use bullet points for readability
- Include timestamps for chronological context

### Summary Location
Summaries should be added to this AGENTS.md file under a "Session Summaries" section for easy reference across sessions.


## Session Summaries

### Session Summary - Mon Dec 22 2025

- **Context**: Updated brutal-critic agent to include research capabilities with YouTube creators policies and guidelines URL, and synchronized GitHub Pages documentation to include all available agents.
- **Key Decisions**: Added research & validation section to brutal-critic instructions emphasizing platform-specific policy compliance; updated docs/index.md to include blogger and brutal-critic agents in the main agents list.
- **Open Items**: None.
- **Lessons Learned**: Documentation synchronization requires checking multiple files (index.md, agents/README.md, getting-started.md) to ensure consistency across all GitHub Pages content.

### Session Summary - Mon Dec 22 2025

- **Context**: Added the requested session summary to AGENTS.md under the Session Summaries section as instructed.
- **Key Decisions**: Used the edit tool to insert the new summary at the top of the section to maintain chronological order.
- **Open Items**: None.
- **Lessons Learned**: Session summaries can be added directly using the edit tool when the content is provided.

### Session Summary - Sun Dec 21 2025

- **Context**: Consolidated repository to OpenCode-only by moving instructions locally, updating configurations, removing Copilot files, cleaning up documentation, and simplifying installation.
- **Key Decisions**: Moved instructions to .opencode/instructions/ for consolidation, removed all Copilot configurations (.github/agents/, prompts/, copilot-instructions.md), updated opencode.json and README accordingly.
- **Open Items**: None.
- **Lessons Learned**: Repository consolidation improves maintainability; clear separation of concerns makes setup easier for users.

### Session Summary - Sun Dec 21 2025

- **Context**: Reviewed all documentation files and removed remaining Copilot references, moved instruction files to .opencode/instructions/ to match configuration, and updated repository structure documentation to reflect the cleaned-up OpenCode-only organization.
- **Key Decisions**: Moved instruction files from .github/instructions/ to .opencode/instructions/ for consistency, updated all Copilot references to OpenCode throughout documentation, corrected all file paths to reflect current repository structure.
- **Open Items**: None.
- **Lessons Learned**: Systematic documentation cleanup ensures users have accurate, consistent information across all docs files.

### Session Summary - Sun Dec 21 2025

- **Context**: Removed Copilot-specific files and directories (.github/agents/, .github/copilot-instructions.md, .github/prompts/) to clean up repository structure.
- **Key Decisions**: Used bash rm commands to remove the specified paths completely.
- **Open Items**: None.
- **Lessons Learned**: Efficient file removal maintains repository cleanliness and removes outdated configurations.

### Session Summary - Sun Dec 21 2025

- **Context**: Updated README.md installation section to make copying instructions files from .opencode/instructions/ a standard step, simplified setup process, and updated repository structure documentation to remove Copilot references.
- **Key Decisions**: Changed instructions copying from optional to mandatory, updated path from .github/instructions/ to .opencode/instructions/, reorganized repository structure to reflect current organization.
- **Open Items**: None.
- **Lessons Learned**: Direct README updates efficiently maintain documentation consistency and user experience.

### Session Summary - Sun Dec 21 2025

- **Context**: Updated opencode.json to reference new instruction file locations, changing paths from ".github/instructions/" to ".opencode/instructions/" while maintaining exact filenames.
- **Key Decisions**: Used replaceAll edit operation to update all instruction paths simultaneously.
- **Open Items**: None.
- **Lessons Learned**: The edit tool's replaceAll functionality efficiently handles bulk path updates across configuration files.

### Session Summary - Sun Dec 21 2025

- **Context**: Performed minor updates to AGENTS.md, validated changes, removed Acknowledgments section from README.md, and pushed all changes with meaningful commit message.
- **Key Decisions**: Removed Acknowledgments to streamline documentation, maintained all other sections and formatting.
- **Open Items**: None.
- **Lessons Learned**: Direct documentation edits can be validated quickly; consistent commit messages improve repository history.

### Session Summary - Sun Dec 21 2025

- **Context**: Updated all agent configuration files in .opencode/agent/ to include explicit instructions for adding session summaries, ensuring consistent workflow across agents with different edit permissions.
- **Key Decisions**: For agents with edit "allow" or "ask", use edit tool directly; for agents with edit "deny" (review, em-advisor), use task tool to launch @docs agent.
- **Open Items**: None
- **Lessons Learned**: Centralized summary management improves consistency and provides better historical context for agent interactions.

### Session Summary - Sun Dec 21 2025

- **Context**: Added a brief note to README.md under the agents table mentioning that all agents automatically add session summaries to AGENTS.md after task completion.
- **Key Decisions**: Placed the note in the Core Concepts section after the agents table for visibility.
- **Open Items**: None
- **Lessons Learned**: Minor documentation updates can be implemented directly without requiring the full analysis-approval-execution workflow phases.

### Session Summary - Sun Dec 21 2025

- **Context**: Troubleshot and fixed agent session summary issue by updating all agent configurations with explicit implementation guidance, tested the fix, and validated consistency.
- **Key Decisions**: Added edit tool instructions for agents with permissions, task tool delegation for read-only agents, maintained role-specific summary formats.
- **Open Items**: None - all agents now have proper summary workflows.
- **Lessons Learned**: Explicit implementation guidance in agent prompts ensures consistent behavior; testing small changes validates fixes before full deployment.

### Session Summary - Sun Dec 21 2025

- **Context**: Added the requested session summary to AGENTS.md under the Session Summaries section as instructed.
- **Key Decisions**: Used the edit tool to insert the new summary at the top of the section to maintain chronological order.
- **Open Items**: None.
- **Lessons Learned**: Session summaries can be added directly using the edit tool when the content is provided.