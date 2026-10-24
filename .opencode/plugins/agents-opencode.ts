import type { Plugin } from "@opencode-ai/plugin";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createReadGuardHandler,
  handleToolExecuteBefore,
  injectContextOnce,
  injectSystemContextOnce,
  safeRegister,
  selectPackVersion,
  subscribeEventStream,
} from "../lib/guards.mjs";
import { buildSkillInfo, shouldRegisterPackSkills } from "../lib/pack-skills.mjs";

/**
 * The plugin sits in `<pack-root>/plugins/`. Depending on install scope the pack
 * root is either a project's `.opencode/` directory or the global
 * `~/.config/opencode/` directory, so `agents/`, `skills/`, and `commands/` are
 * always one level up (`../`).
 *
 * One file, two entrypoints:
 * - `AgentsOpencodePlugin` (named export) is the v1 server plugin; OpenCode v1
 *   loads it and runs the returned hook object.
 * - the default export is the v2 plugin (`{ id, setup }`); OpenCode v2 calls
 *   `setup(ctx)` and uses the returned cleanup.
 *
 * Defensive assumption: v1 has been *observed* to also call the default
 * export's `setup` with a v1-shaped ctx that lacks the tool/session/shell
 * domains, but this is not a documented guarantee. `setup` therefore
 * feature-detects the v2 ctx and returns quietly when it does not see one, so
 * an unexpected v1 call is a harmless no-op rather than an error.
 *
 * The two entrypoints share the same hook bodies so behavior cannot drift.
 */
const SERVICE = "agents-opencode";
const PACK_ROOT = new URL("../", import.meta.url);
const SKILLS_ROOT = new URL("skills/", PACK_ROOT);

type PackInfo = {
  version: string;
  inventory: string;
};

type LogLevel = "info" | "warn" | "error";

type StructuredLogHost = {
  app?: {
    log?: (input: {
      body: { service: string; level: LogLevel; message: string };
    }) => unknown;
  };
};

function safeRead(path: URL): string | null {
  try {
    return readFileSync(fileURLToPath(path), "utf8");
  } catch {
    return null;
  }
}

function countFiles(path: URL, extension: string, exclude: string[] = []): number {
  try {
    return readdirSync(fileURLToPath(path)).filter(
      (entry) => entry.endsWith(extension) && !exclude.includes(entry)
    ).length;
  } catch {
    return 0;
  }
}

