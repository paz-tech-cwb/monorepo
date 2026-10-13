# Test results: Phase 3 shared + Android

Android SDK is not installed locally, so Gradle tasks of `:android` cannot run here. What was run:

| Check | Command / method | Result |
|---|---|---|
| Shared tests (iOS sim, all commonTest incl. new) | `./gradlew :shared:iosSimulatorArm64Test --offline` (JDK17, scratch GRADLE_USER_HOME/KONAN_DATA_DIR) | PASS |
| New shared tests | Rules 20, ReportDraft 5, Repository 9, DraftStorage 4, AuthRepository 10 | PASS |
| Android ViewModel tests (29 new) + all shared tests on JVM | scratch KMP/JVM project compiling `shared/commonMain` + the Android UiState/ViewModels, running the real test files (JUnit4, mockk, turbine) | PASS, 160 tests, 0 failures |
| Android Compose screens + Screen.kt + real components/theme | scratch Compose-Desktop (JetBrains Compose 1.7.3) project compiling the real screen files with stubs for `koinViewModel`/`LocalLifecycleOwner`/typography | COMPILES (API differences vs AndroidX BOM 2025.04 possible) |

NOT verified locally (CI or a device must confirm): `:android:compileDebugKotlin`, `:android:testDebugUnitTest` (incl. `MeetingDatesTest`, which needs `Screen`/`PushNotificationHelper` on the Android classpath), `DataStoreMeetingDraftStore` (androidMain actual), `PazNavGraph`/`AndroidModule`/`MinistryDetailScreen` edits (small, read-reviewed), real device behavior, ktlint (not enforced by CI).

## Phase 3 iOS

| Check | Command / method | Result |
|---|---|---|
| XCFramework | `./gradlew :shared:assembleSharedDebugXCFramework --offline` (JDK17, scratch GRADLE_USER_HOME/KONAN_DATA_DIR) | PASS |
| iOS unit tests | `xcodebuild test -scheme PazChurch -destination 'platform=iOS Simulator,name=TestPhone' -only-testing:PazChurchTests` (temporary fake `GoogleService-Info.plist`, deleted, not committed) | PASS, 64 tests (23 new in `LifeGroupMeetingViewModelTests`), 0 failures |
| pbxproj | `plutil -lint` | OK |
| swiftformat / swiftlint | new files formatted with swiftformat; swiftlint: no violations in the new files that are errors (2 pre-existing errors in `FormDetailView`/`OnboardingView`) | OK |

NOT verified: UI on a simulator/device (layout, DatePicker sheet, keyboard handling, VoiceOver, dark mode), a real push-tap on `paz://presenca/...`, Android compile (CI/SDK). CI does not run on this stacked PR (base is not main).
