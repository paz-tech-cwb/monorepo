# Feature: Deployment and Runtime

## Purpose

Run the platform locally and deploy containerized services reliably.

## Local development

Root scripts start the common local stack:

- PostgreSQL through Docker.
- Backend dev server.
- Admin UI dev server.
- Mobile app separately when needed.

## Containerized deployment

The root `docker-compose.yaml` is the deployment entrypoint for containerized environments such as Coolify. It keeps services on the Docker network and expects public routing to be provided by the hosting layer.

Expected public URL contract:

```bash
API_BASE_URL=https://church-api.<domain>/api
ADMIN_BASE_URL=https://church-admin.<domain>
CORS_ORIGIN=https://church-admin.<domain>
```

## Database

- Run migrations after backend is healthy.
- Keep `DB_SYNCHRONIZE=false` outside disposable local/dev contexts.

## Observability bridge

The optional `observability-bridge/` service provides read-only, sanitized GlitchTip summaries for OpenHarness/debugging. It is reusable across projects through JSON config aliases, enforces project/environment allowlists and range limits, and keeps the GlitchTip API token server-side.

Root Docker Compose keeps the bridge behind the `observability` profile so deployments must opt in explicitly. Coolify deployments should configure `OBSERVABILITY_BRIDGE_TOKEN`, `GLITCHTIP_API_TOKEN`, `GLITCHTIP_BASE_URL`, and `OBSERVABILITY_BRIDGE_CONFIG` as secrets/runtime variables.

## Change checklist

- Update `.env.example` when runtime variables change.
- Update root/app Docker files together when service contracts change.
- Document migration/deployment steps in PR progress notes.
