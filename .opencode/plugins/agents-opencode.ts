import type { Plugin } from "@opencode-ai/plugin";

const PACKAGE_VERSION = "2.0.0";

export const AgentsOpencodePlugin: Plugin = async ({
  client,
  project,
  directory,
  worktree,
  $,
}) => {
  await client.app.log({
    body: {
      service: "agents-opencode",
      level: "info",
      message: `Agents Opencode v${PACKAGE_VERSION} loaded — 9 agents, 19 skills, 14 commands available`,
    },
  });

  return {
    /**
     * Inject agent-specific state into compaction so critical context
     * survives context window truncation.
     */
    "experimental.session.compacting": async (input, output) => {
      output.context.push(`## Agents Opencode Context

You are operating with the agents-opencode v${PACKAGE_VERSION} agent pack.

Available agents (invoke via @mention):
- @codebase — Multi-language development with profile detection
- @orchestrator — Strategic planning and complex workflow coordination
- @planner — Read-only analysis and implementation planning
- @review — Code review for security, performance, and best practices
- @docs — Documentation creation and maintenance
- @blogger — Content creation for blogging, podcasting, YouTube
- @brutal-critic — Content quality review with framework-based scoring
- @em-advisor — Engineering management guidance
- @legal-advisor — License auditing, compliance, and regulatory guidance

Active skills: 19 language/domain/utility skill packs loadable via skill tool.
Active commands: 14 slash commands (type / to see autocomplete).

Memory: state/session-state.json and handoff/latest.md preserve working state.
Context persistence: AGENTS.md tracks project milestones across sessions.`);

      // Persist critical state markers
      output.context.push(`## Session State Reminder
- Current phase: Read state/session-state.json for working memory
- Check handoff/latest.md for continuation context
- Review AGENTS.md for recent milestones and patterns`);
    },

    /**
     * Safety hook: block agents from reading sensitive files.
     */
    "tool.execute.before": async (input, output) => {
      if (input.tool === "read") {
        const filePath = output.args?.filePath;
        if (typeof filePath === "string") {
          const basename = filePath.split(/[/\\]/).pop()?.toLowerCase() || "";
          const blockedPatterns = [
            ".env",
            "credentials.json",
            "secrets.yaml",
            "id_rsa",
            "id_ed25519",
            ".pem",
          ];
          for (const pattern of blockedPatterns) {
            if (basename === pattern || basename.endsWith(pattern)) {
              throw new Error(
                `[agents-opencode] Blocked reading sensitive file: ${filePath}. Do not read credential or secret files.`
              );
            }
          }
        }
      }
    },

    /**
     * Inject package version into shell environment for script awareness.
     */
    "shell.env": async (input, output) => {
      output.env["AGENTS_OPENCODE_VERSION"] = PACKAGE_VERSION;
    },
  };
};
