# Naming + Meeting-Form Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Replace the literal user-facing "Grupo de Vida" / "grupo de vida" strings with "Life Group" in admin-ui + KMP (Flutter untouched, "Célula" left alone), and (2) move the "Relatar Reunião" meeting-report entry out of the KMP Account screen and into the Formulários list on both iOS and Android.

**Architecture:** Pure string + navigation/placement changes. No backend, shared-layer, API, or data-model changes. Each KMP submodule (`kmp-mobile`) is committed inside its own repo.

**Tech Stack:** Next.js/React/TS (admin-ui) · SwiftUI (KMP iOS) · Jetpack Compose/Kotlin (KMP Android).

**Spec:** `docs/superpowers/specs/2026-06-11-naming-and-meeting-form-cleanup-design.md`

> KMP commits are made from inside `kmp-mobile/`. The admin-ui change is committed from inside `admin-ui/`. Run `./gradlew :android:assembleDebug` / `xcodebuild` only if a device/toolchain is available; otherwise rely on `ktlintFormat` + targeted compile and visual review.

---

## Part 1 — "Grupo de Vida" → "Life Group"

### Task 1: admin-ui strings

**Files:**
- Modify: `admin-ui/app/(dashboard)/life-groups/life-groups-management.tsx:372,760`

- [ ] **Step 1: Replace the description string (line 372)**

Change:
```tsx
        <p className="text-muted-foreground">Gerencie os grupos de vida da igreja</p>
```
to:
```tsx
        <p className="text-muted-foreground">Gerencie os Life Groups da igreja</p>
```

- [ ] **Step 2: Replace the delete-dialog fallback (line 760)**

Change:
```tsx
        entityName={deletingGroup?.name ?? "este grupo de vida"}
```
to:
```tsx
        entityName={deletingGroup?.name ?? "este Life Group"}
```

- [ ] **Step 3: Verify**

Run: `cd admin-ui && npm run lint`
Expected: no new errors. Also confirm no remaining literal: `grep -rin "grupo de vida" "app/(dashboard)/life-groups/life-groups-management.tsx"` returns nothing.

- [ ] **Step 4: Commit (from admin-ui repo)**

```bash
cd admin-ui
git add "app/(dashboard)/life-groups/life-groups-management.tsx"
git commit -m "chore(admin): use 'Life Group' instead of 'grupo de vida'"
cd ..
```

---

### Task 2: KMP iOS strings

**Files:**
- Modify: `kmp-mobile/ios/PazChurch/Features/Ministries/MinistriesView.swift:66`
- Modify: `kmp-mobile/ios/PazChurch/Features/Notifications/NotificationPrefsView.swift:32-33`

- [ ] **Step 1: Ministries empty state (line 66)**

Change:
```swift
            emptyState("Nenhum grupo de vida encontrado")
```
to:
```swift
            emptyState("Nenhum Life Group encontrado")
```

- [ ] **Step 2: NotificationPrefs toggle (lines 32-33)**

Change:
```swift
                        title: "Notificações do Grupo de Vida",
                        description: "Atualizações do seu grupo de vida",
```
to:
```swift
                        title: "Notificações do Life Group",
                        description: "Atualizações do seu Life Group",
```

- [ ] **Step 3: Verify no remaining literal**

Run: `cd kmp-mobile && grep -rin "grupo de vida" ios/PazChurch`
Expected: no matches.

