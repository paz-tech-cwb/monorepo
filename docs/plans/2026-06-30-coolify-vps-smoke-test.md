# Coolify VPS Smoke Test Runbook

## Goal

Verify the first Coolify deployment of the root church stack after moving `postgres`, `backend`, and `admin-ui` to temporary Coolify subdomains.

## Preconditions

- Coolify app created from the repository root
- Root `docker-compose.yaml` deployed
- Public domains attached to `backend` and `admin-ui`
- Coolify environment variables configured
- Backend migration command available in the deployed container

## Deploy Sequence

1. Deploy the stack in Coolify.
2. Wait for `postgres` healthcheck to pass.
3. Wait for `backend` to start successfully.
4. Wait for `admin-ui` build and startup to complete.
5. Run backend migrations in the deployed backend container:

```bash
npm run migration:run
```

## Smoke Tests

### 1. Admin page load

- Open the temporary admin URL.
- Expected: login page or authenticated shell loads without a blank screen or runtime error.

### 2. Backend API reachability

- Open the browser network tab from the admin.
- Expected: requests target the deployed `API_BASE_URL`, not `localhost`.

### 3. CORS validation

- Trigger an API request from the deployed admin.
- Expected: request is not blocked by CORS and the backend accepts the admin domain configured in `CORS_ORIGIN`.

### 4. Database-backed request

- Trigger one request that reads real data from the backend.
- Expected: backend responds successfully and logs show no Postgres connection errors.

### 5. Auth flow

- Attempt one real sign-in flow used by the admin.
- Expected: auth completes and the admin can load authenticated data.

### 6. Migration verification

- Confirm the backend remains healthy after running `npm run migration:run`.
- Expected: no boot loop, no schema mismatch errors, no repeated migration failures.

## External Provider Follow-up

- Firebase Authorized Domains includes the temporary admin Coolify host.
- Google sign-in configuration accepts the deployed temporary domain.
- Apple sign-in, if enabled, is revalidated separately.

## Rollback Posture

If the deployment fails:

1. Check Coolify env values first.
2. Check service domain assignments next.
3. Check backend logs for DB or secret misconfiguration.
4. Check admin build logs for wrong `API_BASE_URL`.
5. Avoid editing application code until env and routing mistakes are ruled out.
