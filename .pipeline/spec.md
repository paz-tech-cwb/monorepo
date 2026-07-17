# Spec: Reusable OpenHarness-safe GlitchTip Error Bridge

## Request

Implement Trello ticket `ZE9mcEl3`: create a reusable, project-agnostic bridge that lets OpenHarness/AI agents safely query sanitized GlitchTip error data without exposing secrets, raw payloads, or cross-project data.

## Context files read

- `.ai/README.md`
- `.ai/project.md`
- `.ai/architecture.md`
- `.ai/conventions.md`
- `.ai/commands.md`
- `.ai/feature-map.md`
- `.ai/apps/root.md`
- `.ai/features/deployment.md`
- `.ai/pipelines/handoff-template.md`
- `.claude/agents/ship-pipeline.md`
- Trello card `ZE9mcEl3`

## Affected apps/features

- Root deployment configuration
- New reusable `observability-bridge/` service
- Deployment/runtime documentation

## Implementation plan

1. Add a standalone root-level Node/TypeScript HTTP service in `observability-bridge/`.
2. Expose read-only routes for health, projects, top errors, new errors since release, request/correlation ID lookup, issue summary, and representative stack trace.
3. Require a separate bridge bearer token and keep the GlitchTip API token server-side only.
4. Load project/environment mappings from JSON configuration, including Paz Church and a future-project example.
5. Enforce project allowlist, environment allowlist, required/default project scope, default/max time ranges, and simple rate limiting.
6. Sanitize returned issue/event/stack data and omit raw request/response bodies, headers, cookies, auth tokens, secrets, PII, and raw payloads.
7. Add Coolify/OpenHarness usage docs and optional root Compose profile wiring.
8. Add focused tests for auth, allowlists, range limits, sanitization, and GlitchTip query formatting.

## API/data/auth impacts

- Adds a separate optional bridge service; no backend/admin/mobile API contract changes.
- Bridge auth is independent from church app auth and uses `OBSERVABILITY_BRIDGE_TOKEN`.
- GlitchTip token is stored only as server-side `GLITCHTIP_API_TOKEN`.
- No database changes.

## Validation plan

- `cd observability-bridge && npm test`
- `cd observability-bridge && npm run build`
- `cd observability-bridge && npm audit --omit=dev`

## OPEN QUESTIONS

None.