- [ ] **Step 4: Commit (defer to Task 5's shared KMP commit, or commit now)**

```bash
cd kmp-mobile
git add ios/PazChurch/Features/Ministries/MinistriesView.swift ios/PazChurch/Features/Notifications/NotificationPrefsView.swift
git commit -m "chore(ios): use 'Life Group' instead of 'grupo de vida'"
cd ..
```

---

### Task 3: KMP Android strings

**Files:**
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/ministries/MinistriesScreen.kt:164`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/ministries/MinistryDetailScreen.kt:152`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/notifications/NotificationPrefsScreen.kt:130-131`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/notifications/PazFirebaseMessagingService.kt:99`

- [ ] **Step 1: Ministries empty state (MinistriesScreen.kt:164)**

Change `EmptyState(message = "Nenhum grupo de vida encontrado")` to `EmptyState(message = "Nenhum Life Group encontrado")`.

- [ ] **Step 2: Ministry detail fallback title (MinistryDetailScreen.kt:152)**

Change `title = uiState.lifeGroup?.name ?: "Grupo de Vida",` to `title = uiState.lifeGroup?.name ?: "Life Group",`.

- [ ] **Step 3: NotificationPrefs toggle (NotificationPrefsScreen.kt:130-131)**

Change:
```kotlin
                        title = "Notificações do Grupo de Vida",
                        description = "Atualizações do seu grupo de vida",
```
to:
```kotlin
                        title = "Notificações do Life Group",
                        description = "Atualizações do seu Life Group",
```

- [ ] **Step 4: FCM channel display name (PazFirebaseMessagingService.kt:99)**

Change `"paz_life_group" to "Grupo de Vida",` to `"paz_life_group" to "Life Group",`.
(The channel **id** `paz_life_group` is unchanged — only its display label, so no channel migration is needed.)

- [ ] **Step 5: Format + verify**

Run: `cd kmp-mobile && ./gradlew ktlintFormat`
Then: `grep -rin "grupo de vida" android/src` → expect no matches.

- [ ] **Step 6: Commit**

```bash
cd kmp-mobile
git add android/src/main/kotlin/br/church/paz/android/ui/features/ministries/MinistriesScreen.kt android/src/main/kotlin/br/church/paz/android/ui/features/ministries/MinistryDetailScreen.kt android/src/main/kotlin/br/church/paz/android/ui/features/notifications/NotificationPrefsScreen.kt android/src/main/kotlin/br/church/paz/android/notifications/PazFirebaseMessagingService.kt
git commit -m "chore(android): use 'Life Group' instead of 'Grupo de Vida'"
cd ..
```

---

## Part 2 — Move "Relatar Reunião" into the Formulários list

### Task 4: iOS — move meeting-report entry into FormulariosView

**Files:**
- Modify: `kmp-mobile/ios/PazChurch/Features/Formularios/FormulariosView.swift`
- Modify: `kmp-mobile/ios/PazChurch/Features/Account/AccountView.swift`

- [ ] **Step 1: Give FormulariosView the auth repository (needed to build MeetingReportView)**

In `FormulariosView.swift`, change the stored deps + init:

```swift
struct FormulariosView: View {
    @State private var viewModel: FormulariosViewModel
    private let authRepository: AuthRepository

    init(formsRepository: FormsRepository, authRepository: AuthRepository) {
        _viewModel = State(initialValue: FormulariosViewModel(formsRepository: formsRepository))
        self.authRepository = authRepository
    }
```

- [ ] **Step 2: Add a fixed "Relatar Reunião" card at the top of the forms list**

In `FormulariosView.swift`, change `contentState` so the meeting-report entry renders before the dynamic list:

```swift
    private var contentState: some View {
        ScrollView {
            VStack(spacing: 10) {
                Spacer().frame(height: 8)
                NavigationLink(destination: MeetingReportView(
                    formsRepository: IosAppContainer.shared.formsRepository,
                    authRepository: authRepository
                )) {
                    meetingReportCard
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 20)
                ForEach(viewModel.forms, id: \.id) { form in
                    NavigationLink(destination: FormDetailView(form: form)) {
                        FormCard(form: form)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                }
                Spacer().frame(height: 32)
            }
            .padding(.top, 8)
        }
        .background(PazColors.background)
    }

    private var meetingReportCard: some View {
        HStack(spacing: 12) {
            PazIconContainer(icon: "doc.text.fill", tint: Color(hex: "2E7D32"), size: 42)
            VStack(alignment: .leading, spacing: 2) {
                Text("Relatar Reunião").font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
                Text("Envie o relatório da sua reunião")
                    .font(PazTypography.bodySmall).foregroundStyle(PazColors.slate).lineLimit(1)
            }
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(PazColors.slateLight)
        }
        .padding(14)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
```

> Note: the meeting-report card must also be reachable when the dynamic catalog is empty. If `viewModel.forms.isEmpty`, `screenContent` currently shows `emptyState`. Change `screenContent` so the empty branch still shows the meeting-report entry: replace `else if viewModel.forms.isEmpty { emptyState }` so the empty list still renders `contentState` (the `ForEach` over an empty array simply renders nothing below the meeting-report card). Concretely, delete the `else if viewModel.forms.isEmpty { emptyState }` branch and let `contentState` handle the empty case; keep `loadingState` for `isLoading`.

- [ ] **Step 3: Update FormulariosView previews to pass authRepository**

At the bottom of `FormulariosView.swift`, update both previews:

```swift
#Preview("Light") {
    FormulariosView(
        formsRepository: IosAppContainer.shared.formsRepository,
        authRepository: IosAppContainer.shared.authRepository
    )
}

#Preview("Dark") {
    FormulariosView(
        formsRepository: IosAppContainer.shared.formsRepository,
        authRepository: IosAppContainer.shared.authRepository
    )
    .preferredColorScheme(.dark)
}
```

- [ ] **Step 4: Remove the standalone meeting-report row from AccountView and update the Formulários link**

In `AccountView.swift`, inside the "MINHA IGREJA" `menuCard`, delete the meeting-report `NavigationLink` block and its trailing `rowDivider` (the block linking to `MeetingReportView`, lines ~61-68):

```swift
                        rowDivider
                        NavigationLink(destination: MeetingReportView(
                            formsRepository: IosAppContainer.shared.formsRepository,
                            authRepository: IosAppContainer.shared.authRepository
                        )) {
                            AccountRow(title: "Relatar Reunião", icon: "doc.text", tint: Color(hex: "2E7D32"))
                        }
                        .buttonStyle(.plain)
```

And update the Formulários `NavigationLink` to pass `authRepository`:

```swift
                        NavigationLink(destination: FormulariosView(
                            formsRepository: IosAppContainer.shared.formsRepository,
                            authRepository: IosAppContainer.shared.authRepository
                        )) {
                            AccountRow(title: "Formulários", icon: "list.clipboard", tint: Color(hex: "6A1B9A"))
                        }
                        .buttonStyle(.plain)
```

- [ ] **Step 5: Verify (visual / compile)**

Build the iOS app (if toolchain available): `cd kmp-mobile && ./gradlew :shared:assembleSharedXCFramework` then build in Xcode, or run `swiftformat ios/PazChurch && swiftlint --fix --path ios/PazChurch`.
Confirm: Account → "Relatar Reunião" row is gone; Account → Formulários now shows "Relatar Reunião" as the first card.

- [ ] **Step 6: Commit**

```bash
cd kmp-mobile
git add ios/PazChurch/Features/Formularios/FormulariosView.swift ios/PazChurch/Features/Account/AccountView.swift
git commit -m "refactor(ios): move 'Relatar Reunião' into Formulários list"
cd ..
```

---

### Task 5: Android — move meeting-report entry into FormulariosScreen

**Files:**
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormulariosScreen.kt`
- Modify: `kmp-mobile/android/src/main/kotlin/br/church/paz/android/ui/features/account/AccountScreen.kt`

- [ ] **Step 1: Add a meeting-report navigation handler in FormulariosScreen**

In `FormulariosScreen.kt`, the `FormulariosScreen` composable already has `navController`. Add an `onMeetingReport` lambda and pass it into `ContentState`. Update the `else ->` branch:

```kotlin
                else -> ContentState(
                    forms = uiState.forms,
                    onFormTap = viewModel::onFormTap,
                    onMeetingReport = { navController.navigate(Screen.MeetingReport.route) },
                )
```

- [ ] **Step 2: Render a fixed meeting-report card at the top of ContentState**

Change `ContentState` to accept the new lambda and render a static card first:

```kotlin
@Composable
private fun ContentState(
    forms: List<FormCatalogItem>,
    onFormTap: (String) -> Unit,
    onMeetingReport: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        item { MeetingReportCard(onClick = onMeetingReport) }
        items(forms) { form ->
            FormCard(form = form, onClick = { onFormTap(form.id) })
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun MeetingReportCard(onClick: () -> Unit) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onClick)
                .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        PazIconContainer(icon = Icons.AutoMirrored.Outlined.Assignment, tint = Color(0xFF2E7D32), size = 42.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("Relatar Reunião", style = MaterialTheme.typography.titleSmall)
            Text(
                "Envie o relatório da sua reunião",
                style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)),
                maxLines = 1,
            )
        }
        Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurface.copy(.3f), modifier = Modifier.size(18.dp))
    }
}
```

> `PazIconContainer`'s `icon` parameter: confirm whether it accepts an `ImageVector` (as used by `FormCard` via `formIcon`) — it does, since `FormCard` passes `formIcon(...)` which returns `ImageVector`. So passing `Icons.AutoMirrored.Outlined.Assignment` is correct.

- [ ] **Step 3: Ensure the empty state still surfaces the meeting-report card**

In `FormulariosScreen`, change the `when` so an empty catalog still renders `ContentState` (the `items(forms)` over an empty list renders nothing under the card):

```kotlin
            when {
                uiState.isLoading -> LoadingState()
                uiState.error != null -> ErrorState(error = uiState.error!!, onRetry = viewModel::onRetry)
                else -> ContentState(
                    forms = uiState.forms,
                    onFormTap = viewModel::onFormTap,
                    onMeetingReport = { navController.navigate(Screen.MeetingReport.route) },
                )
            }
