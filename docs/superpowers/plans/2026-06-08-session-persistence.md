# Session Persistence & Silent Re-Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix iOS/Android session persistence so users stay logged in across app restarts, extend refresh token TTL to 90 days, fix the iOS logout button, and add silent Firebase re-auth when the refresh token finally expires.

**Architecture:** The root iOS bug is a storage mismatch — KMP saves tokens to NSUserDefaults but `AuthenticationCoordinator` looks in the Keychain. Fix is two-pronged: migrate KMP iOS token storage to Keychain, and simplify `checkAuthState()` to use the shared `authRepository.currentUser()`. Android splash already has a `NavigateToLogin` effect — just wire the `SplashViewModel` to check the session first. Silent re-auth uses the Firebase current user to silently obtain a fresh ID token when the 90-day refresh token expires.

**Tech Stack:** KMP shared (Kotlin, `platform.Security` cinterop), Jetpack Compose (Android), SwiftUI + Firebase SDK (iOS), NestJS (backend)

---

## File Map

| File | Change |
|------|--------|
| `backend/src/auth/auth.service.ts` | TTL constants: 30d → 90d |
| `shared/src/commonMain/kotlin/br/church/paz/shared/auth/TokenPair.kt` | Add `provider: String = ""` field |
| `shared/src/commonMain/kotlin/br/church/paz/shared/auth/TokenStorage.kt` | No change (interface stays same) |
| `shared/src/androidMain/kotlin/br/church/paz/shared/auth/TokenStorage.android.kt` | Persist + restore `provider` key |
| `shared/src/iosMain/kotlin/br/church/paz/shared/auth/TokenStorage.ios.kt` | Rewrite: NSUserDefaults → Keychain via Security framework |
| `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/AuthRepositoryImpl.kt` | Pass `provider` to `tokenStorage.save()` |
| `shared/src/commonTest/kotlin/br/church/paz/shared/util/FakeTokenStorage.kt` | Add `provider` field |
| `android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashViewModel.kt` | Inject `AuthRepository`; check session; silent Firebase re-auth |
| `android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt` | Update Koin binding for `SplashViewModel` |
| `android/src/main/kotlin/br/church/paz/android/navigation/PazNavGraph.kt` | Wire `onNavigateToLogin` for splash |
| `ios/PazChurch/Services/AuthenticationCoordinator.swift` | Fix `checkAuthState()` + add `silentReAuth()` |
| `ios/PazChurch/Features/Account/AccountView.swift` | Logout button → `authCoordinator.logout()` |
| `ios/PazChurch/Features/Account/AccountViewModel.swift` | Remove no-op `onLogout()` |

---

## Task 1: Backend — extend refresh token TTL to 90 days

**Files:**
- Modify: `backend/src/auth/auth.service.ts` (lines 22, 171)

- [ ] **Step 1: Update the TTL constant and date calculation**

In `backend/src/auth/auth.service.ts`, apply both changes:

```typescript
// line 22 — was '30d'
const REFRESH_TOKEN_EXPIRES_IN = '90d';

// line 171 — was 30 * 24 * 60 * 60 * 1000
const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
```

- [ ] **Step 2: Run backend lint**

```bash
cd /Users/jonathalima/Developer/church/backend
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathalima/Developer/church/backend
git add src/auth/auth.service.ts
git commit -m "feat(auth): extend refresh token TTL from 30 to 90 days"
```

---

## Task 2: Shared KMP — add `provider` to `TokenPair`

**Files:**
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/auth/TokenPair.kt`
- Modify: `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/AuthRepositoryImpl.kt`
- Modify: `shared/src/commonTest/kotlin/br/church/paz/shared/util/FakeTokenStorage.kt`

- [ ] **Step 1: Add `provider` to `TokenPair`**

Replace the entire file:

```kotlin
package br.church.paz.shared.auth

