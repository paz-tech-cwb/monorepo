# Session Persistence & Silent Re-Auth — Design

**Date:** 2026-06-08  
**Status:** Approved

## Problem Summary

1. iOS users must re-login on every app restart — tokens stored in NSUserDefaults by KMP, but read from Keychain by `AuthenticationCoordinator`.
2. iOS logout button is a no-op — `AccountViewModel.onLogout()` has no implementation.
3. Android splash screen never checks token validity — always proceeds to home.
4. Refresh token TTL is 30 days — users are kicked out too frequently.
5. No silent re-auth when refresh token expires — Firebase session is still valid but app forces login screen.

## Solution: Approach A — Platform-layer silent re-auth

Fix token storage mismatch, wire logout, add Android session check, extend TTL to 90 days, and add silent Firebase re-auth when the refresh token expires.

---

## Section 1 — Backend: Refresh token TTL → 90 days

**File:** `backend/src/auth/auth.service.ts`

- Change `REFRESH_TOKEN_EXPIRES_IN = '30d'` → `'90d'`
- Change `expiresAt` date calculation from `30 * 24 * 60 * 60 * 1000` → `90 * 24 * 60 * 60 * 1000`

No other backend changes needed.

---

## Section 2 — iOS: Keychain-based KMP token storage

**File:** `shared/src/iosMain/kotlin/br/church/paz/shared/auth/TokenStorage.ios.kt`

Replace the `NSUserDefaults` implementation with direct Security framework calls (`SecItemAdd`, `SecItemCopyMatching`, `SecItemDelete`) using the same service identifier as `KeychainService.swift` (`br.church.paz.mobile`). Keys: `paz_tok_access`, `paz_tok_refresh`.

This resolves the storage mismatch: KMP writes to Keychain, `AuthenticationCoordinator.checkAuthState()` reads from Keychain.

---

## Section 3 — iOS: Fix logout wiring

**File:** `ios/PazChurch/Features/Account/AccountView.swift`

The logout button currently calls `viewModel.onLogout()` (no-op). Change it to call `authCoordinator.logout()` directly — the coordinator is already in the environment.

**File:** `ios/PazChurch/Features/Account/AccountViewModel.swift`

Remove the empty `onLogout()` method.

---

## Section 4 — Android: Session check on splash

**File:** `android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashViewModel.kt`

Inject `AuthRepository`. On init, call `authRepository.currentUser()`:
- Result is non-null → emit `NavigateToHome`
- Result is null → emit `NavigateToLogin`

Add a `NavigateToLogin` effect to `SplashEffect` and handle it in `SplashScreen` / `PazNavGraph`.

---

## Section 5 — Silent re-auth when refresh token expires

When Ktor's `refreshTokens` fails, it clears storage and API calls return 401. The platform detects the unauthenticated state and attempts silent Firebase re-auth before showing the login screen.

### iOS

In `AuthenticationCoordinator`, add a `silentReAuth()` method:
1. Check `Auth.auth().currentUser` — if nil, set `isAuthenticated = false` and show login.
2. Call `getIDToken(forcingRefresh: true)` to get a fresh Firebase token.
3. Call `IosAppContainer.shared.socialLogin(idToken:provider:)` silently.
4. On success: set `isAuthenticated = true`, update `currentUser`. On failure: set `isAuthenticated = false`.

`checkAuthState()` calls `silentReAuth()` instead of immediately setting `isAuthenticated = false` when no token is found.

### Android

In `SplashViewModel`, if `authRepository.currentUser()` returns null:
1. Check `FirebaseAuth.getInstance().currentUser` — if nil, emit `NavigateToLogin`.
2. Call `currentUser.getIdToken(true)` to get a fresh Firebase ID token.
3. Call `authRepository.socialLogin(idToken, provider)`.
4. On success: emit `NavigateToHome`. On failure: emit `NavigateToLogin`.

The Firebase provider (`google` or `apple`) must be stored alongside the tokens so silent re-auth knows which provider to use. Add `paz_auth_provider` to token storage (both iOS Keychain and Android DataStore).

---

## Data flow on app startup

```
App starts
  └─ iOS: AuthenticationCoordinator.checkAuthState()
       ├─ Token in Keychain? → currentUser() → isAuthenticated = true ✓
       └─ No token → silentReAuth()
            ├─ Firebase currentUser + fresh ID token → socialLogin → isAuthenticated = true ✓
            └─ No Firebase user → isAuthenticated = false → show login

  └─ Android: SplashViewModel.init
       ├─ authRepository.currentUser() non-null → NavigateToHome ✓
       └─ null → silentReAuth()
            ├─ Firebase getIdToken → socialLogin → NavigateToHome ✓
            └─ Failure → NavigateToLogin
```

---

## Error handling

- Silent re-auth failure always falls through to the login screen — never a crash or infinite loop.
- Ktor `refreshTokens` failure (network error) clears storage; next app open triggers silent re-auth path.
- Logout explicitly clears both token storage and Firebase sign-in state (`GIDSignIn.sharedInstance.signOut()` on iOS, `FirebaseAuth.getInstance().signOut()` on Android).

---

## Out of scope

- Token expiry pre-emption (Approach B) — not needed at 90-day TTL.
- Moving Firebase calls into shared KMP (Approach C) — against current architecture.
