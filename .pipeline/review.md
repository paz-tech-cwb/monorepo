# Review: Paz Church Backend Error Monitoring

## Verdict

SHIP

## Evidence reviewed

- `backend/src/common/monitoring/error-monitoring.ts`
  - Monitoring initializes only when `SENTRY_DSN` is present.
  - `sendDefaultPii` is disabled.
  - Request data sent by Sentry is reduced to method and URL.
  - Tracing defaults to disabled with `SENTRY_TRACES_SAMPLE_RATE=0`.

- `backend/src/common/filters/backend-error-monitoring.filter.ts`
  - Logs safe structured context for all caught API exceptions.
  - Sends Sentry-compatible events only when monitoring is enabled.
  - Uses project/service/environment/status/method/path/request-id tags.
  - Avoids request bodies, full headers, auth headers, cookies, tokens, and response bodies.
  - Preserves object `HttpException` responses and normalizes string responses.
  - Returns generic JSON for unknown 500 errors.

- `backend/src/main.ts`
  - Initializes monitoring at startup.
  - Adds request duration support.
  - Registers the global exception filter.

- `backend/src/common/filters/backend-error-monitoring.filter.spec.ts`
  - Covers safe logging, response preservation, 500 handling, and enabled/disabled monitoring behavior.

- `.ai/features/deployment.md` and `backend/.env.example`
  - Document required GlitchTip/Sentry-compatible env configuration.
  - Document Telegram alert routing through existing bot/bridge with sanitization and rate limiting.

## Blocking issues

None.

## Non-blocking notes

- Live delivery to GlitchTip requires environment configuration and was not tested locally.
- Telegram trend alerts require an external GlitchTip webhook bridge/workflow using the existing bot; this is intentionally not embedded in backend code.
- `npm install @sentry/node` reported existing dependency audit findings; no audit remediation was attempted because it is outside the scoped ticket.

## Security notes

- No secrets were added.
- No `.env` file was modified.
- Monitoring is opt-in via env.
- Error events are sanitized and do not include request bodies or sensitive headers.
