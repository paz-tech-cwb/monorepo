# Coolify Split Services Migration Design

## Goal

Deploy the Paz Church Curitiba production stack to Coolify using small, independent resources for the database, backend, and web admin app, while keeping local development easy and predictable.

## Current Problem

The current production path uses the root `docker-compose.yaml` as a single Coolify deployment unit for `postgres`, `backend`, and `admin-ui`. That works as a container stack, but it made deployment troubleshooting harder because one Coolify resource owned every concern: database lifecycle, backend boot, web build, public routing, and internal networking.

The previous port-collision issue also showed that root compose deployment can accidentally inherit local or shared-server assumptions. The new direction should make each production service smaller and easier to reason about.

## Chosen Approach

Use separate Coolify resources:

- `church-db`: Coolify PostgreSQL database resource
- `church-api`: Coolify application built from `backend/Dockerfile`
- `church-web`: Coolify application built from `admin-ui/Dockerfile`

This is preferred over a single root compose app because each resource can be configured, redeployed, inspected, and rolled back independently.

## Rejected Approaches

### Keep Root Compose As Production Entrypoint

This is closest to the current repo, but it preserves the coupling that caused deployment friction. It is still useful as documentation or a local/container reference, but it should stop being the preferred production path.

### Extract Separate Repositories

Splitting the submodules into totally separate deployment repos may become useful later, but it is unnecessary for getting production online. Coolify can deploy from subdirectories inside the existing repository structure.

## Target Production Architecture

### Database

`church-db` should be a Coolify managed PostgreSQL resource.

Properties:

- PostgreSQL 16
- Persistent storage managed by Coolify
- No public domain
- No public port exposure
- Connection details provided to the backend through Coolify environment variables

The database should not be recreated by backend or web deployments.

### Backend

`church-api` should be a Coolify application.

Properties:

- Source directory: `backend`
- Build method: Dockerfile
- Dockerfile: `backend/Dockerfile`
- Container port: `3001`
- Public URL: temporary Coolify-generated URL during this migration
- Global API prefix: `/api`

Required runtime env:

```bash
DB_HOST=<coolify database host>
DB_PORT=5432
DB_USERNAME=<coolify database user>
DB_PASSWORD=<coolify database password>
DB_NAME=<coolify database name>
DB_SYNCHRONIZE=false
DB_LOGGING=false
ACCESS_TOKEN_SECRET=<32+ chars>
REFRESH_TOKEN_SECRET=<32+ chars>
GOOGLE_CLIENT_ID=<google oauth client id>
APPLE_BUNDLE_ID=<optional if Apple login is enabled>
PORT=3001
CORS_ORIGIN=https://<church-web-temp-url>
FIREBASE_PROJECT_ID=<firebase admin project id>
FIREBASE_CLIENT_EMAIL=<firebase admin client email>
FIREBASE_PRIVATE_KEY=<firebase admin private key>
RESEND_API_KEY=<optional email provider key>
RESEND_FROM_EMAIL=<sender email>
TWILIO_ACCOUNT_SID=<optional sms provider sid>
TWILIO_AUTH_TOKEN=<optional sms provider token>
TWILIO_FROM_NUMBER=<optional sms sender>
META_WHATSAPP_TOKEN=<optional whatsapp token>
META_WHATSAPP_PHONE_NUMBER_ID=<optional whatsapp phone id>
```

The backend public URL should be used as:

```bash
https://<church-api-temp-url>/api
```

### Web Admin

`church-web` should be a Coolify application.

Properties:

- Source directory: `admin-ui`
- Build method: Dockerfile
- Dockerfile: `admin-ui/Dockerfile`
- Container port: `3000`
- Public URL: temporary Coolify-generated URL during this migration

Required build/runtime env:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<church-api-temp-url>/api
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase public key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase auth domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase project id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<firebase storage bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<firebase sender id>
NEXT_PUBLIC_FIREBASE_APP_ID=<firebase app id>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<firebase measurement id>
```

Important: `NEXT_PUBLIC_API_BASE_URL` is baked into the Next.js client bundle during the image build, so the API temporary URL must be assigned before building or rebuilding `church-web`.

## Local Development Design

Local development should stay simple and should not require the split Coolify production topology.

Preferred local flow:

```bash
npm install
cp backend/.env.example backend/.env
cp admin-ui/.env.local.example admin-ui/.env.local
npm run db
cd backend && npm run migration:run
cd .. && npm run dev
```

Local service URLs:

- Admin UI: `http://localhost:3000`
- Backend API: `http://localhost:3001/api`
- PostgreSQL: `localhost:5432`

The root `npm run db` should continue using `backend/docker-compose.yaml` to start local PostgreSQL only. Backend and admin should run as normal development processes so hot reload remains fast.

## Temporary URL Strategy

The first production deployment should use Coolify temporary URLs:

- Backend: `https://<coolify-generated-api-url>`
- Web: `https://<coolify-generated-web-url>`

After both URLs exist:

1. Set backend `CORS_ORIGIN` to the web temporary URL.
2. Set web `NEXT_PUBLIC_API_BASE_URL` to the backend temporary URL plus `/api`.
3. Rebuild the web app after setting the API URL.
4. Add the web temporary URL to Firebase authorized domains.
5. Verify Google OAuth accepts the temporary URL.

## Migration And Data

The first production deploy should not use `DB_SYNCHRONIZE=true`.

After `church-api` can reach `church-db`, run migrations explicitly from the backend app/container:

```bash
npm run migration:run
```

This keeps schema changes visible and avoids accidental production schema drift.

## Verification Strategy

Use these checkpoints in order:

1. `church-db` is healthy in Coolify.
2. `church-api` deploys and listens on port `3001`.
3. Backend health or API smoke request reaches `https://<api-temp-url>/api`.
4. Backend migrations run successfully.
5. `church-web` deploys and listens on port `3000`.
6. Browser requests from web target `https://<api-temp-url>/api`, not localhost.
7. Firebase/Google login completes on the web temporary URL.
8. One authenticated admin API request succeeds end-to-end.

## Risks

### Temporary URL Auth Drift

Firebase and OAuth provider settings can block login even when containers are healthy. The temporary web URL must be registered before auth testing.

### Build-Time API Coupling

The admin app embeds `NEXT_PUBLIC_API_BASE_URL` at build time. Changing the backend URL requires rebuilding `church-web`.

### Existing Firebase Dependency

This plan deploys the current code as-is. The app still uses Firebase Auth and Firebase public/admin configuration. Moving fully away from Firebase auth is a separate product/backend migration and should not be mixed into this deployment stabilization pass.

### Root Compose Confusion

The root `docker-compose.yaml` may still exist, but docs should make clear that production now uses separate Coolify resources. Root compose should not be treated as the default production entrypoint after this migration.

## Success Criteria

- Production database, backend, and web are separate Coolify resources.
- Backend and web are reachable on temporary Coolify URLs.
- Database is private and persistent.
- Backend connects to the Coolify database without public DB exposure.
- Web calls the backend temporary URL, not localhost.
- Auth and one DB-backed admin workflow succeed end-to-end.
- Local development remains easy with local Postgres plus normal backend/admin dev servers.
