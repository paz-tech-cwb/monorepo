# Observability Bridge

Reusable, read-only GlitchTip bridge for OpenHarness-safe production debugging.

The bridge keeps the GlitchTip API token server-side and exposes only sanitized summaries through a separate bridge token.

## API

All routes except `/health` require:

```http
Authorization: Bearer <OBSERVABILITY_BRIDGE_TOKEN>
```

Routes:

```txt
GET /health
GET /projects
GET /errors/top?project=<alias>&environment=<env>&range=1h
GET /errors/new?project=<alias>&environment=<env>&since_release=<release>&range=24h
GET /errors/by-request-id?project=<alias>&environment=<env>&request_id=<id>&range=24h
GET /errors/:issue_id/summary?project=<alias>&environment=<env>
GET /errors/:issue_id/representative-stack?project=<alias>&environment=<env>
```

## Configuration

Copy `config.example.json` to a deployment secret/file and set `OBSERVABILITY_BRIDGE_CONFIG` to that path.

Each alias maps to one GlitchTip organization/project and an allowlist of environments. Adding a future project requires configuration only:

```json
{
  "projects": {
    "future-project-prod": {
      "organizationSlug": "future-org",
      "projectSlug": "future-project-api",
      "defaultEnvironment": "production",
      "allowedEnvironments": ["production"],
      "defaultRange": "1h",
      "maxRange": "24h"
    }
  }
}
```

## Environment variables

```bash
PORT=3015
OBSERVABILITY_BRIDGE_TOKEN=<separate token for OpenHarness/MCP clients>
OBSERVABILITY_BRIDGE_CONFIG=/app/config.json
GLITCHTIP_BASE_URL=https://app.glitchtip.com/api/0
GLITCHTIP_API_TOKEN=<read-only GlitchTip API token>
GLITCHTIP_AUTH_SCHEME=Bearer # or Token for self-hosted GlitchTip API tokens
```

Use a read-only GlitchTip token scoped to the allowlisted projects when possible. Hosted GlitchTip typically uses `Bearer`; some self-hosted GlitchTip API tokens require `GLITCHTIP_AUTH_SCHEME=Token`.

## Coolify deployment

1. Create a new service from `observability-bridge/Dockerfile` or enable the optional `observability-bridge` service in the root compose file.
2. Mount or paste the JSON config as a Coolify secret/file.
3. Set `OBSERVABILITY_BRIDGE_CONFIG` to the mounted file path.
4. Set `OBSERVABILITY_BRIDGE_TOKEN` and `GLITCHTIP_API_TOKEN` as Coolify secrets.
5. Route the service privately if possible. If public, require HTTPS at the proxy and keep the bridge token secret.
6. Health check `GET /health`.

## OpenHarness usage examples

```bash
curl -H "Authorization: Bearer $OBSERVABILITY_BRIDGE_TOKEN" \
  "$OBSERVABILITY_BRIDGE_URL/errors/top?project=paz-church-BE-prod&environment=production&range=1h"

curl -H "Authorization: Bearer $OBSERVABILITY_BRIDGE_TOKEN" \
  "$OBSERVABILITY_BRIDGE_URL/errors/12345/summary?project=paz-church-BE-prod&environment=production"

curl -H "Authorization: Bearer $OBSERVABILITY_BRIDGE_TOKEN" \
  "$OBSERVABILITY_BRIDGE_URL/errors/12345/representative-stack?project=paz-church-BE-prod&environment=production"
```

Suggested MCP/OpenHarness tool wrappers can map directly to these routes:

- `glitchtip_list_top_errors`
- `glitchtip_get_issue_summary`
- `glitchtip_find_by_request_id`
- `glitchtip_list_errors_since_release`
- `glitchtip_get_representative_stack`

## Security notes

The bridge intentionally does **not** expose raw GlitchTip events, request bodies, response bodies, complete headers, cookies, auth tokens, API keys, passwords, or common PII fields such as emails, phone numbers, names, CPF, and payment data.

Safety controls:

- separate bridge credential from GlitchTip credential;
- GlitchTip token remains server-side only;
- project aliases are allowlisted;
- environments are allowlisted per project;
- ranges default to `1h` and are capped per project/config;
- simple in-memory rate limiting;
- audit logs include operation, project, environment, and time range only.

The bridge is read-only and should be deployed without write/admin GlitchTip permissions.