```

(Delete the `uiState.forms.isEmpty() -> EmptyState()` branch; the now-unused `EmptyState` composable may be removed or left — if ktlint flags it as unused, delete it.)

- [ ] **Step 4: Remove the standalone meeting-report row from AccountScreen**

In `AccountScreen.kt`, inside the `if (user.role.isLeader) { ... }` block (lines ~180-193), delete the `PazMenuRow` for "Relatar Reunião":

```kotlin
                                PazMenuRow(
                                    title = "Relatar Reunião",
                                    icon = Icons.AutoMirrored.Outlined.Assignment,
                                    iconTint = Color(0xFF2E7D32),
                                    onClick = viewModel::onMeetingReport,
                                )
```

Leave the "Formulários" `PazMenuRow` in place (it remains leader-gated, and now hosts the meeting-report entry inside it).

> Leave `viewModel.onMeetingReport` and the `AccountEffect.NavigateToMeetingReport` handler in place if they're referenced elsewhere; if ktlint/compiler reports them as unused after this removal, delete the now-dead `onMeetingReport` method, the `NavigateToMeetingReport` effect, and its handler at `AccountScreen.kt:80`.

- [ ] **Step 5: Format + verify**

Run: `cd kmp-mobile && ./gradlew ktlintFormat && ./gradlew :android:assembleDebug` (assembleDebug only if the SDK is configured).
Confirm: Account no longer shows "Relatar Reunião"; Formulários shows it as the first card and it navigates to the meeting-report screen.

- [ ] **Step 6: Commit**

```bash
cd kmp-mobile
git add android/src/main/kotlin/br/church/paz/android/ui/features/formularios/FormulariosScreen.kt android/src/main/kotlin/br/church/paz/android/ui/features/account/AccountScreen.kt
git commit -m "refactor(android): move 'Relatar Reunião' into Formulários list"
cd ..
```

---

### Task 6: Record submodule pointers in the monorepo

**Files:**
- Modify: root repo submodule pointers (`admin-ui`, `kmp-mobile`)

- [ ] **Step 1: Stage updated submodule pointers**

After committing inside `admin-ui/` and `kmp-mobile/`, from the repo root:

```bash
cd /Users/jonathalima/Developer/church
git add admin-ui kmp-mobile
git commit -m "chore: update submodule pointers — Life Group naming + meeting-form move"
```

- [ ] **Step 2: Verify**

Run: `git status` and `git submodule status`
Expected: clean working tree; submodule SHAs point at the new commits.

---

## Final verification

- [ ] admin-ui: `cd admin-ui && npm run lint` passes; no "grupo de vida" literals remain in `app/(dashboard)/life-groups/`.
- [ ] KMP: `cd kmp-mobile && grep -rin "grupo de vida" ios/PazChurch android/src` returns nothing.
- [ ] iOS + Android: meeting-report entry appears only inside Formulários, not on the Account screen.
- [ ] Flutter (`mobile-app/`) is untouched (`git status` in that submodule is clean).
