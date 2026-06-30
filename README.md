# Paz Church Curitiba — Platform

A monorepo for the Paz Church Curitiba digital platform, organized as git submodules.

---

## Submodules

| Repo | Stack | Description |
|------|-------|-------------|
| [`admin-ui`](https://github.com/paz-tech-cwb/admin-ui) | Next.js 15 · React 19 · TypeScript · shadcn/ui | Web dashboard for church staff |
| [`backend`](https://github.com/paz-tech-cwb/backend) | NestJS 11 · TypeORM · PostgreSQL 16 | REST API consumed by all clients |
| [`mobile-app`](https://github.com/paz-tech-cwb/mobile-app) | Flutter 3.7+ · Dart · GetX | Member-facing iOS & Android app |
| [`postman-files`](https://github.com/paz-tech-cwb/postman-files) | Postman | API collections and environments |

---

## Getting Started

### Clone everything at once

```bash
git clone --recurse-submodules <root-repo-url>
```

### Or initialize submodules after a plain clone

```bash
git submodule update --init --recursive
```

---

## Running locally

### All at once (recommended)

Start all services from the root with a single command:

```bash
# 1. Install root dev tooling (first time only)
npm install

# 2. Copy and fill in secrets
cp .env.example .env

# 3. Start an iOS Simulator or Android emulator, then:
npm run dev
```

This starts PostgreSQL (Docker), the backend, admin-ui, and the Flutter app concurrently with labeled, colored output. Each service auto-restarts on file changes.

| Service | URL / target |
|---------|-------------|
| admin-ui | http://localhost:3000 |
| backend API | http://localhost:3001/api |
| mobile app | connected device / emulator |

> **Flutter prerequisite:** a simulator or physical device must be running before `npm run dev`. Start one first:
> ```bash
> open -a Simulator                              # iOS
> flutter emulators --launch <emulator-id>       # Android
> ```
> To target a specific device, edit `dev:mobile` in the root `package.json`.

Individual service scripts are also available:

```bash
npm run dev:backend   # backend only
npm run dev:admin     # admin-ui only
npm run dev:mobile    # Flutter only
npm run db            # PostgreSQL only (detached Docker)
```

### First-time database setup

After the backend container is running, apply migrations once:

```bash
docker compose exec backend npm run migration:run
# or locally:
cd backend && npm run migration:run
```

---

### Running services individually

<details>
<summary>Expand for per-service setup</summary>

#### Backend

```bash
cd backend
cp .env.example .env   # fill in secrets
docker compose up -d   # start PostgreSQL
npm install
npm run migration:run
npm run start:dev      # http://localhost:3001/api
```

#### Admin UI

```bash
cd admin-ui
# create a local .env.local with NEXT_PUBLIC_API_BASE_URL + Firebase keys
npm install
npm run dev   # http://localhost:3000
```

#### Mobile App

```bash
cd mobile-app
flutter pub get
flutter run   # requires a connected device or emulator
```

</details>

---

### Docker (all services containerized)

To run the backend and admin-ui fully containerized (e.g. for staging):

```bash
cp .env.example .env   # fill in all vars including Firebase
docker compose up --build
```

Services start at the same URLs. Run migrations after the first boot:

```bash
docker compose exec backend npm run migration:run
```

---

## Coolify Deployment

The current VPS deployment target is one Coolify Docker Compose application created from the repository root.

### Deployment shape

- `postgres`: internal-only service with persistent storage
- `backend`: public API service on a temporary Coolify subdomain
- `admin-ui`: public web service on a separate temporary Coolify subdomain

Recommended temporary public URLs:

- Admin: `https://church-admin.<your-coolify-domain>`
- API: `https://church-api.<your-coolify-domain>/api`

### Required environment variables

Set these in Coolify before the first deploy:

```bash
DB_USERNAME=
DB_PASSWORD=
DB_NAME=church
DB_PORT=5432
DB_SYNCHRONIZE=false
DB_LOGGING=false

ADMIN_BASE_URL=https://church-admin.<your-coolify-domain>
API_BASE_URL=https://church-api.<your-coolify-domain>/api
CORS_ORIGIN=https://church-admin.<your-coolify-domain>

ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
GOOGLE_CLIENT_ID=
APPLE_BUNDLE_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@pazchurch.com.br
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Notes:

- `API_BASE_URL` is injected into the admin build, so it must already point at the backend public URL before `admin-ui` builds.
- `ADMIN_BASE_URL` documents the intended public admin host for operators even though the current compose file only consumes `CORS_ORIGIN` and `API_BASE_URL`.
- Keep production secrets in Coolify only. Do not commit a populated `.env`.

### Coolify setup steps

1. Create a new Docker Compose application in Coolify.
2. Point it at the repository root.
3. Use the root `docker-compose.yaml` as the compose source.
4. Configure the environment variables listed above.
5. Attach a public domain to the `backend` service.
6. Attach a separate public domain to the `admin-ui` service.
7. Leave `postgres` internal-only.
8. Deploy the stack.

### First deploy sequence

1. Wait for `postgres`, `backend`, and `admin-ui` to become healthy in Coolify.
2. Run backend migrations from the deployed backend container:

```bash
npm run migration:run
```

3. Open the admin public URL and confirm the app loads.
4. Confirm the admin is calling the deployed backend URL.
5. Test one authenticated admin flow end-to-end.

### Provider-console follow-up

After assigning the temporary Coolify domains, update external auth/config providers:

- Add the temporary admin domain to Firebase Authorized Domains.
- Verify Google login accepts the temporary deployed domain.
- If Apple Sign-In is active, verify its current domain/app identity assumptions before release.

### Future move to `paz.church/curitiba`

This deployment is intentionally subdomain-first so the stack can go live now. Later:

- The backend should be movable mostly through routing and environment changes.
- The admin may need explicit Next.js `basePath` support if it must live under `paz.church/curitiba` instead of a dedicated subdomain.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Firebase Auth                   │
│         (Google & Apple OAuth)               │
└────────────────────┬────────────────────────┘
                     │ ID token exchange
                     ▼
┌─────────────────────────────────────────────┐
│                 backend                      │
│          NestJS REST API (/api)              │
│        PostgreSQL · JWT · TypeORM            │
└──────────┬──────────────────┬───────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌───────────────────────┐
│    admin-ui      │  │      mobile-app        │
│  Next.js 15      │  │      Flutter 3.7+      │
│  (staff portal)  │  │   (member app)         │
└──────────────────┘  └───────────────────────┘
```

Authentication works the same way across all clients: Firebase issues an ID token → backend exchanges it for a JWT access token (24 h) and refresh token (30 d) → clients use the JWT for all subsequent requests.

---

## Working with Submodules

Each submodule is an independent git repository. Changes must be committed and pushed from within the submodule's folder.

```bash
# Make changes inside a submodule
cd backend
git checkout -b feat/my-feature
# ... make changes ...
git commit -am "feat: my change"
git push

# Record the updated submodule pointer in the root repo
cd ..
git add backend
git commit -m "chore: update backend submodule"
```

To pull the latest from all submodule remotes:

```bash
git submodule update --remote
```
