# Changes: admin-ui Fixes 1, 3, 4 (fix/api-contract-mismatches)

Scope: admin-ui repo only, Fix 1, Fix 3, Fix 4 from `.pipeline/spec.md`. Fix 2 (announcements,
backend-only) and Fix 5 (already correct on develop) are not part of this work.

Three commits, one per fix, in this order:

## Commit 1 — Fix 4: auth logout missing refresh_token
- `lib/api/endpoints/auth.ts`: `logout()` now imports `getRefreshToken` from `../client` and
  posts `{ refresh_token: getRefreshToken() }` as the request body, matching the backend's
  required `LogoutDto.refresh_token`.
- Verified `contexts/auth-context.tsx:212-224` — the `logout()` callback already wraps
  `authApi.logout()` in try/catch and unconditionally proceeds with Firebase sign-out, local
  state clearing, and token clearing afterward. No change needed there, including in the case
  `getRefreshToken()` returns `null` and the call 400s.

**Tester focus:** log out with a valid session (should call `/auth/logout` with a real
refresh_token and succeed), and confirm local state still clears if that call fails for any
reason (e.g. simulate a network error).

## Commit 2 — Fix 3: conversions address fields + life_group_experience enum
- `lib/api/types/conversions.ts`: replaced `address?: string` with `street?: string`,
  `neighborhood?: string`, `city?: string` on `Conversion` and `CreateConversionRequest` (no
  `UpdateConversionRequest` exists in this file). Changed `LifeGroupExperience` from
  `"sim" | "nao" | "ja_convidado"` to `"sim" | "nao" | "ja_foi_convidado"`.
- `app/(dashboard)/conversions/new/conversion-form.tsx`:
  - The form already used the shared `AddressForm` component (`components/ui/address-form.tsx`,
    which exposes separate street/neighborhood/city/etc. fields) but was flattening its output
    into a single `address` string via `addressFormDataToLine`. Removed that flattening; the
    zod schema and `setValue` calls in `handleAddressChange` now write directly to `street`,
    `neighborhood`, `city` fields matching the new type.
  - Fixed the `RadioGroupItem` value for the "já foi convidado" option from `ja_convidado` to
    `ja_foi_convidado`, and updated the zod enum accordingly.
- `lib/hooks/use-conversions.ts` needed no change — it passes the payload through unmodified,
  it doesn't shape it.
- Confirmed no other files reference the removed `address` field or the old enum value (grepped
  the whole repo).

**Tester focus:** submit the conversion form with an address (CEP lookup or manual entry) and
confirm street/neighborhood/city land correctly in the request body; select "Já foi convidado"
and confirm the correct enum value is sent.

## Commit 3 — Fix 1: member user create/update payload shape + legacy roles
- `lib/api/types/users.ts`:
  - Added `email: string` (required) to `MemberUser` and `CreateMemberUserRequest`, and
    `email?: string` to `UpdateMemberUserRequest`.
  - Removed the legacy `"supervisor"` / `"lg-leader"` values from `UserRole` (grepped the whole
    repo first — they were referenced nowhere else, only declared in this type).
- `app/(dashboard)/members/new/member-registration-form.tsx`: added a required email field
  (zod `.email()` validation, input + label) following the existing `full_name`/`birthday_date`
  pattern. No member-edit form exists elsewhere under `app/(dashboard)/members/` to update.
- `lib/hooks/use-users.ts` — this is where the two-step create/update-then-assign flow lives,
  so the form component doesn't need to know about it:
  - Added `toCreateUserRequest`/`toUpdateUserRequest` helpers that map the member form's field
    names to the backend's actual `CreateUserDto`/`UpdateUserDto` shape: `full_name`->`name`,
    `birthday_date`->`birth_date`, `cellphone`->`phone`, `email` passthrough, `sector_id`
    passthrough, `role: "member"` on create. `address` (free-text string) and `leader_name`
    (UI-only field) are intentionally omitted — the backend expects a structured address object
    and doesn't accept leader_name at all. `completed_courses` has no form field so it's simply
    not set (already optional on the backend).
  - `useCreateMemberUser`/`useUpdateMemberUser` now call `usersApi.create`/`usersApi.update`
    (the generic user endpoints, which already send the backend-shaped payload) instead of the
    removed `usersApi.createMember`/`updateMember`, then loop over `data.life_group_ids` and
    call `lifeGroupsApi.addMember(lifeGroupId, userId)` for each one (via the existing
    `addMember`/`removeMember` endpoints in `lib/api/endpoints/life-groups.ts`).
- `lib/api/endpoints/users.ts`: removed `createMember`/`updateMember`, which posted the
  frontend-shaped `CreateMemberUserRequest`/`UpdateMemberUserRequest` bodies directly to
  `/users` — nothing calls them anymore now that `use-users.ts` owns the mapping.
