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

## Life group home card and weekly reports

Shared: `LifeGroupReportRepository`, `LifeGroupWeeklyReport`, `buildHomeLifeGroupCards` (`:shared`, commonTest covered).
Android: `ui/features/home/` (group cards folding tasks, legacy tasks fallback), `ui/features/ministries/` (`canViewGroupReports`, "Relatórios semanais" row), `ui/features/lifegroupreports/` (list + read-only detail), analytics scoped mode. iOS: `Features/Home/` (`LifeGroupHomeCard`, `HomeViewModel.resolveLifeGroups`), `Features/Ministries/MinistryDetailView.swift` (`LifeGroupDetailView.canViewGroupReports`, "Relatórios semanais" row), `Features/LifeGroupReports/` (list + read-only detail), analytics scoped mode (`isScopedToGroup`). Android could not be compiled locally (no SDK); CI validates; iOS built and unit-tested locally. See `features/mobile-app.md`.

## Agent rules

- Read kmp-mobile's local docs/build files before proposing changes.
- Keep mobile routes aligned with notification categories and deep links.

## Validation

KMP:

Read kmp-mobile's docs/build files first, then run the smallest relevant Gradle/Xcode checks.

Home life group cards (tasks folded in): Android `HomeViewModel` (shared `buildHomeLifeGroupCards`, `MyTasksRows` reused from the detail screen; legacy `MyTasksCard` only as fallback) and iOS `HomeViewModel.resolveLifeGroups` (same shared builder) + `LifeGroupHomeCard` (header and task rows are sibling `NavigationLink`s; `LifeGroupTaskRows` reused from `LifeGroupMyTasksCard`, which remains the legacy fallback).

iOS tests: the `PazChurchTests` unit-test target (XCTest, hosted in the app, `bundle.unit-test` in `project.yml`, registered by hand in `project.pbxproj` because xcodegen is not installed; new source files under `PazChurch/` are picked up by `project.yml` automatically but must be added to the pbxproj manually, then `plutil -lint`). Covered: deep links, task markdown, `HomeViewModel` (task selection, `resolveLifeGroups` cards/fallback/discovery CTA, meeting label) and `LifeGroupReportsTests` (`canViewGroupReports` matrix, 403/404 mapping, formatting, view models via a fake `LifeGroupReportRepository`). Run: build the XCFramework (`./gradlew :shared:assembleSharedDebugXCFramework` in `kmp-mobile`), then `xcodebuild -project ios/PazChurch.xcodeproj -scheme PazChurch -destination 'platform=iOS Simulator,name=<sim>' CODE_SIGNING_ALLOWED=NO test`. The app host calls `FirebaseApp.configure()`, and `ios/PazChurch/GoogleService-Info.plist` is gitignored, so a fresh checkout needs a real (or syntactically valid fake, never committed) plist to build and run the tests.
