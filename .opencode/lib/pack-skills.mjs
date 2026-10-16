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
 * Must match the shipped `@opencode/schema` `Skill.Info` (verified against
 * 2.0.30): `{ id, name, description, path, content }` — `id`, `name`, `path`,
 * and `content` are required and there is no `location` field. The descriptor
 * therefore always emits exactly those five keys.
 *
 * `name` resolution prefers a non-empty frontmatter name supplied by the
 * caller, then falls back to the skill id (then a `'skill'` placeholder for
 * malformed input) so the required key is never missing or empty; the host
 * rejects a descriptor without it (`SchemaError(Missing key at ["name"])`).
 *
 * The schema-required `id` and `path` are normalized alongside it: `id` is
 * trimmed and falls back to the same `'skill'` placeholder, and `path` is
 * guaranteed to be a string (it degrades to `''` for malformed input — the v2
 * caller always passes a real `SKILL.md` path, so no placeholder can stand in
 * for it). All five emitted values are therefore always strings.
 *
 * @param {object} [input]
 * @param {string} [input.id]          Skill id (derived from the directory name).
 * @param {string} [input.name]        Frontmatter name, when present.
 * @param {string} [input.description] Skill description (from `SKILL.md`).
 * @param {string} [input.filePath]    Absolute path to the skill's `SKILL.md`.
 * @param {string} [input.content]     Raw `SKILL.md` contents, when supplied.
 * @returns {object}
 */
export function buildSkillInfo(input = {}) {
  const { id, name, description, filePath, content } = input ?? {};

  const trimmedId = typeof id === 'string' ? id.trim() : '';
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  return {
    id: trimmedId || 'skill',
    name: trimmedName || trimmedId || 'skill',
    description: typeof description === 'string' ? description : '',
    path: typeof filePath === 'string' ? filePath : '',
    content: typeof content === 'string' ? content : '',
  };
}
