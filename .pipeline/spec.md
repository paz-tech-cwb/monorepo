# Spec: Fix admin-ui <-> backend API contract mismatches

## Context files used
- `.ai/README.md`, `.ai/project.md`, `.ai/architecture.md`, `.ai/conventions.md`, `.ai/commands.md`, `.ai/feature-map.md`
- `admin-ui/CLAUDE.md`, `backend/CLAUDE.md` (submodule-local conventions — snake_case-on-the-wire / camelCase-in-code rule, User entity dual-purpose rule)
- Verified directly against source in the two task worktrees (not from the stale audit alone):
  - `/Users/jonathalima/Developer/church-worktrees/admin-ui-fix-api-contracts`
  - `/Users/jonathalima/Developer/church-worktrees/backend-fix-api-contracts`

Note: the original audit ran against a different branch. Re-verifying against `develop` (current worktree base) found **fix #5 (member-journey life_group param) is already correct on develop** — `buildFeedUrl` already sends `life_group_id`, and `getFilterOptions()` already calls `/member-journey/filters`. No change needed for #5.

## Repo topology
Two separate repos need commits:
- **admin-ui** — worktree `/Users/jonathalima/Developer/church-worktrees/admin-ui-fix-api-contracts`, branch `fix/api-contract-mismatches` (cut from `develop`)
- **backend** — worktree `/Users/jonathalima/Developer/church-worktrees/backend-fix-api-contracts`, branch `fix/api-contract-mismatches` (cut from `develop`)

Do not touch `/Users/jonathalima/Developer/church/admin-ui` or `/Users/jonathalima/Developer/church/backend` directly — those checkouts have unrelated in-progress work on other branches.

---

## Fix 1 — users: createMember/updateMember payload shape (admin-ui only)

**Decision (user-confirmed): add an email field to the form.** `CreateMemberUserRequest`/`UpdateMemberUserRequest` (`admin-ui/lib/api/types/users.ts:102-122`) post `full_name/birthday_date/cellphone/address/sector_id/life_group_ids/leader_name` to `/users`, but backend `CreateUserDto` (`backend/src/users/dto/create-user.dto.ts`) requires `name` and `email` (both required, `@IsEmail()`), plus `phone`/`birth_date`/`sector_id`/`completed_courses`/`address` (nested `CreateAddressDto` object, not a string).

