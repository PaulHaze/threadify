# AGENTS.md

Instructions for Codex working in this repository.

## Source of Truth

- Read [CLAUDE.md](/Users/paulhayes/code/AI/threadify/CLAUDE.md) before making changes.
- `CLAUDE.md` is the authoritative project behavior and working-spec file for this repo.
- If this file and `CLAUDE.md` overlap, follow `CLAUDE.md`.
- Shared product, architecture, scope, and workflow rules should live in `CLAUDE.md`, not here.

## Codex-Specific Role

- Treat this file as a thin Codex-specific companion to `CLAUDE.md`.
- Keep changes small, direct, and consistent with the repo's current phase and MVP scope.
- Preserve the core-library / thin-shell boundary described in `CLAUDE.md`.
- For core behavior changes, prefer tests that prove the change rather than informal reasoning.

## Planning Context

- Check the current implementation plan under [docs/superpowers/plans](/Users/paulhayes/code/AI/threadify/docs/superpowers/plans).
- The current task list is [2026-06-22-threadify-mvp.md](/Users/paulhayes/code/AI/threadify/docs/superpowers/plans/2026-06-22-threadify-mvp.md).
- When implementing planned work, align with that plan unless the user explicitly redirects.

## Maintenance Rule

- Keep `AGENTS.md` lean.
- Update `CLAUDE.md` when shared repo guidance changes.
- Update `AGENTS.md` only when Codex-specific instructions need to change.
