# Feature: Mobile App

## Purpose

Member-facing mobile experience for account, journey, forms, notifications, ministries, academy, and life group flows.

## Current mobile workstreams

- `mobile-app/`: Flutter app.
- `kmp-mobile/`: Kotlin Multiplatform mobile app workstream.

Before editing mobile code, identify which mobile app the task targets.

## Design system summary

KMP mobile design tokens historically include:

- Primary blue `#043A6F`.
- Secondary blue `#6784AE`.
- Light/dark surface/background palettes.
- Reusable components such as PazButton, PazCard, PazTopBar, PazBottomNavBar, PazMenuRow, PazAvatar, PazTextField, and PazEmptyState.

Keep platform implementations visually aligned unless intentionally redesigning.

## Navigation integrations

- Notification deep links must map to mobile routes.
- Form notifications route to Formulários.
- Member journey reminders route to Minha Jornada.
- Entity-specific routes require IDs in notification payloads.

## Agent notes

- Do not assume Flutter and KMP share implementation details.
- Read the target submodule files before proposing mobile changes.
- Keep auth refresh behavior consistent with backend contract.
