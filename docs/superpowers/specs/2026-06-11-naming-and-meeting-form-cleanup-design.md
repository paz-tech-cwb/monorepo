# Naming + Meeting-Form Cleanup — Design

**Date:** 2026-06-11
**Status:** Approved
**Scope:** Admin UI (Next.js) · KMP (iOS + Android). **Flutter untouched.**

Two small, independent changes bundled together. They do not depend on the automatic-reminders work and can ship separately.

---

## 1. "Grupo de Vida" → "Life Group" (literal display strings only)

Replace only the literal "Grupo de Vida" / "grupo de vida" user-facing strings.
**Leave "Célula" and "Líder de Célula" untouched** (per decision).

### admin-ui
- `app/(dashboard)/life-groups/life-groups-management.tsx:372` — "...grupos de vida da igreja"
- `app/(dashboard)/life-groups/life-groups-management.tsx:760` — fallback entityName "este grupo de vida"

### KMP — iOS
- `ios/PazChurch/Features/Ministries/MinistriesView.swift:66` — empty state
- `ios/PazChurch/Features/Notifications/NotificationPrefsView.swift:32-33` — title + description

### KMP — Android
- `android/.../ui/features/ministries/MinistriesScreen.kt:164` — empty state
- `android/.../ui/features/ministries/MinistryDetailScreen.kt:152` — fallback title
- `android/.../ui/features/notifications/NotificationPrefsScreen.kt:130-131` — title + description
- `android/.../notifications/PazFirebaseMessagingService.kt:99` — `"paz_life_group" to "Grupo de Vida"` channel display name

**Note:** changing the FCM channel display name updates the user-visible channel label only; the channel `id` (`paz_life_group`) stays the same, so no channel recreation/migration is needed.

No identifiers, routes, API fields, or `life_group`/`lifeGroup` code symbols change — strings only.

---

## 2. Move "Relatar Reunião" into the Formulários list (KMP)

Today the meeting-report form (`MeetingReportView`) is a standalone row in the Account screen under "MINHA IGREJA", separate from the "Formulários" list — inconsistent placement.

### iOS
- `ios/PazChurch/Features/Account/AccountView.swift` — remove the standalone `NavigationLink(destination: MeetingReportView(...))` row (lines ~61-67) and its trailing `rowDivider`.
- `ios/PazChurch/Features/Formularios/FormulariosView.swift` — add a "Relatar Reunião" entry that navigates to `MeetingReportView`, so meeting reports live with the other forms.

### Android
- `android/.../ui/features/account/AccountScreen.kt` — remove the equivalent standalone meeting-report row.
- The Android Formulários screen — add the "Relatar Reunião" entry navigating to the meeting-report destination.

No backend or shared-layer changes; this is pure navigation/placement.

---

## 3. Out of scope

- Flutter app (explicitly excluded).
- Renaming "Célula" / "Líder de Célula".
- Any data model, API, or route changes.