/** Names of the skill directories under `path` that actually ship a `SKILL.md`. */
function listSkills(path: URL): string[] {
  try {
    return readdirSync(fileURLToPath(path), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => safeRead(new URL(`${entry.name}/SKILL.md`, path)) !== null)
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function countSkills(path: URL): number {
  return listSkills(path).length;
}

/**
 * The installer writes `.opencode-agents-version` at the pack root (the same
 * two candidate paths `readVersion` uses). Its presence means the pack was
 * file-installed, so its skills are already on the user's discovery path and
 * must not be registered again from the package.
 */
function markerPresent(): boolean {
  return (
    safeRead(new URL("../../.opencode-agents-version", import.meta.url)) !== null ||
    safeRead(new URL("../.opencode-agents-version", import.meta.url)) !== null
  );
}

/**
 * Best-effort read of a scalar field from a `SKILL.md` YAML front-matter
 * block, handling both inline and block (`>-`/`|`) scalars. Only top-level
 * keys are matched (nested `metadata:` members are indented and skipped), and
 * a miss degrades to "" — callers treat both fields as best-effort identity.
 */
function readFrontmatterScalar(content: string | null, key: string): string {
  if (typeof content !== "string") return "";
  const front = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!front) return "";

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedKey}\\s*:`);
  const lines = front[1].split(/\r?\n/);
  const index = lines.findIndex((line) => pattern.test(line));
  if (index === -1) return "";

  const inline = lines[index].replace(pattern, "").trim();
  if (inline && !/^[>|][+-]?$/.test(inline)) {
    return inline.replace(/^["']|["']$/g, "");
  }

  const parts: string[] = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    if (/^\S/.test(lines[i])) break;
    parts.push(lines[i].trim());
  }
  return parts.join(" ").trim();
}

function readSkillDescription(content: string | null): string {
  return readFrontmatterScalar(content, "description");
}

function readSkillName(content: string | null): string {
  return readFrontmatterScalar(content, "name");
}

/**
 * The installer writes `.opencode-agents-version` at the pack root. Its location
 * relative to this file depends on install scope:
 * - project scope: `<projectRoot>/.opencode/plugins/` -> `../../.opencode-agents-version`
 * - global scope:  `<configDir>/plugins/`              -> `../.opencode-agents-version`
 * The in-repo package.json is only trusted when it actually is this pack, so a
 * consumer's own package.json never leaks in as the pack version.
 */
function readVersion(): string {
  const markers = [
    safeRead(new URL("../../.opencode-agents-version", import.meta.url)),
    safeRead(new URL("../.opencode-agents-version", import.meta.url)),
  ];

  let packageName: unknown;
  let packageVersion: unknown;
  const rawPackage = safeRead(new URL("../../package.json", import.meta.url));
  if (rawPackage) {
    try {
      const parsed = JSON.parse(rawPackage);
      packageName = parsed?.name;
      packageVersion = parsed?.version;
    } catch {
      // selectPackVersion falls back to "unknown" when nothing resolves.
    }
  }

  return selectPackVersion({ markers, packageName, packageVersion });
}

function readPackInfo(): PackInfo {
  const version = readVersion();
  const agents = countFiles(new URL("agents/", PACK_ROOT), ".md");
  const skills = countSkills(new URL("skills/", PACK_ROOT));
  const commands = countFiles(new URL("commands/", PACK_ROOT), ".md", ["README.md"]);

  const parts = [
    agents > 0 ? `${agents} agents` : null,
    skills > 0 ? `${skills} skills` : null,
    commands > 0 ? `${commands} commands` : null,
  ].filter((part): part is string => part !== null);

  return {
    version,
    inventory: parts.length > 0 ? parts.join(", ") : "agent pack",
  };
}

const PACK = readPackInfo();

// ---- Shared hook bodies (used by both entrypoints) ----

/**
 * Best-effort diagnostic logging, defensive on both hosts.
 *
 * - v1: the plugin input carries the server client, whose `app.log` records
 *   structured entries — used when present (unchanged v1 behavior).
 * - v2: `ctx.app` is only `{ name, version, channel }` (verified against the
 *   published `@opencode/plugin` types — there is no `ctx.client` and no
 *   `ctx.app.log`), and v2's docs log from plugins with `console.*`. Falling
 *   back to the console keeps a warning like "secret-read guard not
 *   registered" from being silently lost.
 *
 * Logging is advisory: this helper must never throw (or reject), whichever
 * path it takes.
 */
async function logMessage(host: unknown, level: LogLevel, message: string): Promise<void> {
  try {
    const app = (host as StructuredLogHost | undefined)?.app;
    if (app && typeof app.log === "function") {
      await app.log({ body: { service: SERVICE, level, message } });
      return;
    }
  } catch {
    // Fall through to the console so the message is not lost.
  }

  try {
    const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    sink(`[${SERVICE}] ${message}`);
  } catch {
    // Even a locked-down console must not break the plugin.
  }
}

async function logLoaded(host: unknown): Promise<void> {
  await logMessage(host, "info", `Agents Opencode v${PACK.version} loaded — ${PACK.inventory} available`);
}

async function logSessionError(host: unknown): Promise<void> {
  await logMessage(host, "error", "OpenCode session error observed");
}

async function logWarn(host: unknown, message: string): Promise<void> {
  await logMessage(host, "warn", message);
}

function compactionContext(): string[] {
  return [
    `## Agents Opencode Context

You are operating with the agents-opencode v${PACK.version} agent pack.

Available agents:
- Task-delegatable agents (subagent/all): @codebase, @docs, @review, @planner, @brutal-critic, @legal-advisor, @researcher
- Primary agents (user switches with Tab; not Task-invocable): orchestrator, em-advisor, blogger

Active inventory: ${PACK.inventory} available as skills and slash commands.

Memory: state/session-state.json and handoff/latest.md preserve working state.
Context persistence: MILESTONES.md tracks project milestones across sessions.`,
    `## Session State Reminder
- Current phase: Read state/session-state.json for working memory
- Check handoff/latest.md for continuation context
- Review MILESTONES.md for recent milestones and patterns`,
  ];
}

/**
 * Safety guard: throw when a `read` targets a sensitive file. Throwing blocks
 * the call on both entrypoints (v2 only *asks* on `*.env` by default, so the
 * guard must deny explicitly here rather than rely on config).
 *
 * Accepts either entrypoint's call form via `handleToolExecuteBefore`: the whole
 * v2 event (`guardSensitiveRead(event)`) or the split v1 pair
 * (`guardSensitiveRead(input.tool, output)`).
 */
function guardSensitiveRead(toolOrEvent: unknown, payload?: unknown): void {
  const error = handleToolExecuteBefore(toolOrEvent, payload);
  if (error) throw new Error(error);
}

// ---- v1 entrypoint ----

/**
 * v1 registers skills by pointing `config.skills.paths` at the pack's skills
 * directory. Two guards keep this a no-op on a file install or a v2 config:
 * - the installer marker means the skills are already file-installed;
 * - v2's `skills` is a flat array, so an array value is not a v1 shape to fill.
 */
function injectV1SkillPaths(config: unknown): void {
  if (!config || typeof config !== "object") return;
  if (markerPresent()) return;

  const target = config as { skills?: unknown };
  // v2 (`skills` as an array) is handled by the v2 entrypoint, not here.
  if (Array.isArray(target.skills)) return;

  const skills =
    target.skills && typeof target.skills === "object"
      ? (target.skills as { paths?: unknown })
      : {};

  const paths = (Array.isArray(skills.paths) ? skills.paths : []).filter(
    (entry): entry is string => typeof entry === "string"
  );

  const skillsPath = fileURLToPath(new URL("skills/", PACK_ROOT));
  if (!paths.includes(skillsPath)) paths.push(skillsPath);

  skills.paths = paths;
  target.skills = skills;
}

export const AgentsOpencodePlugin: Plugin = async ({ client }) => {
  await logLoaded(client);

  return {
    /**
     * v1 skill delivery: expose the pack's skills by adding them to the config's
     * skill search paths when the pack is plugin-installed only.
     */
    config: async (config: unknown) => {
      try {
        injectV1SkillPaths(config);
      } catch {
        // Never let skill registration abort config loading.
      }
    },

    /**
     * Surface session-level failures through the plugin logger so they are not
     * silently lost when a run aborts.
     */
    event: async ({ event }) => {
      if (event.type === "session.error") {
        await logSessionError(client);
      }
    },

    /**
     * Inject agent-specific state into compaction so critical context
     * survives context window truncation.
     */
    "experimental.session.compacting": async (_input, output) => {
      injectContextOnce(output.context, compactionContext());
    },

    /**
     * Safety hook: block agents from reading sensitive files.
     */
    "tool.execute.before": async (input, output) => {
      guardSensitiveRead(input.tool, output);
    },

    /**
     * Inject package version into shell environment for script awareness.
     */
    "shell.env": async (_input, output) => {
      output.env["AGENTS_OPENCODE_VERSION"] = PACK.version;
    },
  };
};

// ---- v2 entrypoint ----

type V2HookRegistrar = {
  hook?: (name: string, handler: (event: any) => void | Promise<void>) => unknown;
};

type V2EventStream = {
  /**
   * Documented v2 shape: returns an AsyncIterable of server events. Only
   * `subscribe` is wired (`subscribeEvents`); an `on`-based emitter is not a
   * v2 event source here, so host classification stays consistent with the
   * wiring (an `on`-only stream would otherwise be classified v2 and then
   * silently receive no events).
   */
  subscribe?: (options?: { signal?: AbortSignal }) => unknown;
};

type V2SkillEditor = {
  list?: () => unknown;
  add?: (info: unknown) => unknown;
};

type V2SkillRegistrar = {
  transform?: (fn: (editor: V2SkillEditor) => unknown | Promise<unknown>) => unknown;
};

type V2Context = {
  tool?: V2HookRegistrar;
  session?: V2HookRegistrar;
  shell?: V2HookRegistrar;
  event?: V2EventStream;
  skill?: V2SkillRegistrar;
};

function hasHook(registrar: V2HookRegistrar | undefined): boolean {
  return !!registrar && typeof registrar.hook === "function";
}

/**
 * Feature-detect a real v2 ctx. v1 has been *observed* to also call the default
 * export's `setup` with a ctx that lacks the tool/session/shell domains, but
 * that is a defensive assumption, not a contract; an unrecognized ctx must be a
 * quiet no-op rather than an error.
 */
function isV2Context(ctx: unknown): ctx is V2Context {
  if (!ctx || typeof ctx !== "object") return false;
  const candidate = ctx as V2Context;
  if (hasHook(candidate.tool) || hasHook(candidate.session) || hasHook(candidate.shell)) {
    return true;
  }
  const stream = candidate.event;
  return !!stream && typeof stream.subscribe === "function";
}

/** Ids the editor already exposes, normalized from `editor.list()` entries.
 *  `list()` may be async, so it is awaited; a rejection degrades to `[]`. */
async function listEditorSkillIds(editor: V2SkillEditor): Promise<string[]> {
  if (typeof editor.list !== "function") return [];
  let listed: unknown;
  try {
    listed = await editor.list();
  } catch {
    return [];
  }
  if (!Array.isArray(listed)) return [];

  return listed
    .map((entry): string | null => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object") {
        const candidate = entry as { id?: unknown; name?: unknown };
        const id = candidate.id ?? candidate.name;
        return typeof id === "string" ? id : null;
      }
      return null;
    })
    .filter((id): id is string => id !== null);
}

/**
 * Add one skill through the editor.
 *
 * The descriptor matches the shipped `@opencode/schema` `Skill.Info` (verified
 * against 2.0.30): `{ id, name, description, path, content }`, with `name`
 * required and no `location` field — so there is no second shape to retry.
 * The add is awaited inside containment: a synchronous throw and an async
 * rejection are both swallowed, so registration never disables the plugin or
 * leaks an unhandled rejection.
 */
async function addPackSkill(
  editor: V2SkillEditor,
  skill: { id: string; name: string; description: string; filePath: string; content: string | null }
): Promise<void> {
  if (typeof editor.add !== "function") return;

  try {
    await editor.add(buildSkillInfo(skill));
  } catch {
    // Contained: a rejected descriptor must not disable the plugin.
  }
}

/**
 * v2 skill delivery: register the pack's skills through the skill transform.
 *
 * Coexistence guard: when the installer marker exists the pack was
 * file-installed, so its skills are already discovered and `editor.list()`
 * dedupe backs that up — registering nothing avoids duplicates.
 *
 * `transform()` resolves to a `Registration` on v2; the caller awaits this
 * through `safeRegister`, so a rejection is contained and the registration's
 * `dispose()` becomes a cleanup.
 */
function registerPackSkills(ctx: V2Context): unknown {
  const transform = ctx.skill?.transform;
  if (typeof transform !== "function") return undefined;

  const skillIds = listSkills(SKILLS_ROOT);
  if (skillIds.length === 0) return undefined;

  const present = markerPresent();

  return transform(async (editor: V2SkillEditor) => {
    try {
      const idsToAdd = shouldRegisterPackSkills({
        markerPresent: present,
        alreadyPresentIds: await listEditorSkillIds(editor),
        skillIds,
      });
      if (idsToAdd === false) return;

      for (const id of idsToAdd) {
        const skillFile = new URL(`${id}/SKILL.md`, SKILLS_ROOT);
        const content = safeRead(skillFile);
        await addPackSkill(editor, {
          id,
          name: readSkillName(content),
          description: readSkillDescription(content),
          filePath: fileURLToPath(skillFile),
          content,
        });
      }
    } catch {
      // One bad skill must not abort the whole transform.
    }
  });
}

/**
 * v2 event delivery: `ctx.event.subscribe({ signal })` returns an
 * `AsyncIterable` (documented shape), so it must be consumed with a
 * signal-backed loop, not called with a handler. `subscribeEventStream` owns
 * that loop (and is unit-tested in scripts/plugin-v2.test.js); a host without
 * `subscribe` is a quiet no-op. The v2 ctx itself is passed to the logger —
 * there is no separate `ctx.client`.
 */
function subscribeEvents(ctx: V2Context): (() => void) | undefined {
  if (!ctx.event) return undefined;

  return subscribeEventStream(ctx.event, (event: any) => {
    if (event?.type === "session.error") return logSessionError(ctx);
    return undefined;
  });
}

const AgentsOpencodeV2Plugin = {
  id: SERVICE,
  // v1 object form: hosts that enumerate the default export can use `server` as
  // the v1 plugin function (the documented "support V1" dual pattern). The named
  // export `AgentsOpencodePlugin` remains the primary v1 entrypoint.
  server: AgentsOpencodePlugin,
  async setup(ctx: unknown): Promise<(() => void) | undefined> {
    // v1-shaped ctx: no v2 domains, nothing to register here.
    if (!isV2Context(ctx)) return undefined;

    const cleanups: Array<() => void> = [];

    // Registrations are awaited (v2's `hook()`/`transform()` return
    // `Promise<Registration>`): a rejected registration — e.g. an unknown hook
    // name — is contained by `safeRegister` instead of surfacing as an
    // unhandled rejection, and one failure never disables the others.

    // The handler receives the whole event: it reads `event.tool` and resolves
    // the path from the documented v2 event shapes (flat, `input`,
    // `input.args`). It blocks like the v1 guard; when a `read` event carries
    // no resolvable path it logs one visible warning (rate-limited to once per
    // handler) so a v2 payload-shape mismatch cannot silently disable the
    // guard — the guard itself stays fail-open by design.
    const readGuardHandler = createReadGuardHandler(() => {
      void logWarn(
        ctx,
        "secret-read guard could not resolve a file path from a `read` tool event; " +
          "the read was allowed through unguarded (warning shown once per plugin load — " +
          "if this repeats, the v2 read payload shape may differ from the documented forms)"
      );
    });

    const guardRegistered = await safeRegister(cleanups, () =>
      ctx.tool?.hook?.("execute.before", readGuardHandler)
    );

    if (!guardRegistered) {
      // The secret-read guard is a security control. If this host cannot
      // register the tool hook, surface it instead of failing silently.
      await logWarn(
        ctx,
        "secret-read guard not confirmed: ctx.tool.hook is unavailable, the registration " +
          "was rejected, or the host returned an unrecognized registration result"
      );
    }

    // v2's `context` hook runs for every agent-loop model request (including
    // tool-driven continuations). Its event exposes `system` as typed text
    // parts — there is no string `context` array on v2 (that shape belongs to
    // v1's `experimental.session.compacting` output, kept in the v1 entrypoint
    // above). Inject the block as one idempotent `{ type: "text", text }` part.
    const contextText = compactionContext().join("\n\n");
    await safeRegister(cleanups, () =>
      ctx.session?.hook?.("context", (event: any) => {
        injectSystemContextOnce(event?.system, contextText);
      })
    );

    // Deliberately no v2 `compaction` registration: its event offers `messages`
    // (the transcript being summarized) and `result` (replacing the summarizer,
    // which is not our intent), but no compaction-specific context field. The
    // `context` hook above re-injects the block on every post-compaction
    // agent-loop request, so pack awareness survives truncation anyway.

    await safeRegister(cleanups, () =>
      ctx.shell?.hook?.("create.before", (event: any) => {
        if (event?.env && typeof event.env === "object") {
          event.env["AGENTS_OPENCODE_VERSION"] = PACK.version;
        }
      })
    );

    await safeRegister(cleanups, () => subscribeEvents(ctx));

    // Deliver the pack's skills when it is plugin-installed only.
    await safeRegister(cleanups, () => registerPackSkills(ctx));

    await logLoaded(ctx);

    return () => {
      for (const dispose of cleanups) {
        try {
          dispose();
        } catch {
          // ignore disposal failures
        }
      }
    };
  },
};

export default AgentsOpencodeV2Plugin;
