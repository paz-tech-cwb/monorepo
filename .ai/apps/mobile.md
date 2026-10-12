# App: Mobile

## Workstreams

| Path | Stack | Notes |
|---|---|---|
| `kmp-mobile/` | Kotlin Multiplatform, Android/iOS | Member-facing mobile app |

## Responsibilities

- Member authentication and token refresh.
- Member journey, forms, notifications, ministries, academy, life group UX.
- Push notification tap/deep-link handling.

## Life group tasks

Shared domain/repository in `kmp-mobile/shared` (`LifeGroupTaskRepository`),
Android screens in `ui/features/lifegrouptasks/`, iOS in
`ios/PazChurch/Features/LifeGroupTasks/` (pbxproj hand-edited; iOS build/bridging not verified here).
Deep link `paz://tarefa/{assignmentId}`. See `features/mobile-app.md`.

## Agent rules

- Read kmp-mobile's local docs/build files before proposing changes.
- Keep mobile routes aligned with notification categories and deep links.

## Validation

KMP:

Read kmp-mobile's docs/build files first, then run the smallest relevant Gradle/Xcode checks.

Home "Minhas tarefas" card: Android `HomeViewModel.getMyTasks` (pure `selectUpcomingTasks`, reuses `MyTasksCard`) and iOS `HomeViewModel.upcomingTasks` + `LifeGroupMyTasksCard`.

iOS tests: there is NO unit-test target (`project.yml` scheme has `testTargets: []`, and the pbxproj has a single application target). One was deliberately not added: the app target links `Shared.xcframework` (built by a Gradle prebuild script), xcodegen is not installed here so project.yml and the hand-maintained pbxproj/scheme could not be regenerated or compiled to verify, and a wrong hand edit would break the checked-in scheme CI builds with. The logic is kept test-friendly instead: `LifeGroupTaskMarkdown` (SwiftUI-free), `DeepLinkDestination.from(parsedRoute:)` and `HomeViewModel.upcomingTasks` are non-private statics. To add a target later: add `PazChurchTests` (bundle.unit-test, sources `PazChurchTests`) to project.yml, run `xcodegen generate`, and list it in the scheme `testTargets`.
