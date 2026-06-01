# Authentication Integration Guide

Complete OAuth authentication flow with Firebase, Google, and Apple sign-in for both Android and iOS platforms.

## Architecture Overview

```
Firebase Auth (Google/Apple) ──→ Platform SDK (Google/Apple modules)
                                  ↓
                           Get ID Token
                                  ↓
                        Backend POST /api/auth/social-login
                                  ↓
                     Return JWT (access + refresh tokens)
                                  ↓
                    Store in Keychain (iOS) / DataStore (Android)
                                  ↓
                    Add to Ktor Bearer auth on all requests
```

## Setup Requirements

### 1. Firebase Configuration

**Android:**
- Download `google-services.json` from Firebase Console
- Place at: `android/app/google-services.json`
- Already wired in `android/build.gradle`

**iOS:**
- Download `GoogleService-Info.plist` from Firebase Console
- Place at: `ios/PazChurch/GoogleService-Info.plist`
- Add to Xcode target: **Build Phases → Copy Bundle Resources**

### 2. Google OAuth Setup

**Android:**
- Uses Credential Manager + Google Sign-In SDK
- `android/src/main/kotlin/.../auth/GoogleSignInHelper.kt` wraps the flow
- No additional setup needed (Google services configured via `google-services.json`)

**iOS:**
- Uses Google Sign-In SDK (CocoaPods)
- Add to `Podfile`: `pod 'GoogleSignIn'`
- Configure Client ID in Firebase Console
- `ios/.../Services/GoogleSignInHelper.swift` wraps the flow

### 3. Apple OAuth Setup

**Android:**
- Uses Firebase Authentication OAuthProvider
- No additional setup needed

**iOS:**
- Uses native `SignInWithAppleButton` (iOS 13.3+)
- Add **Sign in with Apple** capability in Xcode:
  - **Signing & Capabilities → + Capability → Sign in with Apple**
- No additional SDK needed (native support)

## Implementation Details

### Android Authentication Flow

```kotlin
// 1. User taps "Sign in with Google"
GoogleSignInHelper.getIdToken() // Uses Credential Manager
↓
// 2. Get Firebase ID token
FirebaseAuth.signInWithGoogle(idToken)
↓
// 3. Exchange for backend JWT
AuthRepository.socialLogin(idToken, "google")
↓
// 4. Store tokens in DataStore
AuthRepository.currentUser() // Auto-refreshes JWT on 401
```

**Key Files:**
- `android/src/main/kotlin/.../auth/GoogleSignInHelper.kt` — Credential Manager
- `android/src/main/kotlin/.../auth/AppleSignInHelper.kt` — Firebase OAuthProvider
- `shared/src/androidMain/kotlin/.../TokenStorage.kt` — DataStore persistence
- `shared/src/commonMain/kotlin/.../PazHttpClient.kt` — Bearer auth + auto-refresh

### iOS Authentication Flow

```swift
// 1. User taps "Sign in with Google"
GoogleSignInHelper.getIdToken()
↓
// 2. Get Firebase ID token
GIDSignIn.sharedInstance.signIn()
↓
// 3. Exchange for backend JWT
AuthenticationCoordinator.signInWithGoogle(idToken)
↓
// 4. Store tokens in Keychain
KeychainService.save(token, key: "accessToken")
```

**Key Files:**
- `ios/PazChurch/Services/KeychainService.swift` — Keychain persistence
- `ios/PazChurch/Services/AuthenticationCoordinator.swift` — Auth state management
- `ios/PazChurch/Features/Auth/LoginView.swift` — Firebase OAuth UI
- `shared/src/iosMain/kotlin/.../TokenStorage.kt` — Keychain wrapper

## Token Management

### Storage

| Platform | Location | Key |
|----------|----------|-----|
| Android | DataStore | `access_token`, `refresh_token` |
| iOS | Keychain | `accessToken`, `refreshToken` |

### Refresh Mechanism

Both platforms implement automatic JWT refresh on 401:

1. Request fails with 401 (token expired)
2. Ktor bearer plugin intercepts
3. Call `POST /api/auth/refresh` with refresh token
4. Get new access token
5. Retry original request

**No user interaction required** — refresh happens transparently.

### Logout

```swift
// iOS
authCoordinator.logout()
↓
AuthRepository.logout() // Invalidate session
AuthenticationCoordinator.isAuthenticated = false
KeychainService.delete("accessToken")
KeychainService.delete("refreshToken")
↓
Navigate to LoginView
```

## Testing

### Manual Testing Checklist

- [ ] **Google Sign-In**
  - Android: Test Credential Manager flow
  - iOS: Test GIDSignIn flow
  - Verify token stored
  - Verify JWT call succeeds

- [ ] **Apple Sign-In**
  - Android: Test Firebase OAuthProvider
  - iOS: Test SignInWithAppleButton
  - Verify token stored
  - Verify JWT call succeeds

- [ ] **Token Refresh**
  - Make authenticated request
  - Wait for token expiry (24h) or manually expire
  - Make another request
  - Verify refresh succeeds transparently
  - Verify no 401 to user

- [ ] **Session Persistence**
  - Sign in
  - Kill app
  - Relaunch
  - Verify logged-in state restored

- [ ] **Logout**
  - Sign in
  - Logout
  - Verify tokens cleared
  - Verify navigates to login
  - Verify cannot access protected screens

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Google Client ID not configured" | Missing `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) | Download from Firebase Console |
| "Failed to get ID token" | Network issue or auth provider error | Show user message, allow retry |
| "Invalid credentials" | Token validation failed at backend | Backend logs will show JWT validation error |
| "Session expired" | Refresh token invalid or revoked | Force logout, user must sign in again |

## Security Notes

- **Access Token**: 24h expiry, stored securely
- **Refresh Token**: 30d expiry, stored securely
- **Keychain (iOS)**: Uses system encryption, auto-backed-up to iCloud
- **DataStore (Android)**: Encrypted at rest via EncryptedSharedPreferences
- **Nonce (Apple)**: Generated per request, prevents replay attacks
- **HTTPS only**: All auth requests over HTTPS

## Next Steps

1. Configure Firebase in both Google/Apple consoles
2. Download credentials files
3. Run `android/gradlew :android:compileDebugKotlin` (verify google-services.json loads)
4. Run tests: `android/gradlew :android:testDebugUnitTest`
5. Test on device: Google Sign-In → verify token in storage → verify JWT request
6. Test session persistence: sign in → kill app → relaunch → verify logged-in
7. Test logout: verify tokens cleared → verify navigates to login

## Files Modified

- `shared/src/commonMain/.../AuthRepository.kt` — Added socialLogin
- `android/src/main/kotlin/.../LoginViewModel.kt` — Wired GoogleSignInHelper
- `ios/PazChurch/Services/KeychainService.swift` — NEW
- `ios/PazChurch/Services/AuthenticationCoordinator.swift` — NEW
- `ios/PazChurch/PazChurchApp.swift` — Added Firebase init + auth coordinator
- `ios/PazChurch/Features/Auth/LoginView.swift` — Wired Google/Apple OAuth