- `CLAUDE.md`: updated the documented `UserRole` type list at the bottom to match (removed
  `supervisor`/`lg-leader`, added the real backend role slugs already present in the type).

**Tester focus:** this is the highest-risk fix.
- Create a new member via the registration form (with sector + at least one life group
  selected) and confirm: the `/users` POST body has `name`/`email`/`phone`/`birth_date`/
  `role: "member"`/`sector_id` and no `address`/`leader_name`/`life_group_ids`; and confirm a
  follow-up call is made to add the new user to each selected life group.
- Confirm email validation triggers on the form (empty/invalid email).
- Confirm no remaining code references `"supervisor"` or `"lg-leader"` role values (role
  selects/filters/badges) — grep found none outside the type file, but worth a visual check of
  role select/badge components in the members and users areas.
- There is no member-edit UI currently, so `useUpdateMemberUser`/`toUpdateUserRequest` logic is
  currently unexercised by any page — it's implemented for type-contract correctness and future
  use, not covered by an existing UI flow.

## Verification run for all three fixes
- `npm install --legacy-peer-deps` (peer conflict is pre-existing/unrelated — `vaul` vs React 19).
- `npx tsc --noEmit` — clean for all changed files after each commit. Baseline pre-existing
  errors remain in unrelated files (`app/(dashboard)/formularios/_components/audit-log.tsx`,
  `app/(dashboard)/member-journey/member-journey-management.tsx`,
  `components/ui/date-picker-input.tsx`, `lib/api/endpoints/agenda.ts`) — untouched by this work,
  present before these changes.
- `npx eslint` on all changed files — clean.

---

# Round 2: Fix 1 blocking items from review (B1-B4)

Addresses `.pipeline/review.md` blocking findings against the Fix 1 commit. Fix 3 and Fix 4 were
approved as-is and are untouched. New commit(s) on top of the existing three, nothing amended.

## B1 — member address was silently discarded
- `lib/api/types/users.ts`: `CreateMemberUserRequest.address` / `UpdateMemberUserRequest.address`
  / `MemberUser.address` changed from the dead `string` type to `UserAddressRequest` (structured,
  same shape as `CreateUserRequest.address`).
