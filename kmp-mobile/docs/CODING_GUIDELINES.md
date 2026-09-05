# KMP Mobile — Coding Guidelines

> These rules apply to every change in this repo, for both Android (Compose) and iOS (SwiftUI).
> They override default tool behavior. When a skill and these guidelines conflict, the guidelines win.

---

## 1. Architecture

| Rule | Android | iOS |
|------|---------|-----|
| State layer | `UiState` data class + `UiEffect` sealed class, exposed as `StateFlow` / `Channel` | `@Observable` ViewModel `@MainActor`, properties are `var` not `@Published` |
| No business logic in UI | ViewModels call repository methods only | ViewModels call repository methods only |
| DI | Koin — `koinViewModel()` in Composables | Passed via `init` from `IosAppContainer.shared` |
| Shared code | All domain models & repositories live in `:shared` commonMain | Same — consumed as XCFramework |

---

## 2. Memory Safety

### iOS
- **Always use `@Observable`** — never `ObservableObject`/`@Published`. `ObservableObject` breaks with `@MainActor` and KMP bridging.
- **No `[weak self]` in `Task {}`** — Swift Concurrency captures are safe when the Task is stored and cancelled in `deinit` or `.task {}` modifier. Use `.task {}` on views instead of `onAppear` + manual Task management.
- **Cancel Tasks** — store `Task` handles and call `.cancel()` in ViewModel `deinit` if the Task is created imperatively.
- **Avoid retain cycles** — never store a reference to a View inside a ViewModel; never capture environment objects in closures that outlive the view.
- **`nonisolated(unsafe)` is forbidden** — use proper actor isolation instead.

### Android
- **`viewModelScope.launch`** — all coroutines must launch from `viewModelScope`, never from `GlobalScope`.
- **`StateFlow` over `LiveData`** — collect with `collectAsStateWithLifecycle()`, never `collectAsState()`.
- **No `Activity` or `Context` in ViewModels** — pass `Application` only if absolutely required (use `AndroidViewModel`).
- **Unsubscribe flows** — rely on `collectAsStateWithLifecycle` lifecycle awareness; never collect in `LaunchedEffect` without a lifecycle scope.

---

## 3. Typography

### iOS
Use **SF Pro** (system font) for all text. Do not add custom display fonts.

```swift
// ✅ Correct
Text("Hello").font(.system(size: 34, weight: .heavy, design: .default))
// or via PazTypography tokens:
Text("Hello").font(PazTypography.headlineMedium)  // → Font.system(size: 28, weight: .bold)
```

### Android
Use **DM Sans** (already bundled in `res/font/`) for all text, via `PazTypography` / `MaterialTheme.typography`. Do not introduce a second font family.

```kotlin
// ✅ Correct
Text("Hello", style = MaterialTheme.typography.headlineMedium)
```

---

## 4. Colors

- **Never hardcode hex values** in screen/component files.
- iOS: always use `PazColors.*` tokens. Only `PazColors.swift` may contain hex literals.
- Android: always use `PazColors.*` or `MaterialTheme.colorScheme.*`. Only `PazColors.kt` may contain `Color(0xFF…)` literals.

---

## 5. Screen States

Every screen must implement **all** of these states where applicable:

| State | Required |
|-------|---------|
| Loading (skeleton) | Always |
| Error + retry | Always |
| Empty | Always (if list/collection) |
| Logged-in content | When screen requires auth |
| Logged-out / visitor | When screen requires auth |
| Dark mode | Always (use adaptive tokens) |
| Light mode | Always (use adaptive tokens) |

Screen-specific states (from design handoff):
- **Academy**: `loggedIn=true/false`, `resume=true/false` (resume banner), `dense` (compact layout)
- **Event Detail**: `tab=geral/info`
- **Profile/Perfil**: `loggedIn=true/false`, `roleBadge=true/false`, `journey=true/false`, `role=lider/membro`
- **Home**: `give=true/false` (dízimos card), `agenda=true/false` (agenda section)

---

## 6. Code Formatting

### iOS — SwiftFormat + SwiftLint

Config lives at `ios/.swiftformat` and `ios/.swiftlint.yml`.

Run before every commit:
```bash
cd ios
swiftformat PazChurch --config .swiftformat
swiftlint lint --fix --config .swiftlint.yml
```

Or use the pre-commit hook (see below).

### Android — ktlint

ktlint is applied via the Gradle `ktlint` plugin. Run before every commit:
```bash
./gradlew ktlintFormat
./gradlew ktlintCheck
```

Add to `build-logic` or `android/build.gradle.kts` if not yet present (see Task 0 in the redesign plan).

---

## 7. API Versions

| Platform | Min | Target / Deployment |
|----------|-----|---------------------|
| iOS | 17.0 | **19.4** — use all modern APIs freely, no `@available` guards needed |
| Android | 26 (API 26) | 35 |

Use the latest SwiftUI/Compose APIs available at the target version. Avoid deprecated APIs.

---

## 8. Composable / View Size Discipline

- Keep individual `@Composable` functions and SwiftUI `View` bodies under **60 lines** (matches SwiftLint `function_body_length` warning).
- Extract sub-views into private structs/composables with clear single-responsibility names.
- Files should stay under **500 lines** (SwiftLint `file_length` warning).

---

## 9. Skills to Use

| Situation | Skill |
|-----------|-------|
| Writing/reviewing SwiftUI | `swiftui-expert-skill` |
| Swift Concurrency / async-await | `swift-concurrency` |
| Android Compose feature | `kotlin-project-feature-implementation` |
| Android code review | `kotlin-kmp-code-review` |
| Bug in either platform | `superpowers:systematic-debugging` |

---

## 10. Pre-commit Checklist

Before every commit on this repo:

- [ ] `swiftformat` + `swiftlint --fix` (iOS changes)
- [ ] `./gradlew ktlintFormat ktlintCheck` (Android changes)
- [ ] All new screens implement **all required states** (see §5)
- [ ] No hardcoded hex or font names outside theme files
- [ ] No `GlobalScope`, `LiveData`, or `ObservableObject`
- [ ] No `nonisolated(unsafe)` or force-unwrap (`!`) in new code (use `guard let` / `if let`)
