# Learnings

Durable lessons from retros. Newest first, one entry per retro.
Each entry records what failed, the environment cause, and the artifact added (or `no change`).
Cap: 5 bullets per entry. Prune the oldest entries when this file exceeds 100 KB.

## 2026-10-24 — Skill count drift after adding two skills

- **What failed:** README and site inventory counts still said 27 skills after `alignment` and `writing-for-agents` shipped.
- **Environment cause:** no check tied stated counts to the filesystem, so adding skills updated no count.
- **Artifact added:** `scripts/validate-inventory.js`, wired into `npm run doctor` and `npm run validate:inventory`.
