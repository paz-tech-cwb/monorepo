# Spec: Log Every Backend Error

## Request

Implement Trello ticket `bIOZSEWu` for the Paz Church backend by ensuring backend errors are logged consistently with safe, useful diagnostic context.

## Context files read

- `.ai/README.md`
- `.ai/project.md`
- `.ai/architecture.md`
- `.ai/conventions.md`
- `.ai/commands.md`
- `.ai/feature-map.md`
- `.ai/apps/backend.md`
- `.ai/pipelines/handoff-template.md`
- Trello card `bIOZSEWu`

## Affected apps/features

- `backend/` NestJS API
- Cross-cutting backend error handling/logging

## Implementation plan

1. Inspect existing backend bootstrap, modules, filters, and logging usage.
2. Add a global HTTP exception filter that logs every backend API error before preserving Nest's existing HTTP response behavior.
3. Include safe structured context: timestamp, request id/correlation id, method, path, status code, duration, environment, service, error type/message, sanitized stack, and pseudonymous user id when available.
4. Avoid sensitive data: no request/response bodies, auth headers, cookies, tokens, or full headers.
5. Add focused unit tests for the filter behavior and sanitization.
6. Register the filter globally in backend bootstrap.
7. Run focused tests and backend build, then record pipeline handoff results.

## API/data/auth impacts

- API response contracts should remain unchanged.
- No database schema changes.
- Auth behavior unchanged.
- Logs will include sanitized error diagnostics only.

## Validation plan

- `cd backend && npx jest src/common/filters/backend-error-logging.filter.spec.ts --runInBand`
- `cd backend && npm run build`
