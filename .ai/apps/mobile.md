# App: Mobile

## Workstreams

| Path | Stack | Notes |
|---|---|---|
| `mobile-app/` | Flutter, Dart, GetX | Existing/member-facing app where present |
| `kmp-mobile/` | Kotlin Multiplatform, Android/iOS | Newer cross-platform workstream |

## Responsibilities

- Member authentication and token refresh.
- Member journey, forms, notifications, ministries, academy, life group UX.
- Push notification tap/deep-link handling.

## Agent rules

- Confirm which mobile app the task targets before editing.
- Do not apply Flutter patterns to KMP files or KMP patterns to Flutter files without checking local code.
- Keep mobile routes aligned with notification categories and deep links.

## Validation

Flutter:

```bash
cd mobile-app
flutter analyze
flutter test
```

KMP:

Read the submodule docs/build files first, then run the smallest relevant Gradle/Xcode checks.