Implementation:
- Add a required `email` field to `member-registration-form.tsx` (zod schema + form input, matching the existing full_name/birthday_date field pattern) and to any member-edit form found under `app/(dashboard)/members/`.
- Add `email: string` to `CreateMemberUserRequest` (required) and `email?: string` to `UpdateMemberUserRequest`, and `email: string` to `MemberUser` (`admin-ui/lib/api/types/users.ts`).
- At the API boundary (`usersApi.createMember`/`updateMember` in `lib/api/endpoints/users.ts`, or in the mutation hooks in `lib/hooks/use-users.ts` — pick whichever already owns payload shaping), map the frontend member model to the backend's actual field names: `full_name` → `name`, `birthday_date` → `birth_date`, `cellphone` → `phone`, `address` (string) → omit or map into `CreateAddressDto` shape if the form's address string can be split (check `UserAddress`/`UserAddressRequest` types for the expected nested shape — if the form only has a single free-text address string today, do not attempt to split it into street/neighborhood/city automatically; leave `address` unset on create/update rather than sending malformed data, and flag this as a follow-up since `member-registration-form.tsx` doesn't currently collect structured address fields).
- `leader_name` and `life_group_ids` are not accepted by `CreateUserDto`/`UpdateUserDto` at all — confirm with `UsersService`/`UsersController` whether life group assignment happens via a separate call (e.g. life-groups membership endpoints audited in the `life-groups` domain, which already has `addMember`/`removeMember`). If so, `createMember` should call `usersApi.create` then separately call the life-group membership endpoint(s) for each `life_group_ids` entry; `leader_name` appears to be a UI-only display field (leader selection likely resolves to a `sector_id`/leader lookup already) — do not send it to the backend at all.
- `completed_courses` has no form field — send `undefined`/omit on create (backend field is optional).

Legacy role values: `UserRole` in `admin-ui/lib/api/types/users.ts:1-9` includes `"supervisor"` and `"lg-leader"`, not in backend `VALID_ROLE_SLUGS` (`admin, pastor, area_leader, sector_leader, life_group_leader, member`). Removing these is safe and independent of the open question above — do this regardless. Check for any remaining usages of these two values across admin-ui before removing (role selects, filters, badges) and migrate/remove them.

## Fix 2 — announcements (backend + admin-ui)

Backend (`backend/src/announcements/`):
- `Announcement` entity (`entities/announcement.entity.ts`) already has camelCase properties + snake_case `@Column({name})` DB mapping (correct per `backend/CLAUDE.md`). It's missing the **wire-layer** mapping: add `@Expose({ name: 'image_url' })`, `@Expose({ name: 'markdown_content' })`, `@Expose({ name: 'action_url' })` on `imageUrl`/`markdownContent`/`actionUrl` (title/subtitle/id/createdAt/updatedAt need the same treatment — check actual snake_case wire names expected by admin-ui `Announcement` type in `lib/api/types/announcements.ts` and mirror exactly, including `created_at`/`updated_at`).
- `CreateAnnouncementDto`/`UpdateAnnouncementDto` (`dto/create-announcement.dto.ts`, currently `PartialType` of it): same — add `@Expose({name: 'snake_case'})` per field so incoming snake_case bodies map to the camelCase DTO properties.
- Make `actionUrl` optional (`@IsOptional()`) in `CreateAnnouncementDto` to match admin-ui's optional `action_url`.
- Controller currently has `@Patch(':id')` only, no `@Put`. Add `@Put(':id')` calling the same update path (either add a second handler delegating to the same service call, or add `@Put(':id')` alongside `@Patch(':id')` both bound to `update()` — confirm NestJS allows two method decorators mapped to the same handler function, or add a thin second method).
- Add `@UseGuards(AuthGuard('jwt'))` at the controller level (import from `@nestjs/passport`, matching the pattern used in every other admin controller, e.g. `AreasController`).
- Verify `app.module.ts` / auth module wiring needs no changes (JwtStrategy is already global via `AuthGuard('jwt')` usage elsewhere — should be a drop-in decorator).

admin-ui: no changes required if the backend now accepts PUT and snake_case bodies/responses as-is — confirm `lib/api/endpoints/announcements.ts` and `lib/api/types/announcements.ts` field names line up with the snake_case keys chosen above.

## Fix 3 — conversions: address fields + enum value (admin-ui only)

- `admin-ui/lib/api/types/conversions.ts`: replace `address?: string` with `street?: string`, `neighborhood?: string`, `city?: string` on both `Conversion` and `CreateConversionRequest` (and `UpdateConversionRequest` if present).
- `admin-ui/lib/api/types/conversions.ts`: change `LifeGroupExperience` from `"sim" | "nao" | "ja_convidado"` to `"sim" | "nao" | "ja_foi_convidado"`.
- Update the form that builds this payload: `admin-ui/app/(dashboard)/conversions/new/conversion-form.tsx` (and `lib/hooks/use-conversions.ts` if it shapes the payload) — replace the single address input with street/neighborhood/city fields (check existing patterns for address fields elsewhere in admin-ui, e.g. `UserAddress`/`UserAddressRequest` in `lib/api/types/users.ts`, for a consistent multi-field address UI), and fix the enum value/label mapping for `life_group_experience`.
- Backend `CreateConversionDto` also exposes `culto_attendance` and `life_group_status` (mapped from `cultoAttendance`/`lifeGroupStatus`) that the frontend doesn't send/display at all — out of scope for this fix (not broken, just unused), do not add unless trivial.

## Fix 4 — auth: logout missing refresh_token (admin-ui only)

`admin-ui/lib/api/endpoints/auth.ts`: `logout: () => api.post<void>("/auth/logout")` sends no body. `getRefreshToken()` is already exported from `admin-ui/lib/api/client.ts`. Change to:
```ts
logout: () => api.post<void>("/auth/logout", { refresh_token: getRefreshToken() }),
```
Import `getRefreshToken` from `../client`. Confirm the backend `LogoutDto` field name is `refresh_token` (already verified as required/`@IsNotEmpty`). If `getRefreshToken()` returns `null` (already logged out / token cleared), the caller in `contexts/auth-context.tsx:214` should still proceed with local cleanup even if this call 400s — check that call site already handles a rejected promise gracefully (it's in a logout flow, should not block clearing local state).

## Fix 5 — member-journey: life_group_id query param

**Already correct on `develop` — no change needed.** Verified `buildFeedUrl` in `admin-ui/lib/api/endpoints/member-journey.ts` already sends `life_group_id`.

---

## Acceptance criteria
- Fix 2, 3, 4 implemented and independently reviewable (separate commits per fix).
- Fix 1: blocked pending OPEN QUESTIONS answer — do not guess a product decision.
- No unrelated files touched.
- Existing backend/admin-ui tests still pass; add/update unit tests colocated per each repo's convention (backend: `*.spec.ts` next to source; admin-ui: check existing test setup before adding new test tooling).
- `.ai/features/*.md` or `.ai/apps/*.md` updated in the same branch if these fixes change documented behavior (check `feature-map.md` for whether announcements/conversions/auth have existing feature docs to update).

## OPEN QUESTIONS

None remaining — fix #1's email gap was resolved by user decision (add email field to the form, see Fix 1 above). All 4 fixes (1, 2, 3, 4) are unblocked; fix 5 needs no work.