data class TokenPair(val access: String, val refresh: String, val provider: String = "")
```

- [ ] **Step 2: Save provider in `AuthRepositoryImpl.socialLogin`**

In `shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/AuthRepositoryImpl.kt`, update the save call inside `socialLogin`:

```kotlin
tokenStorage.save(TokenPair(response.accessToken, response.refreshToken, provider))
```

- [ ] **Step 3: Update `FakeTokenStorage`**

Read `shared/src/commonTest/kotlin/br/church/paz/shared/util/FakeTokenStorage.kt` first, then ensure any hardcoded `TokenPair` constructions compile with the new field (the default `""` handles this automatically, but verify).

- [ ] **Step 4: Build shared module to confirm no compile errors**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew :shared:compileKotlinJvm
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/br/church/paz/shared/auth/TokenPair.kt \
        shared/src/commonMain/kotlin/br/church/paz/shared/data/repository/AuthRepositoryImpl.kt
git commit -m "feat(auth): store auth provider alongside tokens in TokenPair"
```

---

## Task 3: Android — persist `provider` in DataStore token storage

**Files:**
- Modify: `shared/src/androidMain/kotlin/br/church/paz/shared/auth/TokenStorage.android.kt`

- [ ] **Step 1: Add provider key and persist/restore it**

Replace the entire file:

```kotlin
package br.church.paz.shared.auth

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.first
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

actual fun createTokenStorage(): TokenStorage = DataStoreTokenStorage()

class DataStoreTokenStorage : TokenStorage, KoinComponent {
    private val dataStore: DataStore<Preferences> by inject()

    private val KEY_ACCESS   = stringPreferencesKey("paz_tok_access")
    private val KEY_REFRESH  = stringPreferencesKey("paz_tok_refresh")
    private val KEY_PROVIDER = stringPreferencesKey("paz_tok_provider")

    override suspend fun save(pair: TokenPair) {
        dataStore.edit {
            it[KEY_ACCESS]   = pair.access
            it[KEY_REFRESH]  = pair.refresh
            it[KEY_PROVIDER] = pair.provider
        }
    }

    override suspend fun read(): TokenPair? {
        val prefs = dataStore.data.first()
        val a = prefs[KEY_ACCESS]  ?: return null
        val r = prefs[KEY_REFRESH] ?: return null
        val p = prefs[KEY_PROVIDER] ?: ""
        return TokenPair(a, r, p)
    }

    override suspend fun clear() {
        dataStore.edit { it.clear() }
    }
}
```

- [ ] **Step 2: Build Android to confirm no compile errors**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew :android:compileDebugKotlin
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add shared/src/androidMain/kotlin/br/church/paz/shared/auth/TokenStorage.android.kt
git commit -m "feat(android): persist auth provider in DataStore token storage"
```

---

## Task 4: iOS KMP — replace NSUserDefaults with Keychain token storage

**Files:**
- Modify: `shared/src/iosMain/kotlin/br/church/paz/shared/auth/TokenStorage.ios.kt`

- [ ] **Step 1: Rewrite `IosTokenStorage` using Security framework**

Replace the entire file:

```kotlin
@file:OptIn(kotlinx.cinterop.ExperimentalForeignApi::class)

package br.church.paz.shared.auth

import kotlinx.cinterop.alloc
import kotlinx.cinterop.memScoped
import kotlinx.cinterop.ptr
import kotlinx.cinterop.value
import platform.CoreFoundation.CFDictionaryRef
import platform.CoreFoundation.CFStringRef
import platform.CoreFoundation.CFTypeRefVar
import platform.Foundation.CFBridgingRelease
import platform.Foundation.NSData
import platform.Foundation.NSMutableDictionary
import platform.Security.SecItemAdd
import platform.Security.SecItemCopyMatching
import platform.Security.SecItemDelete
import platform.Security.errSecSuccess
import platform.Security.kSecAttrAccount
import platform.Security.kSecAttrService
import platform.Security.kSecClass
import platform.Security.kSecClassGenericPassword
import platform.Security.kSecMatchLimit
import platform.Security.kSecMatchLimitOne
import platform.Security.kSecReturnData
import platform.Security.kSecValueData

actual fun createTokenStorage(): TokenStorage = KeychainTokenStorage()

class KeychainTokenStorage : TokenStorage {
    private val service = "br.church.paz.mobile"

    override suspend fun save(pair: TokenPair) {
        keychainSet("paz_tok_access", pair.access)
        keychainSet("paz_tok_refresh", pair.refresh)
        keychainSet("paz_tok_provider", pair.provider)
    }

