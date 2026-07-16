# Spec: Paz Church Backend Error Monitoring

## Request

Implement Trello ticket `bIOZSEWu` for Paz Church now by integrating backend API errors with a GlitchTip/Sentry-compatible error-monitoring flow and safe structured error logging.

## Context files read

- `.ai/README.md`
- `.ai/project.md`
- `.ai/architecture.md`
- `.ai/conventions.md`
- `.ai/commands.md`
- `.ai/feature-map.md`
- `.ai/apps/backend.md`
- `.ai/features/deployment.md`
- `.ai/pipelines/handoff-template.md`
- `.claude/agents/ship-pipeline.md`
- Trello card `bIOZSEWu`

## Affected apps/features

- `backend/` NestJS API
- Deployment/runtime documentation for error monitoring
- Cross-cutting backend error handling and observability

## Implementation plan

1. Add Sentry-compatible SDK support for GlitchTip using optional runtime env (`SENTRY_DSN`).
2. Initialize monitoring in backend bootstrap only when configured.
3. Add a global backend exception filter that logs every API error with safe structured context and reports errors to GlitchTip/Sentry-compatible monitoring when enabled.
4. Preserve existing HTTP exception response shape as closely as possible and return generic 500 responses for unknown errors.
5. Avoid sensitive data: no request/response bodies, auth headers, cookies, tokens, API keys, or full headers.
6. Add focused unit tests for response preservation, unknown errors, sanitization, and enabled/disabled monitoring behavior.
7. Document GlitchTip env variables and Telegram alert routing through the existing bot/bridge model.

## API/data/auth impacts

- API response contracts are intended to remain unchanged for normal `HttpException` responses.
- Unknown unhandled errors return generic `500` JSON responses.
- No database schema changes.
- Auth behavior unchanged.
- Logs and GlitchTip events include sanitized diagnostic context only.

## Validation plan

- `cd backend && npx jest src/common/filters/backend-error-monitoring.filter.spec.ts --runInBand`
- `cd backend && npm run build`

## OPEN QUESTIONS

None.
