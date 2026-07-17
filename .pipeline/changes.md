# Changes

## Changed files

- `observability-bridge/package.json` — new bridge service dependencies/scripts.
- `observability-bridge/package-lock.json` — reproducible service dependency lockfile.
- `observability-bridge/tsconfig.json` — TypeScript build config.
- `observability-bridge/Dockerfile` — container build/runtime image.
- `observability-bridge/config.example.json` — reusable project/environment allowlist example including Paz Church and a future project.
- `observability-bridge/README.md` — API, Coolify deployment, OpenHarness usage, and security notes.
- `observability-bridge/src/*` — bridge runtime, configuration, GlitchTip client, auth/rate limiting, audit logging, scoping, and sanitization.
- `observability-bridge/__tests__/bridge.test.ts` — focused tests.
- `docker-compose.yaml` — optional `observability` profile service.
- `.env.example` — optional bridge runtime variables.
- `.ai/features/deployment.md` — deployment context for the optional bridge.
- `.pipeline/*` — ship pipeline handoff updates.

## Behavior changes

- Adds an optional standalone read-only bridge for sanitized GlitchTip queries.
- Requires bridge bearer token for all non-health routes.
- Enforces project aliases, per-project environment allowlists, default/max ranges, and simple in-memory rate limits.
- Returns sanitized issue/event/stack summaries only.

## Migration/deployment notes

- Existing app services are unchanged.
- Root Compose bridge service is behind profile `observability`; opt in with `--profile observability` or Coolify service configuration.
- Configure `OBSERVABILITY_BRIDGE_TOKEN`, `GLITCHTIP_API_TOKEN`, `GLITCHTIP_BASE_URL`, and `OBSERVABILITY_BRIDGE_CONFIG` in deployment secrets/runtime settings.

## Follow-ups

- Add a concrete OpenHarness MCP wrapper once the target OpenHarness MCP deployment convention is selected.
