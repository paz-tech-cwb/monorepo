# Commands

## Root

```bash
npm install
npm run db
npm run dev
npm run setup
```

Root scripts:

| Command | Purpose |
|---|---|
| `npm run db` | Start local PostgreSQL using backend compose file |
| `npm run dev:backend` | Start backend dev server |
| `npm run dev:admin` | Start admin-ui dev server |
| `npm run dev:mobile` | Start Flutter mobile app |
| `npm run dev` | Start DB, backend, and admin-ui concurrently |
| `npm run setup` | Start DB and run backend migrations |

## Backend

```bash
cd backend
npm install
npm run start:dev
npm run test
npx jest src/<feature>/<file>.spec.ts
npm run lint
npm run migration:run
```

## Admin UI

```bash
cd admin-ui
npm install
npm run dev
npm run build
npm run lint
```

## KMP mobile

Read `kmp-mobile` local docs/build files before running commands. Use Gradle/Xcode commands already established in that submodule.

## Deployment

The root `docker-compose.yaml` is the containerized deployment entrypoint for environments such as Coolify. Local development should prefer root npm scripts and `backend/docker-compose.yaml` for the database.