    override suspend fun read(): TokenPair? {
        val a = keychainGet("paz_tok_access") ?: return null
        val r = keychainGet("paz_tok_refresh") ?: return null
        val p = keychainGet("paz_tok_provider") ?: ""
        return TokenPair(a, r, p)
    }

    override suspend fun clear() {
        keychainDelete("paz_tok_access")
        keychainDelete("paz_tok_refresh")
        keychainDelete("paz_tok_provider")
    }

    private fun keychainSet(key: String, value: String) {
        val query = NSMutableDictionary()
        query[kSecClass as CFStringRef] = kSecClassGenericPassword
        query[kSecAttrService as CFStringRef] = service
        query[kSecAttrAccount as CFStringRef] = key
        SecItemDelete(query as CFDictionaryRef)
        query[kSecValueData as CFStringRef] = value.encodeToByteArray().toNSData()
        SecItemAdd(query as CFDictionaryRef, null)
    }

    private fun keychainGet(key: String): String? = memScoped {
        val query = NSMutableDictionary()
        query[kSecClass as CFStringRef] = kSecClassGenericPassword
        query[kSecAttrService as CFStringRef] = service
        query[kSecAttrAccount as CFStringRef] = key
        query[kSecReturnData as CFStringRef] = true
        query[kSecMatchLimit as CFStringRef] = kSecMatchLimitOne
        val result = alloc<CFTypeRefVar>()
        val status = SecItemCopyMatching(query as CFDictionaryRef, result.ptr)
        if (status != errSecSuccess) return null
        val data = CFBridgingRelease(result.value) as? NSData ?: return null
        data.toByteArray().decodeToString()
    }

    private fun keychainDelete(key: String) {
        val query = NSMutableDictionary()
        query[kSecClass as CFStringRef] = kSecClassGenericPassword
        query[kSecAttrService as CFStringRef] = service
        query[kSecAttrAccount as CFStringRef] = key
        SecItemDelete(query as CFDictionaryRef)
    }
}

private fun ByteArray.toNSData(): NSData =
    NSData.create(bytes = this, length = this.size.toULong())

private fun NSData.toByteArray(): ByteArray =
    ByteArray(length.toInt()).also { arr ->
        bytes?.let { ptr ->
            for (i in arr.indices) arr[i] = (ptr as kotlinx.cinterop.CPointer<kotlinx.cinterop.ByteVar>)[i]
        }
    }
```

- [ ] **Step 2: Build iOS XCFramework to confirm it compiles**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew :shared:assembleSharedXCFramework
```
Expected: BUILD SUCCESSFUL. If you get cinterop errors on specific imports (e.g. `kSecClass` cast), adjust the cast to `CFStringRef` or remove explicit casts — the Security constants are already typed in K/N's cinterop bindings. Try replacing `query[kSecClass as CFStringRef]` with `query.setObject(kSecClassGenericPassword, forKey: kSecClass as Any)` if the cast approach fails.

- [ ] **Step 3: Commit**

```bash
git add shared/src/iosMain/kotlin/br/church/paz/shared/auth/TokenStorage.ios.kt
git commit -m "feat(ios): migrate KMP token storage from NSUserDefaults to Keychain"
```

---

## Task 5: iOS — fix `AuthenticationCoordinator` session check and add silent re-auth

**Files:**
- Modify: `ios/PazChurch/Services/AuthenticationCoordinator.swift`

- [ ] **Step 1: Rewrite `checkAuthState()` and add `silentReAuth()`**

Replace the `checkAuthState()` method, `signInWithGoogle`, `signInWithApple`, and `logout` sections with the updated coordinator. Replace the entire `AuthenticationCoordinator` class body:

