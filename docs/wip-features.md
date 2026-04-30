# WIP Features

Features currently using hardcoded/mocked data instead of the real API and database.
Each item links to the relevant source file.

## admin-ui

- [ ] **Notification channels, roles, categories** — `app/(dashboard)/notifications/notification-system.tsx`
  - `CHANNELS`, `ROLES`, `CATEGORIES` arrays are hardcoded; should be fetched from the API.

- [ ] **Member Journey stage messages** — `app/(dashboard)/members/journey-sheet.tsx` + `lib/api/types/member-journey.ts`
  - `JOURNEY_STAGES` and `STAGE_MESSAGES` are hardcoded client-side; should come from the API.

- [ ] **Conversion form dropdown options** — `app/(dashboard)/conversions/new/conversion-form.tsx`
  - Conversion type, how-they-heard, gender, civil status, visit count, LG invite options are hardcoded.
  - Leader field is a free-text input instead of an API-backed dropdown.

- [ ] **Role pickers (Users + Members)** — `app/(dashboard)/users/users-management.tsx`, `app/(dashboard)/members/members-management.tsx`
  - `ROLE_OPTIONS` is hardcoded in both files; should be fetched from the API.

- [ ] **Life Groups meeting days** — `app/(dashboard)/life-groups/life-groups-management.tsx`
  - `MEETING_DAYS` is hardcoded; should come from an API enum or config endpoint.

## mobile-app

- [ ] **Academy course detail** — `lib/features/academy/academy_page.dart`, `lib/features/academy/academy_controller.dart`
  - `onCourseTap()` shows a snackbar stub. Course detail screen not yet implemented.

- [ ] **Ministries error handling** — `lib/features/ministries/ministries_controller.dart`
  - `catch` block in `fetchPlaylistVideos()` is empty; API failures are silently swallowed.
