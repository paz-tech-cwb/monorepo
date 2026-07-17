# Review: Reusable GlitchTip Observability Bridge

## Verdict

SHIP

## Evidence reviewed

- `observability-bridge/src/app.ts` protects non-health routes with the bridge bearer token, applies rate limiting, and exposes only requested read-only routes.
- `observability-bridge/src/scope.ts` enforces project allowlist, environment allowlist, defaults, and max time ranges before GlitchTip queries.
- `observability-bridge/src/sanitize.ts` omits sensitive keys, redacts common PII values, and size-limits strings, arrays, objects, and stack frames.
- `observability-bridge/src/glitchtip-client.ts` keeps the GlitchTip token in outbound server-side requests only and returns sanitized results.
- `observability-bridge/config.example.json` includes Paz Church plus a future-project example without hardcoding behavior in code.
- `observability-bridge/README.md` documents API, Coolify deployment, OpenHarness usage examples, and security notes.
- `docker-compose.yaml` adds the bridge behind an explicit `observability` profile.
- `.env.example` and `.ai/features/deployment.md` document optional runtime variables/deployment context.
- `observability-bridge/__tests__/bridge.test.ts` covers auth, allowlist rejection, environment rejection, range rejection, safe defaults, sanitization, and query formatting.

## Blocking issues

None.

## Non-blocking issues

- A concrete OpenHarness MCP server wrapper is documented as suggested tool mappings but not implemented; the ticket allowed either HTTP API plus documented OpenHarness/client configuration or MCP wrapper.
- Dev dependency audit reports issues from local test/build tooling, but production dependency audit passes with zero vulnerabilities.

## Security review notes

- Bridge credential and GlitchTip credential are separate.
- GlitchTip token is never returned by the API.
- Raw event payloads are not exposed by default.
- Request/response bodies, headers, cookies, auth fields, tokens, passwords, CPF/payment/name/email/phone-like fields are omitted/redacted.
- Cross-project and non-allowlisted environment requests are rejected before querying GlitchTip.
