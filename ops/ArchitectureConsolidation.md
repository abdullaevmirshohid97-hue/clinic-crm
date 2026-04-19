# Architecture Consolidation Plan

## Decision

The canonical API backend is `backend/`.

`apps/backend` is considered legacy and is not part of the primary delivery path.

## Boundaries

- `backend/`: business APIs, domain logic, core integrations
- `server/`: auxiliary runtime/services and worker-compatible components
- `apps/*`: frontend applications only

## Enforcement

- CI verifies `backend/` via `verify:backend-core`.
- New backend work must target `backend/`.
- Legacy package accepts only migration or decommission changes.

## Decommission Path

1. Freeze feature development in `apps/backend`.
2. Move any remaining runtime dependencies to `backend/`.
3. Validate no deploy pipeline references `apps/backend`.
4. Archive/remove `apps/backend` after one stable release cycle.
