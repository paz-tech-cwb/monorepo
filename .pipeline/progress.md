# Progress

## Request

Fix backend `POST /api/users` address insert failure: missing `addresses.number` column in production.

## Status

- [x] Context reviewed
- [x] Spec updated
- [x] Root cause identified
- [x] Implementation complete
- [x] Tests complete
- [x] Review complete
- [ ] Branch pushed
- [ ] PR opened

## Timeline

- 2026-07-17 — Read `.ai/` context, backend instructions, people/membership docs, deployment docs, and pipeline handoff expectations.
- 2026-07-17 — Confirmed backend submodule was clean before changes; root had unrelated pre-existing `kmp-mobile` and `.pnpm-store/` changes.
- 2026-07-17 — Found `Address` entity writes `number`, `complement`, and `neighborhood`; existing migration `1784073600000-AddUserAddressDetails` adds those columns.
- 2026-07-17 — Identified deployment startup drift: Docker command started API directly without running pending migrations.
- 2026-07-17 — Added production migration startup scripts and changed backend Docker command to run migrations before serving.
- 2026-07-17 — Backend build passed; production migration command reached DB connection and failed locally because no Postgres was listening on localhost:5432.

## Current branch / PR

- Branch: `main` working tree
- PR: pending
