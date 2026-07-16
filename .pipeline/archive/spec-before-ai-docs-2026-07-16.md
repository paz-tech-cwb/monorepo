# New Member Address Handoff

## Scope

Fix only the **Membros > Adicionar Membro** drawer. Replace its free-text address with the existing CEP-first flow, persist the structured address through `POST /api/users`, correct the current phone request key, and remove the visible WIP marker from this member form. Do not require an address for the separate **Usuários** creation flow.

## Files

### Modify

- `admin-ui/app/(dashboard)/members/members-management.tsx`
  - Import and render `AddressForm`/`AddressFormData` in the add-member drawer.
  - Keep create-address state separate from the existing edit-member state so this request does not expand the edit flow.
  - Remove the `WipOverlay` import and wrapper around the role selector in this form; keep the selector itself.
  - Send `phone`, not `phone_number`, because that is the current `/api/users` DTO contract.
  - Validate before mutation: CEP has 8 digits and `street`, `neighborhood`, `city`, `state`, `country`, `number`, and `complement` are non-blank. Keep the drawer open and show an inline error when invalid.
  - Reset address values/errors on successful creation, cancel/close, and reopening.
- `admin-ui/components/ui/address-form.tsx`
  - Preserve the existing lookup through `fetchAddressByCEP` and formatting through `formatCEP`.
  - Extend `AddressFormProps` with optional `required?: boolean` and `error?: string | null`; defaults must preserve current Events and Church Data behavior.
  - In required mode, mark CEP/full-address inputs as required and render the supplied error.
  - Reveal editable full-address fields after a successful CEP lookup even when ViaCEP returns an empty street or neighborhood, so the user can complete missing data manually.
- `admin-ui/lib/api/types/users.ts`
  - Add `UserAddressRequest` with `zip_code`, `country`, `state`, `city`, `neighborhood`, `street`, `number`, and `complement`, all strings.
  - Change `CreateUserRequest` to `phone?: string` and `address?: UserAddressRequest`.
  - Change `UpdateUserRequest` to `phone?: string` only to match the existing backend contract; do not add structured-address editing in this feature.
- `backend/src/addresses/dto/create-address.dto.ts`
  - Define `CreateAddressDto` for the structured wire fields above. All inner fields are required, non-empty strings; `zip_code` must accept exactly 8 digits with an optional hyphen.
- `backend/src/addresses/entities/address.entity.ts`
  - Add `number`, `complement`, and `neighborhood` properties. Map request `zip_code` to the existing entity property/database column `zipCode` in the service, not via a transport rename layer.
  - New columns must remain nullable at database/entity level for legacy address rows, while new structured requests are enforced by the DTO.
- `backend/src/users/dto/create-user.dto.ts`
  - Add optional nested `address?: CreateAddressDto`, exposed as `address`, transformed with `Type(() => CreateAddressDto)`, and recursively validated.
  - Keep it optional so `admin-ui/app/(dashboard)/users/users-management.tsx` can still create users without addresses.
- `backend/src/users/users.service.ts`
  - Keep public signature `create(dto: CreateUserDto)`.
  - When `dto.address` exists, create an `Address`, map `zip_code` to `zipCode`, persist it, and assign it to `user.address` before saving the user.
  - Save address and user atomically so a failed user creation cannot leave an orphan address. Preserve existing role, sector, course, status, and membership-date behavior.
- `backend/src/users/users.service.spec.ts`
  - Cover creation with a structured address, mapping/persisting every field and linking it to the user.
  - Cover creation without an address to protect the separate Users page.
  - Cover atomic failure/no orphan address behavior.

### Create

- `backend/database/migrations/1784073600000-AddUserAddressDetails.ts`
  - `up`: add nullable `number` (varchar 30), `complement` (varchar 120), and `neighborhood` (varchar 120) columns to `addresses`, using `IF NOT EXISTS`.
  - `down`: drop those columns in reverse order using `IF EXISTS`.

## Required interfaces and payload

- `AddressFormProps`: existing props plus `required?: boolean` and `error?: string | null`.
- `UserAddressRequest`: `{ zip_code; country; state; city; neighborhood; street; number; complement }` as strings.
- Add-member request: `{ name, email, phone?, birth_date?, role, address: UserAddressRequest }` using snake_case only at the API boundary.
- `CreateUserDto.address?: CreateAddressDto`; address is optional globally, but the member drawer must always submit a valid one.

## Behavior and edge cases

- CEP is the first address field. Lookup runs on blur using the existing ViaCEP helper; do not add another CEP endpoint/helper.
- Invalid-length CEP does not call ViaCEP and blocks submission.
- Not-found/network lookup errors remain visible, preserve the typed CEP for correction/retry, and block submission.
- A successful lookup autofills state, city, neighborhood, street, and country; all remain editable.
- Changing CEP clears stale resolved address, number, complement, lookup error, and validation error.
- ViaCEP may omit street/neighborhood; show the fields and require manual completion.
- Number is a string (allow values such as `S/N`); both number and complement must reject whitespace-only values.
- Prevent duplicate submissions while the create mutation is pending; preserve the existing success/error toasts.
- Do not alter the reusable component's current Events/Church Data behavior or the member edit-address flow.

## Existing patterns to follow

- CEP lookup and progressive address fields: `admin-ui/components/ui/address-form.tsx` and `admin-ui/lib/utils/cep.ts`.
- `AddressForm` integration/state shape: `admin-ui/app/(dashboard)/events/events-management.tsx`.
- Snake-case request types and thin API layer: `admin-ui/CLAUDE.md` and `admin-ui/lib/api/types/agenda.ts`.
- Nested DTO transformation: `backend/src/notifications/dto/create-notification.dto.ts`; add recursive validation required for address fields.
- EntityManager service tests: `backend/src/notifications/notifications.service.spec.ts`.
- Reversible migration style: `backend/database/migrations/1781872007000-AddGuestEmailAndDate.ts`.

## Verification

- `cd backend && npx jest src/users/users.service.spec.ts --runInBand`
- `cd backend && npm run build`
- `cd admin-ui && npm run build`
- Manual: from the Membros side menu, open Adicionar Membro; confirm no WIP badge, invalid CEP/error handling, successful autofill, required number/complement, successful creation, and a persisted linked address row.
