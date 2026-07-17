# Review: Backend address schema drift fix

## Verdict

SHIP

## Evidence reviewed

- `backend/src/addresses/entities/address.entity.ts` includes `number`, `complement`, and `neighborhood` columns.
- `backend/src/users/users.service.ts` saves address `number` during user creation.
- `backend/database/migrations/1784073600000-AddUserAddressDetails.ts` already adds the missing address detail columns with `ADD COLUMN IF NOT EXISTS`.
- `backend/Dockerfile` previously started `node dist/src/main.js` directly, which allowed pending migrations to remain unapplied in deployed databases.
- `backend/package.json` now includes `migration:run:prod` using the compiled `dist/db/data-source.js`, avoiding a rebuild at container startup.
- `backend/Dockerfile` now runs `npm run start:prod:migrate`, applying pending migrations before serving the API.
- `cd backend && npm run build` passed.
- `cd backend && npm run migration:run:prod` reached TypeORM migration execution and failed only because local Postgres was unavailable.

## Blocking issues

None.

## Non-blocking issues

- Running migrations from app container startup is suitable for the current single-backend deployment pattern. A dedicated migration job would be cleaner if deployments later run multiple replicas or require stricter rollout orchestration.

## Security review notes

- No secrets were added or changed.
- No API/auth behavior changed.
- No user input handling was changed.