```swift
@MainActor
@Observable
class AuthenticationCoordinator {
    var isAuthenticated = false
    var currentUser: Shared.User?
    var isLoading = false
    var isInitializing = true
    var error: String?

    private let authRepository: AuthRepository

    init(authRepository: AuthRepository) {
        self.authRepository = authRepository
        checkAuthState()
    }

    private func checkAuthState() {
        Task {
            do {
                let user = try await authRepository.currentUser()
                if user != nil {
                    self.currentUser = user
                    self.isAuthenticated = true
                    self.isInitializing = false
                    return
                }
            } catch {}

            // No cached user — try silent Firebase re-auth before showing login
            await silentReAuth()
            self.isInitializing = false
        }
    }

    /// Attempts to refresh the session silently using the existing Firebase user.
    /// Sets isAuthenticated = true on success, false on failure.
    func silentReAuth() async {
        guard let firebaseUser = Auth.auth().currentUser else {
            isAuthenticated = false
            return
        }
        do {
            let result = try await firebaseUser.getIDToken(forcingRefresh: true)
            // Determine provider from Firebase sign-in method
            let provider = firebaseUser.providerData.first?.providerID == "google.com" ? "google" : "apple"
            let user = try await IosAppContainer.shared.socialLogin(idToken: result, provider: provider)
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            self.isAuthenticated = false
        }
    }

    func signInWithGoogle(idToken: String) async {
        isLoading = true
        error = nil
        do {
            let user = try await IosAppContainer.shared.socialLogin(idToken: idToken, provider: "google")
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func signInWithApple(idToken: String, nonce: String) async {
        isLoading = true
        error = nil
        do {
            let user = try await IosAppContainer.shared.socialLogin(idToken: idToken, provider: "apple")
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func logout() {
        Task {
            do {
                try await IosAppContainer.shared.logout()
                try? GIDSignIn.sharedInstance.signOut()
                try? Auth.auth().signOut()
            } catch {
                self.error = "Erro ao fazer logout: \(error.localizedDescription)"
            }
            self.currentUser = nil
            self.isAuthenticated = false
        }
    }
}
```

- [ ] **Step 2: Build the iOS target in Xcode or via xcodebuild to verify**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
xcodebuild -project ios/PazChurch.xcodeproj \
           -scheme PazChurch \
           -destination 'generic/platform=iOS Simulator' \
           build 2>&1 | tail -20
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 3: Commit**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
git add ios/PazChurch/Services/AuthenticationCoordinator.swift
git commit -m "fix(ios): use authRepository for session check; add silent Firebase re-auth on token expiry"
```

---

## Task 6: iOS — fix logout button wiring

**Files:**
- Modify: `ios/PazChurch/Features/Account/AccountView.swift`
- Modify: `ios/PazChurch/Features/Account/AccountViewModel.swift`

- [ ] **Step 1: Wire logout button to `authCoordinator.logout()` in `AccountView`**

In `ios/PazChurch/Features/Account/AccountView.swift`, find the logout button action:

```swift
// BEFORE
Button(action: { viewModel.onLogout() }) {
```

Replace with:

```swift
// AFTER
Button(action: { authCoordinator.logout() }) {
```

- [ ] **Step 2: Remove the no-op `onLogout()` from `AccountViewModel`**

In `ios/PazChurch/Features/Account/AccountViewModel.swift`, remove the entire `onLogout()` method:

```swift
// DELETE this entire method:
func onLogout() {
    // sign-out handled by AuthenticationCoordinator
}
```

- [ ] **Step 3: Build to confirm no compile errors**

```bash
xcodebuild -project ios/PazChurch.xcodeproj \
           -scheme PazChurch \
           -destination 'generic/platform=iOS Simulator' \
           build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 4: Commit**

```bash
git add ios/PazChurch/Features/Account/AccountView.swift \
        ios/PazChurch/Features/Account/AccountViewModel.swift
git commit -m "fix(ios): wire logout button to AuthenticationCoordinator.logout()"
```

---

## Task 7: Android — session check and silent re-auth in SplashViewModel

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/navigation/PazNavGraph.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashScreen.kt`

- [ ] **Step 1: Rewrite `SplashViewModel` with session check and silent re-auth**

Replace the entire file at `android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashViewModel.kt`:

```kotlin
package br.church.paz.android.ui.features.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AuthRepository
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class SplashViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _effect = Channel<SplashEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        checkSession()
    }

    private fun checkSession() {
        viewModelScope.launch {
            if (authRepository.currentUser() != null) {
                _effect.send(SplashEffect.NavigateToHome)
                return@launch
            }
            // No cached user — attempt silent Firebase re-auth
            val firebaseUser = FirebaseAuth.getInstance().currentUser
            if (firebaseUser == null) {
                _effect.send(SplashEffect.NavigateToLogin)
                return@launch
            }
            try {
                val idToken = firebaseUser.getIdToken(true).await()?.token
                    ?: throw Exception("No Firebase token")
                val provider = firebaseUser.providerData
                    .firstOrNull { it.providerId != "firebase" }
                    ?.providerId
                    ?.let { if (it == "google.com") "google" else "apple" }
                    ?: "google"
                authRepository.socialLogin(idToken, provider)
                _effect.send(SplashEffect.NavigateToHome)
            } catch (_: Exception) {
                _effect.send(SplashEffect.NavigateToLogin)
            }
        }
    }
}
```

- [ ] **Step 2: Update Koin binding in `AndroidModule`**

In `android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt`, change:

```kotlin
// BEFORE
viewModel { SplashViewModel() }

