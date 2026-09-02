# Changes: Fix 2 — announcements (backend)

Scope: backend repo only, `src/announcements/**`, per `.pipeline/spec.md` "Fix 2".

## Files changed

### `src/announcements/entities/announcement.entity.ts`
- Added `@Expose({ name: 'snake_case' })` decorators on every property to define the wire-layer JSON mapping (the controller uses `@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })`, so `@Expose` here controls the renamed JSON keys, not visibility):
  - `id` -> `id`
  - `imageUrl` -> `image_url`
  - `title` -> `title`
  - `subtitle` -> `subtitle`
  - `markdownContent` -> `markdown_content`
  - `actionUrl` -> `action_url`
  - `createdAt` -> `created_at`
  - `updatedAt` -> `updated_at`
- Mirrors exactly the field names in admin-ui's `Announcement` type (`lib/api/types/announcements.ts`), except `is_active`, which does not exist on the backend entity/DTOs and was out of spec scope for this fix — left untouched.

### `src/announcements/dto/create-announcement.dto.ts`
- Added matching `@Expose({ name: 'snake_case' })` decorators (`image_url`, `markdown_content`, `action_url`; `title`/`subtitle` unchanged since they're already the same on both sides) so incoming snake_case request bodies deserialize correctly to the camelCase DTO properties.
- Made `actionUrl` optional: added `@IsOptional()` and changed the property to `actionUrl?: string` to match admin-ui's optional `action_url`.

### `src/announcements/dto/update-announcement.dto.ts`
- No change needed. It already extends `PartialType(CreateAnnouncementDto)`, which correctly inherits the new `@Expose`/validator decorators from the base DTO.

### `src/announcements/announcements.controller.ts`
- Added `@UseGuards(AuthGuard('jwt'))` at the controller class level (imported `AuthGuard` from `@nestjs/passport`), matching the pattern used by `AreasController`. All announcement routes now require a valid JWT, consistent with other admin controllers.
- Added a `@Put(':id')` handler (`replace()`) alongside the existing `@Patch(':id')` handler (`update()`). NestJS does not support stacking two HTTP-method decorators on a single method, so a thin second method was added that calls the same `announcementsService.update()` — both `PATCH` and `PUT` now hit the identical update path, matching admin-ui's expectation that `PUT` is a valid update verb.

### `src/announcements/announcements.controller.spec.ts` and `src/announcements/announcements.service.spec.ts`
- Rewrote both spec files to use the `getEntityManagerToken()` mock-provider pattern already used elsewhere in the codebase (e.g. `src/contributions/contributions.controller.spec.ts`/`contributions.service.spec.ts`). The prior versions provided `AnnouncementsService` directly without mocking its `EntityManager` dependency, which failed to compile the Nest testing module (pre-existing bug, confirmed present before this change via `git stash`).
- Added a test asserting `replace()` and `update()` both delegate to the same `AnnouncementsService.update()` call with identical arguments.

## Verification
- `npx eslint` on all changed files: clean. (Full-repo `npm run lint` has pre-existing failures in unrelated files — e.g. `src/roles/roles.service.ts`, `src/sectors/sectors.service.ts`, `src/announcements/announcements.service.ts` [untouched, 2 pre-existing `no-unused-vars` errors] — none introduced by this change.)
- `npx tsc --noEmit`: no errors related to announcements.
- `npx jest announcements`: 2 suites, 3 tests, all passing.

## What the Tester should focus on
- Confirm admin-ui's `announcements.ts` endpoint/type file now round-trips correctly against these snake_case wire names (image_url, markdown_content, action_url, created_at, updated_at) for create/read/update/delete.
- Confirm both `PATCH /announcements/:id` and `PUT /announcements/:id` work identically and both require a valid JWT (requests without a bearer token should now 401, where they previously succeeded unauthenticated).
- Confirm creating an announcement without `action_url` succeeds (previously required).
- The pre-existing lint errors in `announcements.service.ts` (`'error' is defined but never used`, lines ~71/88) were not touched — out of scope for Fix 2, flagged here in case the Tester/Reviewer wants a follow-up ticket.

---

## Coder round 2 — addressing reviewer B1/B2 (`.pipeline/review.md`)

### B1 fix: entity renamed only at the controller boundary, not on the shared entity

`src/announcements/entities/announcement.entity.ts`
- Reverted all `@Expose({ name: 'snake_case' })` decorators added in the previous round. The entity is back to plain TypeORM columns with camelCase property names, exactly as before Fix 2.
- Also made `actionUrl` optional (`actionUrl?: string`) to match its `nullable: true` column (trivial follow-up on N5 while touching this line).

`src/announcements/dto/announcement-response.dto.ts` (new file)
- New `AnnouncementResponseDto` class-transformer DTO, modeled directly on `src/contributions/dto/contribution-response.dto.ts` (`@Expose({name:'snake_case'})` + `@Transform` per field for `image_url`, `markdown_content`, `action_url`, `created_at`, `updated_at`; `id`/`title`/`subtitle` unchanged).
- Unlike `ContributionResponseDto`, this transform is applied **only in the controller**, not in `AnnouncementsService`. Reason: `HomeService.getHomeContent()` calls `AnnouncementsService.findAll()` directly and embeds the raw result in `/api/home`'s `sections[].items`; if the service itself returned the renamed DTO, `/home` would leak snake_case again. (This mirrors a pre-existing, out-of-scope issue where `ContributionsService.findAll()` already leaks `bank_name`/`branch_number`/etc. into `/home`'s contribution section today — not touched, not part of this fix's scope, flagged here as a known follow-up.)

`src/announcements/announcements.controller.ts`
- `AnnouncementsService` (and thus `Announcement` entity) is unchanged — `create`/`findAll`/`findOne`/`update`/`remove` still operate on/return the plain entity.
- Removed the class-level `@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })` (no longer needed — the entity has no `@Expose` decorators to trigger, and the response DTOs are transformed explicitly).
- `findAll`, `findOne`, `update`, `replace` now call `plainToInstance(AnnouncementResponseDto, entity, { excludeExtraneousValues: true })` before returning, so only these four announcements endpoints emit snake_case keys. `create` and `remove` are unchanged (still `Promise<void>`).
- `AuthGuard('jwt')` guard registration untouched from round 1.

Verified `/api/home`'s announcements section is unaffected: wrote and ran a throwaway test instantiating an `Announcement` via `plainToInstance` and serializing it the same way `HomeController`'s `exposeAll`/`excludeExtraneousValues:false` config would, confirming output keys are `imageUrl`/`actionUrl` (camelCase), not `image_url`/`action_url`. (Test was not committed — it duplicated existing `home.service.spec.ts`/`home.controller.spec.ts` coverage scope and was only needed to empirically re-confirm the regression is gone; those pre-existing home spec files still fail on this branch for unrelated reasons, see Verification below.)

### B2 fix: real test coverage

`src/announcements/announcements.controller.spec.ts`
- Added: `AnnouncementResponseDto` directly serializes an entity-shaped object to snake_case keys (`image_url`, `markdown_content`, `action_url`, `created_at`, `updated_at`).
- Added: `findOne()` and `findAll()` controller methods serialize their (mocked-service) results to the same snake_case shape end-to-end.
- Added: `CreateAnnouncementDto` built from a snake_case payload without `action_url` passes `class-validator`'s `validate()` with zero errors (create succeeds without `action_url`).
- Added: a `Reflect.getMetadata(GUARDS_METADATA, AnnouncementsController)` assertion confirming exactly one guard (`AuthGuard('jwt')`) is registered at the class level, guarding against silent guard removal.
- Kept the existing `replace()`/`update()` delegation test from round 1.

## Verification (round 2)
- `npx eslint` on all changed announcements files: clean.
- `npx tsc --noEmit`: no errors in announcements files. (One pre-existing unrelated error remains in `src/member-journey/member-journey.service.spec.ts`, confirmed via `git status` that file is untouched by this change.)
- `npx jest announcements`: 2 suites, 8 tests, all passing.
- `npx jest home`: both `home.service.spec.ts` and `home.controller.spec.ts` fail with the same `RootTestModule`/DI resolution error on this branch. Confirmed via `git stash` that this failure is **pre-existing** and identical before this round's changes — not a regression introduced here.

## Known follow-ups (not fixed this round, per instructions — non-blocking N1-N7)
- N1 — `POST /announcements` return type (`Promise<void>`) vs admin-ui's `api.post<Announcement>(...)` expectation: still a mismatch.
- N2 — `is_active` field exists in admin-ui types but not on the backend entity/DTOs (silently dropped by the global pipe).
- N3 — `PUT :id` is really PATCH semantics (`Object.assign` partial merge in the service); method name `replace()` is misleading.
- N4 — controller spec still reaches into `controller['announcementsService']` via index access instead of `module.get(AnnouncementsService)`.
- N5 — partially addressed as a trivial side-effect: `Announcement.actionUrl` is now `actionUrl?: string` (previously `string`), matching its `nullable: true` column and the optional DTO.
- N6 — `.pipeline/*.md` docs remain committed in this backend repo/worktree; not moved out per this round's instructions.
- N7 — pre-existing: `AnnouncementsService.update`/`findOne` swallow all errors as 404, and two unused `error` bindings fail lint in `announcements.service.ts` (~L71/L88) — untouched, out of scope.
- New (spotted this round, not fixed): `ContributionsService.findAll()`/`findOne()`/`update()` already return `ContributionResponseDto` (snake_case) and `HomeService` embeds that directly into `/api/home`'s `contribution` section — the same class of bug B1 flagged for announcements, but pre-existing and out of this fix's scope. Worth a follow-up ticket if the mobile app's contribution home section also expects camelCase.

## What the Tester should focus on
- Confirm `GET /api/home` still returns camelCase keys for the `announcements` section items (`imageUrl`, `actionUrl`, no `image_url`/`action_url`) — this is the core regression fixed this round.
- Confirm `GET /announcements`, `GET /announcements/:id`, `PATCH /announcements/:id`, `PUT /announcements/:id` all return snake_case keys (`image_url`, `markdown_content`, `action_url`, `created_at`, `updated_at`).
- Confirm `POST /announcements` still succeeds without `action_url` in the body.
- Confirm all `/announcements` routes still 401 without a bearer token.
- The `home.service.spec.ts`/`home.controller.spec.ts` pre-existing DI failures are unrelated to this fix — flagged for a separate ticket, not to be conflated with this round's changes.
