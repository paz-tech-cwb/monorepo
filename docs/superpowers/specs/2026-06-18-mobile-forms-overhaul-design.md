# Mobile Forms Overhaul (KMP) — Design Spec

**Date:** 2026-06-18
**Status:** Approved for planning
**Scope:** Align the KMP mobile dynamic forms with the backend contract (which admin-ui already implements fully), introduce new field types (selects, people/LG pickers), and make several broken forms correct.

## Problem

The KMP mobile forms are rendered by a hand-maintained `FormFieldDef` engine duplicated across iOS (`ios/PazChurch/Features/Formularios/FormDetailView.swift`) and Android (`android/.../formularios/FormDetailScreen.kt`). The current field set is drastically simpler than — and in places contradicts — the backend DTOs and the admin-ui forms. Concretely:

- **Service report**: `Tipo de relatório` and `Período` are free-text fields with placeholder hints (`tadel / culto_celebracao / evento`). The keyboard autocorrects user input, producing invalid values. They are enums in admin-ui.
- **Guest (`Convidado`)**: `Convidado por` is free text; the "Veio de uma Casa de Paz?" toggle renders with a phantom empty field below it (misaligned). Missing backend fields (`how_met_church`, `address`). Submitting does not create a person record.
- **Multiplication**: mobile sends only `new_life_group_name` + `date`. Backend requires ~18 fields (members to move, new members, host, new leader, address, phone, meeting time, leadership-track booleans).
- **Member registration**: mobile sends `name/phone/email`. Backend rejects this shape — it requires `birth_date`, `gender`, `civil_state`, `sector_id` and has no `email` column on that endpoint.
- **Conversion**: mobile sends `name/phone/date/observations`. The `form-conversions` endpoint requires `email`, `decision_type` (first_time/reconciliation), `gender`, `birth_date`, `civil_state`, `address`, etc.
- **Sector & Area supervisor reports**: both reuse the generic life-group-report field set and submit `life_group_id = current user id`. This is wrong — they are two distinct backend shapes with array fields (life groups visited, leaders pastored, etc.). This is the "duplication" reported.

## Goals

1. Replace free-text enum fields with proper **select pickers**.
2. Add **searchable people pickers** (single + multi) and a **life-group picker**, backed by new backend search endpoints.
3. Add a **self-or-search** control for "Convidado por" (pick "Eu mesmo" or search a person).
4. Make the **Guest** form create a real `User` row and capture `email` + the other backend fields.
5. **Mirror admin-ui exactly** for member-registration and conversion/reconciliation.
6. Split **sector** and **area** supervisor reports into their correct, distinct shapes.
7. Keep iOS and Android visually and behaviorally consistent (parallel edits to both engines).

## Non-goals

- No redesign of the form catalog/navigation or the date picker (already good).
- No offline/draft support.
- No changes to admin-ui (it is the reference implementation).

## Reference: canonical field sets (from admin-ui + backend DTOs)

### Service report (`service-reports`)
- `date` (date, required) — already first.
- `report_type` (**select**, required): `tadel` → "Tadel", `culto_celebracao` → "Culto de celebração", `evento` → "Evento".
- `period` (**select**, required): `manha` → "Manhã", `tarde_noite` → "Tarde/Noite".
- Remaining integer/notes fields unchanged.

### Guest (`form-guests`)
- `date` (date, required) — **moved to first**.
- `full_name` (name, required).
- `email` (email, required — needed to create the User). **New backend column.**
- `phone` (phone).
- `invited_by` (**self-or-search**): "Eu mesmo" fills current user; or search a person → stores their name string.
- `via_casa_de_paz` (toggle) — fix alignment (label + switch on one row, no phantom field).
- `how_met_church` (text).
- `address` (text).
- Optional area/sector/life_group ids retained as backend-optional (not surfaced unless needed).
- **Submission side effect:** backend creates a `User` row for the guest (see Phase 0).

