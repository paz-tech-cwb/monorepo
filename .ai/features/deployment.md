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

## Error monitoring

Paz Church backend error monitoring uses a Sentry-compatible DSN so it can report to a self-hosted GlitchTip project. Configure a separate GlitchTip project/DSN per project and environment, for example `paz-church-backend-production` and `paz-church-backend-staging`.

Runtime variables:

```bash
SENTRY_DSN=<glitchtip project DSN>
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=paz-church-backend@<deployment-version>
SENTRY_SERVER_NAME=paz-church-backend
SENTRY_TRACES_SAMPLE_RATE=0
```

Production events must stay sanitized: no request bodies, full headers, auth tokens, cookies, or personal member data. Use GlitchTip alerts/webhooks for production error groups and spikes. Telegram notifications should be sent by the existing VPS/OpenHarness bot through a small webhook bridge or automation that filters by project/environment, rate-limits duplicate issues, and sends summaries plus links back to GlitchTip instead of raw sensitive payloads.

## Change checklist

- Update `.env.example` when runtime variables change.
- Update root/app Docker files together when service contracts change.
- Document migration/deployment steps in PR progress notes.
