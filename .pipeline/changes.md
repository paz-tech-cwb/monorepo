# Coder Changes

## Files changed

### Backend submodule

- `backend/package.json`
  - Added `@sentry/node` for Sentry-compatible GlitchTip error reporting.

- `backend/package-lock.json`
  - Updated dependency lockfile for `@sentry/node`.

- `backend/.env.example`
  - Added optional error-monitoring runtime variables:
    - `SENTRY_DSN`
    - `SENTRY_ENVIRONMENT`
    - `SENTRY_RELEASE`
    - `SENTRY_SERVER_NAME`
    - `SENTRY_TRACES_SAMPLE_RATE`

- `backend/src/main.ts`
  - Initializes error monitoring before app bootstrap when `SENTRY_DSN` is configured.
  - Adds request start-time middleware for duration context.
  - Registers the global backend error-monitoring filter.

- `backend/src/common/monitoring/error-monitoring.ts`
  - Added Sentry-compatible initialization for GlitchTip.
  - Keeps monitoring disabled unless `SENTRY_DSN` is present.
  - Disables default PII sending and strips request details to method/url only in `beforeSend`.
  - Exposes a small capture wrapper for testable monitoring integration.

- `backend/src/common/filters/backend-error-monitoring.filter.ts`
  - Logs every caught backend/API exception with safe structured context.
  - Reports errors to GlitchTip/Sentry-compatible monitoring when enabled.
  - Adds project/service/environment/status/method/path/request-id tags.
  - Adds pseudonymous user id only when available.
  - Does not log request bodies, full headers, cookies, auth tokens, or response bodies.
  - Preserves object `HttpException` responses and normalizes string `HttpException` responses.
  - Returns generic `500` JSON for unknown errors.

- `backend/src/common/filters/backend-error-monitoring.filter.spec.ts`
  - Added focused coverage for response preservation, string exception normalization, unknown 500 errors, sanitization, and enabled/disabled monitoring behavior.

### Root docs/pipeline

- `.ai/features/deployment.md`
  - Documented GlitchTip/Sentry-compatible env variables.
  - Documented separate project/environment DSNs.
  - Documented Telegram alerts through the existing VPS/OpenHarness bot via a sanitized webhook bridge or automation.

- `.pipeline/spec.md`
- `.pipeline/progress.md`
- `.pipeline/changes.md`
- `.pipeline/test-results.md`
- `.pipeline/review.md`
  - Updated pipeline handoff files for this implementation.

## Behavior changes

- Paz Church backend now logs every caught API exception through a global exception filter.
- When `SENTRY_DSN` is configured, the same errors are also reported to a GlitchTip/Sentry-compatible project.
- Monitoring is optional and disabled by default in environments without `SENTRY_DSN`.
- No Telegram credentials or direct Telegram integration were added to the backend; Telegram should consume sanitized GlitchTip alerts via the existing bot/bridge path.

## Docs updated

- `.ai/features/deployment.md`
- `backend/.env.example`
- `.pipeline/*`

## Migration notes

No database migration required.

## Deployment notes

Configure a separate GlitchTip project and DSN per project/environment. For Paz Church backend production, set at least:

```bash
SENTRY_DSN=<glitchtip DSN>
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=paz-church-backend@<deployment-version>
SENTRY_SERVER_NAME=paz-church-backend
SENTRY_TRACES_SAMPLE_RATE=0
```

## Follow-ups

- Provision GlitchTip in Coolify if not already deployed.
- Add a GlitchTip webhook-to-Telegram bridge/workflow using the existing bot for production alerts and trend summaries.
- Later phases can add admin web/mobile crash reporting and AI-safe read-only querying.
