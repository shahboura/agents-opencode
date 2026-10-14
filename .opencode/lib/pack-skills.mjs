// Pure skill-registration helpers for the agents-opencode plugin.
// Kept dependency-free so they can be unit-tested outside the OpenCode runtime.
//
// Background: a *file* install copies the pack's skills into the user's
// discovered `.opencode/skills/` (and writes the installer marker at the pack
// root), while a *plugin-spec* install only references this file. Registering
// skills from the package in the second case makes them available without a
// copy; the first case must stay a no-op so skills are never double-registered.

/**
 * Decide which of the pack's skill ids should be registered.
 *
 * Returns `false` when the pack is file-installed (`markerPresent`) — the
 * installer already placed the skills, so registering would duplicate them.
 * Otherwise returns the array of ids still to add, preserving input order,
 * dropping non-string/empty ids, de-duplicating, and skipping ids the runtime
 * reports as already present (`alreadyPresentIds`, e.g. from `editor.list()`).
 *
 * An empty array means "plugin-only, but every id is already present".
 *
 * @param {object} [input]
 * @param {boolean} [input.markerPresent]   Installer marker found at the pack root.
 * @param {string[]} [input.alreadyPresentIds] Ids the runtime already exposes.
 * @param {string[]} [input.skillIds]       Ids discovered in the pack.
 * @returns {false | string[]}
 */
export function shouldRegisterPackSkills(input = {}) {
  const { markerPresent, alreadyPresentIds = [], skillIds = [] } = input ?? {};
  if (markerPresent === true) return false;

  const present = new Set(
    (Array.isArray(alreadyPresentIds) ? alreadyPresentIds : []).filter(
      (id) => typeof id === 'string' && id.length > 0
    )
  );

  const toAdd = [];
  for (const id of Array.isArray(skillIds) ? skillIds : []) {
    if (typeof id !== 'string' || id.length === 0) continue;
    if (present.has(id) || toAdd.includes(id)) continue;
    toAdd.push(id);
  }

  return toAdd;
}

/**
 * Build the skill descriptor handed to `editor.add(...)` on OpenCode v2.
 *
 * The editor's file field is a moving target: v2 core (2.0.4+) uses `path`,
 * while the published API reference documents `location`. Rather than
 * hardcoding one, callers feature-detect by passing `preferPath` (attempt
 * `path` first, retry with `location` when the shape is rejected). Exactly one
 * of the two fields is emitted and it always carries `filePath`, so the
 * descriptor is never left with both fields undefined.
 *
 * @param {object} [input]
 * @param {string} [input.id]          Skill id (derived from the directory name).
 * @param {string} [input.description] Skill description (from `SKILL.md`).
 * @param {string} [input.filePath]    Absolute path to the skill's `SKILL.md`.
 * @param {string} [input.content]     Raw `SKILL.md` contents, when supplied.
 * @param {boolean} [input.preferPath] Emit `path` (true, default) or `location`.
 * @returns {object}
 */
export function buildSkillInfo(input = {}) {
  const { id, description, filePath, content, preferPath = true } = input ?? {};
  const info = { id, description: description ?? '' };
  if (content !== undefined) info.content = content;

  // Always place filePath on the feature-detected field so neither both nor
  // neither of `path`/`location` is left undefined.
  if (preferPath) {
    info.path = filePath;
  } else {
    info.location = filePath;
  }

  return info;
}