- `app/(dashboard)/members/new/member-registration-form.tsx`:
  - Removed the dead `address: z.string().optional()` field from the zod schema (it was written
    to via `addressFormDataToLine` but never read).
  - Added `buildAddressRequest()`, which converts the `AddressFormData` the `AddressForm`
    component already collects into a `UserAddressRequest`, all-or-nothing: if every required
    field (zip_code/country/state/city/neighborhood/street) is filled, it's sent as a structured
    object; if none are filled, `address` is omitted; if it's partially filled, submission is
    blocked with an inline error (`addressError` state, passed to `AddressForm`'s `error` prop)
    and a toast, instead of sending a payload that would 400 against the backend's
    `CreateAddressDto` validation.
  - `onSubmit` now passes the resolved `address` through to `createMutation.mutateAsync`.
- `lib/hooks/use-users.ts`: `toCreateUserRequest`/`toUpdateUserRequest` now forward
  `data.address` straight through to `CreateUserRequest.address`/`UpdateUserRequest.address`
  (both already typed as `UserAddressRequest`, matching the backend `CreateAddressDto` field
  names exactly).

## B2 — completed_courses was discarded, plus a type mismatch
- Confirmed against the backend (`backend/src/courses/entities/course.entity.ts`): `Course.id` is
  a Postgres UUID (`@PrimaryGeneratedColumn('uuid')`), not a numeric ID, and
  `CreateUserDto.completedCourses` is `string[]` of those UUIDs
  (`manager.findByIds(Course, dto.completedCourses)` in `UsersService.create`). The admin-ui
  `Course` type (`lib/api/types/courses.ts`) already has `id: string` — the member registration
  form was calling `parseInt(course.id)` on a UUID, which is a pre-existing bug that would never
  have produced a valid course reference even if wired through. The sibling
  `formularios/member-registrations` form already treats course IDs as `string[]` correctly,
  confirming this is the right shape.
- Fix: changed `selectedCourses` state from `number[]` to `string[]`, dropped the `parseInt(...)`
  calls in the checkbox `checked`/`onCheckedChange` handlers (use `course.id` directly), and
  changed the zod schema's `completed_courses` field to `z.array(z.string()).optional()`.
- `lib/api/types/users.ts`: `CreateUserRequest.completed_courses` / `UpdateUserRequest.completed_courses`
  / `CreateMemberUserRequest.completed_courses` / `UpdateMemberUserRequest.completed_courses`
  changed from `number[]` to `string[]`.
- `lib/hooks/use-users.ts`: `toCreateUserRequest`/`toUpdateUserRequest` now forward
  `data.completed_courses` through unchanged (both already string arrays end-to-end now).

## B3 — orphaned-user trap on partial failure
Checked `app/(dashboard)/members/` and `app/(dashboard)/life-groups/` first: there is no
member-edit UI and no other place in admin-ui that lets an admin retroactively assign a life
group to an existing user, so the cleanest fix available within this repo is option (a) from the
review — don't let a life-group-assignment failure fail the whole mutation.

- `lib/hooks/use-users.ts`:
  - Added `assignLifeGroups(userId, lifeGroupIds)`, which calls `lifeGroupsApi.addMember` per
    group and catches/returns the first failure as an `Error` instead of throwing.
  - `useCreateMemberUser`/`useUpdateMemberUser` mutation functions now always resolve once the
    user create/update call itself succeeds; they return `MemberMutationResult` (`{ user,
    lifeGroupError }`) instead of throwing when only the life-group step fails. A failure in
    `usersApi.create`/`usersApi.update` itself still rejects the mutation as before.
- `app/(dashboard)/members/new/member-registration-form.tsx`: `onSubmit` reads
  `lifeGroupError` off the resolved result. On success with no life-group error, shows the
  existing "Usuario cadastrado com sucesso!" toast. On success with a life-group error, shows
  `toast.warning("Membro criado, mas houve um erro ao vincula-lo ao Life Group. Tente vincular
  manualmente.")`. Either way the form still navigates to `/members` — the user record is never
  left stranded behind a form that can no longer be resubmitted (duplicate email would now block
  a retry), since creation itself already succeeded.

Note: this closes the immediate trap but a follow-up member-edit UI (or a backend endpoint that
accepts `life_group_ids` on `CreateUserDto` for a single transactional call) is still worth a
follow-up ticket — there's currently no in-product way to complete the manual life-group linkup
the toast asks for. Flagging for the user/PM, not building it here since it's out of this fix's
scope.

## B4 — swallowed API errors
- `app/(dashboard)/members/new/member-registration-form.tsx`: `onSubmit`'s catch block now
  imports and checks `ApiError` (`lib/api/client.ts`) instead of a bare `catch {}`. For any 4xx
  status, it reads `err.data.message` (the backend's JSON error body) and shows that if present;
  otherwise falls back to a message that explicitly calls out the most likely cause given current
  backend behavior ("... o e-mail pode ja estar em uso ..."). Non-`ApiError` failures (network
  errors, etc.) keep the original generic message.
- Verified against the backend (`backend/src/users/users.service.ts:162-167`): `create()` wraps
  everything in a try/catch that collapses to a single generic `BadRequestException('An error
  occurred while creating the user.')` for both validation and DB constraint failures (including
  a duplicate-email unique-constraint violation) — there is no distinct status code or error
  shape to branch on for "duplicate email" specifically. That's a backend-side limitation, not an
  admin-ui bug; a follow-up on the backend branch to throw a distinguishable `ConflictException`
  for duplicate email would let this message get more specific, but is out of scope for this
  admin-ui-only fix.

## Verification
- `npx tsc --noEmit` — no new errors from any changed file. Same four pre-existing baseline
  errors as before (`audit-log.tsx`, `member-journey-management.tsx`, `date-picker-input.tsx`,
  `lib/api/endpoints/agenda.ts`), all unrelated to this change and present before this work.
- `npx eslint` on all three changed files (`lib/hooks/use-users.ts`, `lib/api/types/users.ts`,
  `app/(dashboard)/members/new/member-registration-form.tsx`) — clean, no warnings or errors.

**Tester focus for round 2:**
- Fill the member form with a full address (via CEP lookup or manually) and confirm the `/users`
  POST body's `address` object has all six required fields plus `number`/`complement`.
- Fill in only some address fields (e.g. just CEP) and try to submit — should block with an
  inline error instead of sending a partial address or silently dropping it. Leave the whole
  address section blank — should submit fine with no `address` key.
- Check one or more courses, submit, and confirm `completed_courses` in the request body is an
  array of the course UUID strings (not numbers, not `NaN`).
- Simulate a life-group `addMember` failure (e.g. stop the backend right after user creation, or
  point at an invalid life group id) and confirm: the user is still created, the form shows the
  "Membro criado, mas houve um erro..." warning toast (not the generic failure toast), and the
  form still navigates to `/members` instead of getting stuck.
- Try creating a member with an email that already exists and confirm the error toast reflects
  the backend's actual error text (or the duplicate-email-aware fallback) instead of the blanket
  "Tente novamente" message.
