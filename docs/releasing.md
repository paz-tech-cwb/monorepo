# Release Process

Production deploys are still triggered **only** by merge to `develop`, via the existing Trello/Harness automation:

```txt
Brainstorm → Progress → Review + harness:approved → merge to develop → release:pending → scheduled release → Done
```

This document adds a **tagged, versioned release trail** on top of that flow — it does not change what triggers a production deploy.

## Versioning

Use semver tags on `main`: `vMAJOR.MINOR.PATCH` (e.g. `v1.4.0`).

- `MAJOR` — breaking API/schema change
- `MINOR` — new feature, backward compatible
- `PATCH` — fix, backward compatible

## Cutting a release

After `develop` has been merged to `main` (or at whatever point `main` reflects what's in/going to production):

```sh
git checkout main
git pull
git tag -a v1.4.0 -m "v1.4.0"
git push origin v1.4.0
```

Pushing the tag triggers `.github/workflows/release.yml`, which:

- generates a changelog from commits since the previous tag;
- records the `backend` and `admin-ui` submodule refs included in this release;
- publishes a GitHub Release with notes and a rollback command template.

## Rollback

Every release's notes include the previous tag and a rollback command shape:

```sh
ssh root@<vps-host> 'coolify-guarded-deploy <app-name-or-uuid>'
```

To roll back:

1. Point the Coolify app (`paz-curitiba-api` / `paz-curitiba-admin-ui`) at the previous tag's commit/branch per the release notes.
2. Redeploy through the guard — never bypass it, per `docs/environment/vps-deployment.md`.
3. Run the health check for that app.
4. If the rollback involves reverting a database migration, follow the migration's own `down()` — do not restore from a raw DB snapshot on shared infrastructure without explicit approval.

## Local staging environment

A fully local staging stack (`admin-ui` + `backend` + `postgres`) runs on Colima and never touches production:

```sh
cp .env.staging.example .env.staging   # once
scripts/staging.sh up
scripts/staging.sh seed                # migrations + backend/database/seed.sql (synthetic data only)
scripts/staging.sh logs
scripts/staging.sh down
```

See `docker-compose.staging.yaml` and `scripts/staging.sh`.
