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
