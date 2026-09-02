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
