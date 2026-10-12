# Changes

## Changed files

- `backend/package.json` — added production scripts for running compiled TypeORM migrations and then starting the API.
- `backend/Dockerfile` — changed container command from direct Node startup to `npm run start:prod:migrate`.
- `.ai/features/deployment.md` — documented that production backend containers run pending migrations before serving.
- `.pipeline/*` — updated ship pipeline handoff for this fix.

## Behavior changes

- Backend production containers now run pending TypeORM migrations before starting `dist/src/main.js`.
- Pending migration `1784073600000-AddUserAddressDetails` will add `addresses.number`, `addresses.complement`, and `addresses.neighborhood` in environments where it has not run yet.
- `POST /api/users` can insert address details without failing on missing `addresses.number` once the updated container starts successfully.

## Docs updated

- `.ai/features/deployment.md`

## Migration/deployment notes

- No new migration was added; the existing migration already covers the missing columns.
- Deployment must rebuild/redeploy the backend image so the new Docker command runs.
- If multiple backend replicas are started simultaneously, TypeORM migration locking/metadata handles already-applied migrations; prefer rolling out with a single backend replica during migration if the hosting setup allows it.

## Follow-ups

- Consider adding an explicit deployment job/service for migrations if the platform grows beyond a single backend container pattern.

---

## Phase B1 — backend foundation (life group rotating tasks)

### Files
- `backend/database/migrations/1795900000003-AddLifeGroupTasksEnumValues.ts` — adds `life_group_tasks` to `reminder_rule_type_enum` and `life_group_task` to `notification_category_enum` (own migration: Postgres cannot use a new enum value in the same transaction).
- `backend/database/migrations/1795900000004-CreateLifeGroupTasks.ts` — idempotent (`IF NOT EXISTS`) creation of templates, overrides, assignments (snapshots, `notified_at`, `reminded_at`, unique group/template/date, status/source checks), member_settings, group_settings (`min_present_meetings` default 3), skips; `user_life_groups.joined_at timestamptz NOT NULL DEFAULT now()`; grandfather INSERT (`eligible=true`, note `grandfathered at migration`, `ON CONFLICT DO NOTHING`); seeds reminder rule `life_group_tasks` ENABLED (`days_before_meeting:[3,1]`, `hour:9`). `down()` reverses all.
- `backend/src/life-group-tasks/entities/*.entity.ts` (6 entities) + registered in `backend/src/configs/orm.config.ts`.
- `backend/src/life-group-tasks/eligibility.ts` — pure `resolveEligibility` (explicit wins; leader/co-leader eligible; else present count >= min).
- `backend/src/life-group-tasks/assignment-engine.ts` — pure `assignTasks` with injectable RNG, `createSeededRng`.
- `backend/src/life-group-tasks/{eligibility,assignment-engine}.spec.ts`.

### Notes
- `user_life_groups` join table needs no entity change: TypeORM many-to-many inserts only `user_id`/`life_group_id`, so `joined_at` takes its DB default `now()`. No other insert path writes that table via raw SQL (grep of `src` found only the User entity `@JoinTable`).
- Not done in B1 (belongs to B3): `ReminderRuleType`/`DEFAULT_CONFIGS` TS type, `ReminderRule` entity enum list, `NOTIFICATION_CATEGORIES`/channel map entries.
- Migration NOT run against any DB.
