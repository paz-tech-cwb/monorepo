# Coder Changes

## Files changed

- `admin-ui/app/(dashboard)/members/members-management.tsx`
  - Replaced the add-member drawer free-text address with the existing `AddressForm` CEP-first flow.
  - Added separate create-address state, validation, inline error handling, and reset behavior for add-member open/close/success.
  - Required address validation now includes country, and create-member sends the edited `country` value.
  - Changed add-member and edit-member user payloads to send `phone` instead of `phone_number`.
  - Removed the visible WIP overlay from the member role selector while keeping the selector.
  - Kept the edit-member address field as the existing free-text flow.

- `admin-ui/components/ui/address-form.tsx`
  - Exported and extended `AddressFormProps` with optional `required` and `error`.
  - Required mode marks CEP and full-address inputs as required and renders the supplied validation error.
  - Required mode now renders editable country while optional mode preserves the existing Events/Church Data presentation.
  - Successful CEP lookup now reveals full-address fields even when street/neighborhood are empty.
  - CEP changes invalidate in-flight lookups so stale ViaCEP responses cannot restore old address data.
  - Inline errors now use a stable alert id with `aria-describedby`/`aria-invalid` on affected controls.
  - Address fields now use consistent label/input spacing.
  - Existing default behavior remains optional for current Events and Church Data usage.

- `admin-ui/lib/api/types/users.ts`
  - Added `UserAddressRequest`.
  - Updated create/update user request types to use `phone`.
  - Made structured `address` optional on create requests and omitted structured address editing from updates.

- `backend/src/addresses/dto/create-address.dto.ts`
  - Added validation for structured address request fields.
  - `zip_code` accepts exactly 8 digits with optional hyphen.
  - Required string fields reject empty and whitespace-only values.

- `backend/src/addresses/entities/address.entity.ts`
  - Added nullable `number`, `complement`, and `neighborhood` columns for legacy row compatibility.

- `backend/src/users/dto/create-user.dto.ts`
  - Added optional nested `address?: CreateAddressDto` with transformation and recursive validation.

- `backend/src/users/entities/user.entity.ts`
  - Marked the nullable address relation as `Address | null`.

- `backend/src/users/users.service.ts`
  - Wrapped user creation in an EntityManager transaction.
  - Creates and persists an address when provided, maps `zip_code` to `zipCode`, and links it before saving the user.
  - Preserves the existing optional-address Users page flow.

- `backend/src/users/users.service.spec.ts`
  - Added coverage for structured address creation/linking, creation without address, and transaction use on failed user creation.

- `backend/database/migrations/1784073600000-AddUserAddressDetails.ts`
  - Added nullable `number`, `complement`, and `neighborhood` columns to `addresses` with reversible `IF EXISTS`/`IF NOT EXISTS` SQL.

## Verification notes

- Passed: `cd backend && npm run build`
- Passed: `cd backend && npx tsc --noEmit --pretty false --project tsconfig.json`
- Passed: `cd admin-ui && npm run build`
- Passed: `cd backend && npx jest src/users/users.service.spec.ts --runInBand`
- Passed: `cd backend && npx jest src/users/dto/create-user.dto.spec.ts --runInBand`
- Out-of-scope backend Jest dependency/package-lock changes were reverted; focused Jest specs now pass without that diff.
- Existing unrelated admin type-check failures remain in `formularios/_components/audit-log.tsx`, `components/ui/date-picker-input.tsx`, and `lib/api/endpoints/agenda.ts`.

## Tester focus

- Run the focused backend service spec after normalizing the Jest install.
- Manually verify Membros > Adicionar Membro: WIP marker removed, invalid CEP blocks submit, ViaCEP autofill works, blank number/complement block submit, and created users have a linked address row.
- Confirm the separate Usuarios creation flow still creates users without an address.