// AFTER
viewModel { SplashViewModel(get()) }
```

- [ ] **Step 3: Update `SplashScreen` to handle `NavigateToLogin`**

In `android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashScreen.kt`, add the `onNavigateToLogin` parameter and wire the effect:

```kotlin
@Composable
fun SplashScreen(
    onNavigateToHome: () -> Unit,
    onNavigateToLogin: () -> Unit,
    viewModel: SplashViewModel = koinViewModel(),
) {
    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                SplashEffect.NavigateToHome -> onNavigateToHome()
                SplashEffect.NavigateToLogin -> onNavigateToLogin()
            }
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(PazGradients.Hero),
        contentAlignment = Alignment.Center,
    ) {
        Image(
            painter = painterResource(R.drawable.paz_logo),
            contentDescription = null,
            modifier = Modifier.size(140.dp),
        )
    }
}
```

- [ ] **Step 4: Wire `onNavigateToLogin` in `PazNavGraph`**

In `android/src/main/kotlin/br/church/paz/android/navigation/PazNavGraph.kt`, update the Splash composable:

```kotlin
composable(Screen.Splash.route) {
    SplashScreen(
        onNavigateToHome = {
            navController.navigate(Screen.Shell.route) {
                popUpTo(Screen.Splash.route) { inclusive = true }
            }
        },
        onNavigateToLogin = {
            navController.navigate(Screen.Login.route) {
                popUpTo(Screen.Splash.route) { inclusive = true }
            }
        },
    )
}
```

- [ ] **Step 5: Build Android to confirm no compile errors**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew :android:compileDebugKotlin
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashViewModel.kt \
        android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt \
        android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashScreen.kt \
        android/src/main/kotlin/br/church/paz/android/navigation/PazNavGraph.kt
git commit -m "feat(android): check session on splash; silent Firebase re-auth when refresh token expires"
```

---

## Task 8: Format everything

- [ ] **Step 1: Format KMP/Android Kotlin**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
./gradlew ktlintFormat
```
Expected: BUILD SUCCESSFUL (warnings are fine, errors are not)

- [ ] **Step 2: Format iOS Swift**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
swiftformat ios/PazChurch --swiftversion 6.0
swiftlint --fix ios/PazChurch
```
Expected: no errors (warnings are fine)

- [ ] **Step 3: Format backend TypeScript**

```bash
cd /Users/jonathalima/Developer/church/backend
npm run format && npm run lint
```
Expected: no errors

- [ ] **Step 4: Commit any formatting changes**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
git add -A
git diff --cached --quiet || git commit -m "style: apply ktlint + swiftformat formatting"

cd /Users/jonathalima/Developer/church/backend
git add -A
git diff --cached --quiet || git commit -m "style: apply prettier formatting"
```

---

## Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| Backend TTL 30d → 90d | Task 1 |
| `provider` stored with tokens | Tasks 2, 3, 4 |
| iOS Keychain token storage (NSUserDefaults → Keychain) | Task 4 |
| iOS session check fix (`checkAuthState` mismatch) | Task 5 |
| iOS silent Firebase re-auth on token expiry | Task 5 |
| iOS logout button fix | Task 6 |
| Android splash session check | Task 7 |
| Android `NavigateToLogin` wired | Task 7 |
| Android silent Firebase re-auth | Task 7 |
| Format everything | Task 8 |
