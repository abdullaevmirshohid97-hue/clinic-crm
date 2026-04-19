# Deprecated Backend Package

`apps/backend` is deprecated and retained temporarily for migration safety.

## Canonical Backend

- Active backend service: `backend/`
- CI verification target: `verify:backend-core`
- Development target: `npm --prefix ./backend run dev`

## Policy

- Do not add new business logic to `apps/backend`.
- New API endpoints must be implemented in `backend/`.
- Remove this package after migration freeze period ends.
