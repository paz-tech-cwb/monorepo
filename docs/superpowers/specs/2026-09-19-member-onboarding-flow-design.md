# Member Onboarding Flow — Design

Date: 2026-09-19
Branch: `feature/onboarding-flow` (worktree at `.worktrees/onboarding-flow`, based on `origin/develop`)

## Problem

Today, first sign-in via Apple/Google only asks for a bare birthdate (`BirthDateRequiredException` → `BirthDateDialog`) when the backend can't match an existing pre-created member record (`auth.service.ts`). There's no welcome moment, and we don't collect WhatsApp number or address at all during sign-up.

## Goal

Replace the bare birthdate dialog with a step-by-step onboarding flow for **every** first sign-in (new or existing account), covering:

1. Welcome video
2. Birthday
3. WhatsApp number
4. Address (via CEP lookup, with manual fallback)

Each step explains *why* the data is needed. Steps are skippable ("ask me later"); onboarding resumes based on which fields are actually missing on the user's profile — no separate completion flag.

## Non-goals

- No changes to the leader-driven `member-registrations` / `OnboardingService` module (visitor/member registration forms) — that's a separate system and stays untouched.
- No distinct `whatsappNumber` column — WhatsApp reuses the existing `User.phoneNumber` field.
- No schema change to `Address` — existing entity (`zipCode`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`) already covers what's needed.

## Trigger & resumability

On successful sign-in (existing `AuthRepositoryImpl` flow), the app checks the current `User` profile:
- `birthDate` missing → show birthday step
- `phoneNumber` missing → show WhatsApp step
- `address` missing → show address step

If any are missing, onboarding launches starting from the welcome video, then walks only the missing steps in order (video → birthday → WhatsApp → address). If a user skips a step, it's simply left missing and re-prompted on next app launch — no local-only "seen onboarding" flag, since state must survive reinstall/device change and reflect admin-entered data.

## Steps

### 1. Welcome video
- Full-screen video player.
- Source: remote-hosted URL (CDN/S3), not bundled — allows swapping the video without an app release. URL can be a simple config value for now (hardcoded or remote config — confirm during planning).
- Not skippable; auto-advances to step 2 when playback completes.

### 2. Birthday
- Same interaction as today's `BirthDateDialog`, but presented as a step within the flow.
- Copy: short explanation of why (matching existing pre-created member records; age-relevant ministries/groups).
- Skippable.

### 3. WhatsApp number
- Writes to the existing `User.phoneNumber` field. No backend schema change.
- Copy: why (church communication/contact).
- Skippable.

### 4. Address
- Step A: CEP input → call ViaCEP (`GET https://viacep.com.br/ws/{cep}/json/`).
  - Success: auto-fill street/neighborhood/city/state; user only fills `number` and `complement`.
  - Not found / API error: fall back to full manual entry (street, neighborhood, city, state, number, complement, CEP).
- Copy: why (outreach, pastoral visits, mailing).
- Skippable.
- Maps to existing `Address` entity fields.

## Architecture

**Backend** (`backend/`)
- No schema changes. Confirm during planning whether existing user-update endpoint(s) support partial updates of `birthDate` / `phoneNumber` / `address` from the mobile client, or whether a dedicated onboarding-update endpoint is cleaner. Keep validation consistent with admin-ui's existing user edit paths.

**kmp-mobile shared**
- New `OnboardingRepository` / use case:
  - Computes which steps are missing from the current `User`.
  - Wraps a ViaCEP client for the address step (success / not-found / network-error states).
- Shared `OnboardingViewModel` (`@Observable`, per project convention) holding a single state model across all 4 steps plus per-step loading/error states.

**Android (Compose) / iOS (SwiftUI)**
- Platform UI per step, sharing KMP state/view models.
- Follow existing design tokens (`PazColors`/`PazGradients`, no hardcoded hex) and native navigation patterns (`NavigationStack` on iOS, per existing conventions).
- System fonts only, per KMP coding standards.

## Error handling

- ViaCEP network failure or CEP not found → manual address entry, no hard blocker.
- Skipping a step never blocks progressing to the next step or entering the app — onboarding is advisory, not a gate.
- Video playback failure: TBD during planning (likely: log error, allow proceeding rather than stranding the user — confirm).

## Testing

- Unit tests: missing-field detection logic, ViaCEP client (success/not-found/error), onboarding state transitions.
- Platform: manual QA on Android + iOS for each step and the ViaCEP fallback path.

## Open questions (confirm during planning/implementation)

- Video URL source: hardcoded config vs. remote-configurable.
- Exact backend endpoint shape for partial profile updates from onboarding.
- Video playback failure handling.