### Multiplication (`multiplications`)
- `date` (date, required).
- `source_life_group_id` (**life-group picker**, required).
- `area`, `sector` (text or select — match admin-ui's area/sector selection).
- `new_life_group_name` (text, required).
- `new_leader_id` (**user picker**, required).
- `host_id` (**user picker**, required).
- `leader_phone` (phone, required).
- `meeting_day_time` (text, required).
- `address` (text, required).
- `members_to_move` (**user multi-picker** → `number[]`).
- `new_members` (**user multi-picker** → `number[]`).
- Leadership-track booleans (toggles): `completed_leadership_track`, `legally_married`, `faithful_tither`, `evangelizing_and_consolidating`, `good_testimony`, `single_living_in_purity`.

### Member registration (`member-registrations`) — mirror admin-ui
- `full_name` (name, required), `email` (email, required), `birth_date` (date, required), `phone` (phone, required), `gender` (**select** m/f, required), `civil_state` (**select**, required), `sector_id` (**select/picker**, required), `life_group_id` (**LG picker**, optional), `leader_id` (optional), address block (`cep`, `street`, `address_number`, `complement`, `neighborhood`, `city`, `state`) optional.

### Conversion (`form-conversions`) — mirror admin-ui
- `full_name` (required), `email` (email), `phone` (required), `decision_type` (**select**: `first_time` "Primeira vez" / `reconciliation` "Reconciliação", required), `how_met_church` (required), `gender` (**select**, required), `birth_date` (date, required), `civil_state` (**select**, required), `address` (required), `attendance_count` (text, required), `life_group_status` (text, required), `life_group_leader_or_name` (optional), `invited_by` (optional), `notes` (optional).

### Sector supervisor report (`sector-supervisor-reports`)
- `date`, `sector_id` (picker), optional `area_id`, `life_groups_visited` (LG multi-picker), `leaders_pastored` (user multi-picker), `multiplication_candidates` (user multi-picker), `life_groups_count` (int), `life_groups_supervised` (int), `life_group_observations` (string list), `sector_multiplication_date` (optional), `notes`.

### Area supervisor report (`area-supervisor-reports`)
- `date`, `area_id` (picker), `sectors_visited` (multi), `sector_leaders_pastored` (user multi-picker), `multiplications_in_progress` (int), `life_groups_count` (int), `life_groups_supervised` (int), `life_group_observations` (string list), `notes`.

## Architecture

### Phase 0 — Backend
1. **Search endpoints** (paged, `?q=` matching name/phone/email):
   - `GET /users?q=&page=` — returns `{ id, name, ... }`.
   - `GET /life-groups?q=` — name match (extend existing `findAll`).
   - Keep response `snake_case`.
2. **Guest → User + email**:
   - Add nullable `email` column to `form_guests` (migration) **and** accept `email` in `CreateFormGuestDto`.
   - On guest create, create a `User` row (member). Decide linkage: store the created `user_id` on the guest record. Idempotency: if a user with that email/phone already exists, link instead of duplicating (use existing `GET /users/lookup?email=&phone=`).
   - This is the only behavioral backend change beyond search.

### Phase 1 — Shared field-type infrastructure
Extend the `FormFieldDef` model on both platforms (kept in sync; the definitions live in `FormDetailView.swift` / `FormDetailScreen.kt`):

- New `FormFieldType` cases: `select`, `userPicker`, `userMultiPicker`, `lifeGroupPicker`, `selfOrSearch`.
- `FormFieldDef` gains:
  - `options: [(value, label)]` for `select`.
  - `source` enum (`users` / `lifeGroups`) for pickers.
- The form ViewModel stores picker selections as id strings (single) or comma-joined ids / list (multi); `selfOrSearch` stores the chosen name string + an internal mode flag.
- New repository calls in `:shared` (`FormsRepository` / impl): `searchUsers(query)`, `searchLifeGroups(query)`, consumed by the picker UI. Pickers fetch on query change (debounced), render results in a sheet/bottom-sheet, support single and multi selection.
- iOS picker UI: a presented sheet with a search field + list (`@Observable` view model, `.task`/debounce). Android: a `ModalBottomSheet` + `StateFlow` query. Both use design tokens (`PazColors`), no raw hex.

### Phase 2 — Form-by-form alignment
Update `FormType.fieldDefs` and the submission mapping in both engines and the `Form.kt` payloads:
- Add missing fields to the `@Serializable` submission data classes in `shared/.../domain/model/Form.kt` with `@SerialName` snake_case.
- Rewrite `sector_supervisor_report` and `area_supervisor_report` to their own payloads (new data classes), removing the `LifeGroupReportForm` reuse and the `life_group_id = userId` hack.
- Move the guest/service `date` field to first position.
- Fix the toggle row layout so label and switch sit on one row (no empty placeholder field rendered for `toggle`/`selfOrSearch`).

## Data flow

1. Form opens → ViewModel loads catalog item + current user (existing) and prefetches nothing; pickers lazy-load on open.
2. User edits fields; selects fill ids/labels; selfOrSearch sets name.
3. On submit → ViewModel validates required fields → maps `fields` dict into the typed payload → repository → backend.
4. Guest submit additionally triggers backend User creation; response surfaces success/dismiss as today.

## Error handling

- Required-field validation reuses the existing `canSubmit` / first-missing-label logic; extended to treat empty pickers (`""`) and empty multi-pickers as missing when required.
- Picker fetch errors show inline in the picker sheet; do not block the rest of the form.
- Backend validation errors (e.g., invalid enum, duplicate user) surface in the existing error banner.

## Testing

- `:shared` unit tests: payload mapping for each form (field dict → DTO), including multi-picker id arrays and the supervisor-report split.
- ViewModel validation tests (Android `FormDetailViewModelTest`, iOS equivalent): required select/picker enforcement.
- Backend: guest-create-makes-user test (new user vs link-existing), search endpoint tests.
- Manual: each form on iOS + Android, light/dark, loading/error/empty per CODING_GUIDELINES.

## Phasing / sequencing

1. **Phase 0** Backend: search endpoints + guest→user + email migration.
2. **Phase 1** Shared field-type infra + picker UI on both platforms (no form behavior change yet, infra landed + unit-tested).
3. **Phase 2a** Service report selects + guest reorder/selfOrSearch/email/how_met/address.
4. **Phase 2b** Multiplication full field set.
5. **Phase 2c** Member registration + conversion (mirror admin-ui).
6. **Phase 2d** Split sector/area supervisor reports.

Each phase is independently reviewable and shippable.

## Open questions

- None blocking. Area/sector representation in multiplication (text vs select) to match admin-ui's exact control during implementation.
