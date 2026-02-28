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

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in secrets
docker compose up -d   # start PostgreSQL
npm install
npm run migration:run
npm run start:dev      # http://localhost:3001/api
```

### 2. Admin UI

```bash
cd admin-ui
cp .env.local.example .env.local   # fill in Firebase + API keys
npm install
npm run dev   # http://localhost:3000
```

### 3. Mobile App

```bash
cd mobile-app
flutter pub get
flutter run   # requires a connected device or emulator
```

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
