# Tester Results

Status: PASS WITH MANUAL VERIFICATION PENDING

Date: 2026-07-15

## Summary

The review-blocking UI issues were addressed and the out-of-scope backend Jest/package-lock normalization was reverted. Focused backend tests, backend build, and admin UI build pass with the scoped feature diff.

Manual browser/database verification has not been run in this environment.

## Commands and Results

### Focused UsersService spec

Command:

```bash
cd backend && npx jest src/users/users.service.spec.ts --runInBand
```

Result: PASS

```text
PASS src/users/users.service.spec.ts
  UsersService
    ✓ creates a user with a structured address and links the saved address (2 ms)
    ✓ creates a user without an address
    ✓ uses the transaction for address and user saves so failed user creation rolls back the address (10 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### CreateUserDto validation spec

Command:

```bash
cd backend && npx jest src/users/dto/create-user.dto.spec.ts --runInBand
```

Result: PASS

```text
PASS src/users/dto/create-user.dto.spec.ts
  CreateUserDto
    ✓ accepts a user payload with a structured address (3 ms)
    ✓ keeps address optional for the separate user creation flow
    ✓ accepts an unformatted 8 digit zip code (1 ms)
    ✓ rejects invalid zip codes and whitespace-only required address fields

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

### Backend build

Command:

```bash
cd backend && npm run build
```

Result: PASS

```text
> backend@0.0.1 build
> nest build
```

### Admin UI build

Command:

```bash
cd admin-ui && npm run build
```

Result: PASS

```text
> my-v0-project@0.1.0 build
> next build

✓ Compiled successfully
Skipping validation of types
Skipping linting
✓ Generating static pages (31/31)
```

## Fix Verification Notes

- `AddressForm` now renders an editable country field only in `required` mode, preserving the existing optional Events/Church Data presentation.
- Required member address validation now includes `country`, and the create-member payload sends the trimmed `createAddress.country` instead of hard-coding `Brasil`.
- CEP changes increment the request sequence, clear loading/error/resolved state, and prevent stale in-flight ViaCEP responses from applying to a changed CEP.
- Address form inline errors have a stable id, `role="alert"`, `aria-live="polite"`, and affected inputs use `aria-describedby`/`aria-invalid`.
- Label/input spacing in the address form uses `space-y-1.5` for a consistent gap.
- `backend/package.json` and `backend/package-lock.json` are reverted; no Jest dependency normalization remains in the feature diff.

## Manual Verification

Not run here. Remaining checklist for a browser-connected environment:

- Membros > Adicionar Membro has no WIP badge.
- Invalid-length CEP does not call ViaCEP and blocks submission.
- Failed/not-found lookup preserves typed CEP and blocks submission.
- ViaCEP with empty street/neighborhood still reveals editable fields.
- Changing CEP while a lookup is in flight cannot apply the stale response.
- Country, number, and complement are required.
- Submit sends one request with `phone` plus structured `address`.
- Close/reopen resets address state.
- Separate Usuarios creation still submits without an address.
- Successful creation persists a linked address row.
