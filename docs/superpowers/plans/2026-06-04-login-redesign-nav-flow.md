# Login Redesign + Navigation Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the login gate at app launch; make Home always the first screen; route login through the Conta tab and Academy modal; redesign LoginScreen/LoginView to match `Login Native v2.html`.

**Architecture:** Both platforms flip from "auth-gate at root" to "tab-level auth gating." Android uses a root `NavController` — AccountScreen navigates to the login route and back; AcademyScreen uses a `ModalBottomSheet`. iOS uses `AuthenticationCoordinator` as an `@EnvironmentObject` — AccountView uses `.fullScreenCover`, AcademyView uses `.sheet`.

**Tech Stack:** Android — Compose, Material3, Koin, NavController; iOS — SwiftUI, `@EnvironmentObject`, `AuthenticationCoordinator`.

---

## File Map

### Android
| File | Change |
|---|---|
| `android/.../splash/SplashViewModel.kt` | Always emit NavigateToHome — no Login branch |
| `android/.../splash/SplashScreen.kt` | Remove `onNavigateToLogin` param |
| `android/.../navigation/PazNavGraph.kt` | LoginScreen onLoginSuccess → popBackStack |
| `android/.../features/account/AccountUiState.kt` | Add `NavigateToLogin` to AccountEffect |
| `android/.../features/account/AccountViewModel.kt` | Emit `NavigateToLogin` when user is null after load; change `LoggedOut` nav |
| `android/.../features/account/AccountScreen.kt` | Handle `NavigateToLogin` effect |
| `android/.../features/academy/AcademyUiState.kt` | Add `isAuthenticated: Boolean = false` |
| `android/.../features/academy/AcademyViewModel.kt` | Add `authRepository`; check auth in init; add `refreshAuthState()` |
| `android/.../di/AndroidModule.kt` | Update AcademyViewModel binding to `get(), get()` |
| `android/.../features/academy/AcademyScreen.kt` | showLoginSheet state + ModalBottomSheet |
| `android/.../features/auth/LoginScreen.kt` | Full visual redesign (hero + overlapping card) + `onDismiss` param |

### iOS
| File | Change |
|---|---|
| `ios/.../PazChurchApp.swift` | Always render MainTabView; remove isAuthenticated branch |
| `ios/.../Theme/PazTypography.swift` | Add `displayLarge` (ExtraBold 34pt) |
| `ios/.../Features/Auth/LoginView.swift` | Full visual redesign + optional `onDismiss` param |
| `ios/.../Features/Account/AccountView.swift` | fullScreenCover LoginView when not authenticated |
| `ios/.../Features/Academy/AcademyView.swift` | sheet LoginView when course tapped + unauthenticated |

---

## Task 1 — Android: Navigation refactor (Splash always → Shell; Login popBackStack)

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashScreen.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/navigation/PazNavGraph.kt`

- [ ] **Step 1: Update SplashViewModel to always navigate to Home**

Replace `SplashViewModel.kt` content:

```kotlin
package br.church.paz.android.ui.features.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

class SplashViewModel : ViewModel() {

    private val _effect = Channel<SplashEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        viewModelScope.launch { _effect.send(SplashEffect.NavigateToHome) }
    }
}
```

- [ ] **Step 2: Remove `onNavigateToLogin` from SplashScreen**

Replace the `SplashScreen` function signature and `LaunchedEffect` in `SplashScreen.kt`:

```kotlin
@Composable
fun SplashScreen(
    onNavigateToHome: () -> Unit,
    viewModel: SplashViewModel = koinViewModel(),
) {
    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                SplashEffect.NavigateToHome -> onNavigateToHome()
                else -> Unit
            }
        }
    }
    // rest of Box/Column layout unchanged
```

- [ ] **Step 3: Update PazNavGraph — Splash no longer calls Login; LoginScreen uses popBackStack**

In `PazNavGraph.kt`, change the Splash composable and Login composable:

```kotlin
composable(Screen.Splash.route) {
    SplashScreen(
        onNavigateToHome = {
            navController.navigate(Screen.Shell.route) {
                popUpTo(Screen.Splash.route) { inclusive = true }
            }
        },
    )
}
composable(Screen.Login.route) {
    LoginScreen(
        onLoginSuccess = { navController.popBackStack() },
    )
}
```

- [ ] **Step 4: Update Koin binding for SplashViewModel (no longer needs AuthRepository)**

In `AndroidModule.kt`, change:
```kotlin
viewModel { SplashViewModel(get()) }
```
to:
```kotlin
viewModel { SplashViewModel() }
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
git add android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashViewModel.kt \
        android/src/main/kotlin/br/church/paz/android/ui/features/splash/SplashScreen.kt \
        android/src/main/kotlin/br/church/paz/android/navigation/PazNavGraph.kt \
        android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt
git commit -m "feat(android): splash always navigates to home, login uses popBackStack"
```

---

## Task 2 — Android: AccountViewModel emits NavigateToLogin when unauthenticated

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/account/AccountUiState.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/account/AccountViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/account/AccountScreen.kt`

- [ ] **Step 1: Add NavigateToLogin to AccountEffect**

In `AccountUiState.kt`, add to the sealed class:
```kotlin
data object NavigateToLogin : AccountEffect()
```

Full file after change:
```kotlin
package br.church.paz.android.ui.features.account

import br.church.paz.shared.domain.model.User

data class AccountUiState(
    val user: User? = null,
    val isLoading: Boolean = true,
    val isDarkMode: Boolean = false,
)

sealed class AccountEffect {
    data object NavigateToLogin              : AccountEffect()
    data object NavigateToEditProfile        : AccountEffect()
    data object NavigateToMemberJourney      : AccountEffect()
    data object NavigateToMeetingReport      : AccountEffect()
    data object NavigateToFormularios        : AccountEffect()
    data object NavigateToMinistries         : AccountEffect()
    data object NavigateToNotificationPrefs  : AccountEffect()
    data object LoggedOut                    : AccountEffect()
}
```

- [ ] **Step 2: Emit NavigateToLogin when user is null; simplify LoggedOut nav**

In `AccountViewModel.kt`, update `loadUser()` and `onLogout()`:

```kotlin
private fun loadUser() {
    viewModelScope.launch {
        val user = authRepository.currentUser()
        _uiState.update { it.copy(user = user, isLoading = false) }
        if (user == null) _effect.send(AccountEffect.NavigateToLogin)
    }
}

fun onLogout() {
    viewModelScope.launch {
        authRepository.logout()
        _effect.send(AccountEffect.LoggedOut)
    }
}
```

`LoggedOut` will now just navigate to `Screen.Login` (same as `NavigateToLogin`); both are handled identically in the screen.

- [ ] **Step 3: Handle NavigateToLogin in AccountScreen**

In `AccountScreen.kt`, update the `LaunchedEffect` effect handler to handle both `NavigateToLogin` and `LoggedOut` with the same nav call (no longer needs `popUpTo(0)`):

```kotlin
LaunchedEffect(Unit) {
    viewModel.effect.collect { effect ->
        when (effect) {
            AccountEffect.NavigateToEditProfile       -> navController.navigate(Screen.EditProfile.route)
            AccountEffect.NavigateToMemberJourney     -> navController.navigate(Screen.MemberJourney.route)
            AccountEffect.NavigateToMeetingReport     -> navController.navigate(Screen.MeetingReport.route)
            AccountEffect.NavigateToFormularios       -> navController.navigate(Screen.FormulariosList.route)
            AccountEffect.NavigateToMinistries        -> navController.navigate(Screen.Ministries.route)
            AccountEffect.NavigateToNotificationPrefs -> navController.navigate(Screen.NotificationPrefs.route)
            AccountEffect.NavigateToLogin,
            AccountEffect.LoggedOut -> navController.navigate(Screen.Login.route)
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/account/AccountUiState.kt \
        android/src/main/kotlin/br/church/paz/android/ui/features/account/AccountViewModel.kt \
        android/src/main/kotlin/br/church/paz/android/ui/features/account/AccountScreen.kt
git commit -m "feat(android): account screen navigates to login when unauthenticated"
```

---

## Task 3 — Android: AcademyViewModel adds auth state

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/academy/AcademyUiState.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/academy/AcademyViewModel.kt`
- Modify: `android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt`

- [ ] **Step 1: Add isAuthenticated to AcademyUiState**

Replace `AcademyUiState.kt`:
```kotlin
package br.church.paz.android.ui.features.academy

import br.church.paz.shared.domain.model.CourseTrack

data class AcademyUiState(
    val isLoading: Boolean = true,
    val tracks: List<CourseTrack> = emptyList(),
    val error: String? = null,
    val isAuthenticated: Boolean = false,
)

sealed class AcademyEffect {
    data class NavigateToPlayer(val videoId: String) : AcademyEffect()
}
```

- [ ] **Step 2: Add authRepository to AcademyViewModel**

Replace `AcademyViewModel.kt`:
```kotlin
package br.church.paz.android.ui.features.academy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AcademyRepository
import br.church.paz.shared.domain.repository.AuthRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AcademyViewModel(
    private val academyRepository: AcademyRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AcademyUiState())
    val uiState: StateFlow<AcademyUiState> = _uiState.asStateFlow()

    private val _effect = Channel<AcademyEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val user = runCatching { authRepository.currentUser() }.getOrNull()
            _uiState.update { it.copy(isAuthenticated = user != null) }
            runCatching { academyRepository.getAcademyContent() }
                .onSuccess { content ->
                    _uiState.update { it.copy(isLoading = false, tracks = content.tracks) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun refreshAuthState() {
        viewModelScope.launch {
            val user = runCatching { authRepository.currentUser() }.getOrNull()
            _uiState.update { it.copy(isAuthenticated = user != null) }
        }
    }

    fun onVideoTapped(videoId: String) {
        viewModelScope.launch { _effect.send(AcademyEffect.NavigateToPlayer(videoId)) }
    }
}
```

- [ ] **Step 3: Update Koin binding**

In `AndroidModule.kt`, change:
```kotlin
viewModel { AcademyViewModel(get()) }
```
to:
```kotlin
viewModel { AcademyViewModel(get(), get()) }
```

- [ ] **Step 4: Commit**

```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/academy/AcademyUiState.kt \
        android/src/main/kotlin/br/church/paz/android/ui/features/academy/AcademyViewModel.kt \
        android/src/main/kotlin/br/church/paz/android/di/AndroidModule.kt
git commit -m "feat(android): academy view model tracks auth state"
```

---

## Task 4 — Android: LoginScreen visual redesign

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/auth/LoginScreen.kt`

The new layout: full-screen `Box` → hero `Box` (380dp, gradient) stacked with a card that starts at 332dp (= 380 - 48 overlap). Card has 26dp radius, border, deep shadow, Playfair title, gold rule, slate welcome text, redesigned Google/Apple buttons, visitor link.

- [ ] **Step 1: Replace LoginScreen.kt**

```kotlin
package br.church.paz.android.ui.features.auth

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import br.church.paz.android.auth.GoogleSignInHelper
import br.church.paz.android.ui.theme.DmSans
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazSpacing
import com.cwb.pazchurch.app.BuildConfig
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.OAuthProvider
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.koin.androidx.compose.koinViewModel

private val CardShape = RoundedCornerShape(26.dp)

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onDismiss: (() -> Unit)? = null,
    viewModel: LoginViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val isDark = isSystemInDarkTheme()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LoginEffect.NavigateToHome   -> onLoginSuccess()
                is LoginEffect.ShowError     -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // ── Hero zone ──────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(380.dp)
                .background(PazGradients.Hero),
        ) {
            // Top scrim
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color(0x8C081428), Color.Transparent),
                        ),
                    )
            )
            // Ghost cross watermark
            Text(
                text  = "✝",
                style = MaterialTheme.typography.displayLarge.copy(
                    fontSize = 200.sp,
                    color    = Color.White.copy(alpha = 0.07f),
                ),
                modifier = Modifier.align(Alignment.Center),
            )
            // Close button (modal only)
            if (onDismiss != null) {
                IconButton(
                    onClick  = onDismiss,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .statusBarsPadding()
                        .padding(end = 12.dp, top = 4.dp),
                ) {
                    Icon(
                        imageVector        = Icons.Outlined.Close,
                        contentDescription = "Fechar",
                        tint               = Color.White.copy(alpha = 0.85f),
                    )
                }
            }
        }

        // ── Sheet (card overlaps hero by 48dp) ─────────────────────────────
        Column(Modifier.fillMaxSize()) {
            Spacer(Modifier.height(332.dp))   // 380 - 48
            LoginCard(
                isLoading   = uiState.isLoading,
                isDark      = isDark,
                onGoogle    = {
                    scope.launch {
                        val helper = GoogleSignInHelper(context)
                        helper.getIdToken(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                            .onSuccess { viewModel.onGoogleSignIn(it) }
                            .onFailure { e ->
                                if (e.message?.contains("cancel", ignoreCase = true) == false) {
                                    snackbarHostState.showSnackbar(
                                        e.message ?: "Erro ao entrar com Google."
                                    )
                                }
                            }
                    }
                },
                onApple = {
                    val provider = OAuthProvider.newBuilder("apple.com")
                        .setScopes(listOf("email", "name"))
                        .build()
                    val activity = context as? Activity ?: return@LoginCard
                    FirebaseAuth.getInstance()
                        .startActivityForSignInWithProvider(activity, provider)
                        .addOnSuccessListener { result ->
                            scope.launch {
                                result.user?.getIdToken(false)?.await()?.token?.let { idToken ->
                                    viewModel.onAppleSignIn(idToken)
                                }
                            }
                        }
                        .addOnFailureListener { e ->
                            if (e.message?.contains("cancel", ignoreCase = true) == false) {
                                scope.launch {
                                    snackbarHostState.showSnackbar(
                                        e.message ?: "Erro ao entrar com Apple."
                                    )
                                }
                            }
                        }
                },
                onVisitor = { onLoginSuccess() },
            )
            Spacer(Modifier.weight(1f))
            Spacer(Modifier.navigationBarsPadding())
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier  = Modifier.align(Alignment.BottomCenter).navigationBarsPadding(),
        ) { data ->
            Snackbar(
                snackbarData   = data,
                containerColor = MaterialTheme.colorScheme.errorContainer,
                contentColor   = MaterialTheme.colorScheme.onErrorContainer,
            )
        }
    }
}

@Composable
private fun LoginCard(
    isLoading: Boolean,
    isDark: Boolean,
    onGoogle: () -> Unit,
    onApple: () -> Unit,
    onVisitor: () -> Unit,
) {
    val cardBg      = if (isDark) PazColors.DarkSurface else Color.White
    val titleColor  = if (isDark) PazColors.Accent else PazColors.Primary
    val slateColor  = if (isDark) PazColors.DarkSlate else Color(0xFF5A6B82)
    val linkColor   = if (isDark) PazColors.Accent else PazColors.PrimaryLight

    Box(
        modifier = Modifier
            .padding(horizontal = 20.dp)
            .shadow(
                elevation        = 20.dp,
                shape            = CardShape,
                ambientColor     = PazColors.Primary.copy(alpha = 0.25f),
                spotColor        = PazColors.Primary.copy(alpha = 0.40f),
            )
            .background(cardBg, CardShape)
            .border(1.dp, PazColors.Primary.copy(alpha = 0.06f), CardShape)
            .padding(horizontal = 24.dp, vertical = 26.dp),
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text  = "Paz Church",
                style = MaterialTheme.typography.displayLarge.copy(
                    fontSize   = 30.sp,
                    color      = titleColor,
                    lineHeight = 32.sp,
                ),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(14.dp))
            // Gold rule
            Box(
                Modifier
                    .width(32.dp)
                    .height(2.dp)
                    .background(PazColors.Gold, RoundedCornerShape(2.dp))
            )
            Spacer(Modifier.height(14.dp))
            Text(
                text      = "Uma comunidade de fé, amor e propósito.",
                style     = MaterialTheme.typography.bodyLarge.copy(color = slateColor),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(22.dp))

            // Google
            AuthButton(
                text      = "Continuar com Google",
                icon      = "G",
                isLoading = isLoading,
                isDark    = isDark,
                isPrimary = false,
                onClick   = onGoogle,
            )
            Spacer(Modifier.height(11.dp))
            // Apple
            AuthButton(
                text      = "Continuar com Apple",
                icon      = "",
                isLoading = false,
                isDark    = isDark,
                isPrimary = true,
                onClick   = onApple,
            )
            Spacer(Modifier.height(15.dp))
            Text(
                text  = "Explorar como visitante",
                style = MaterialTheme.typography.bodySmall.copy(
                    color          = slateColor,
                    textDecoration = TextDecoration.Underline,
                ),
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .clickable(enabled = !isLoading, onClick = onVisitor)
                    .padding(horizontal = 4.dp, vertical = 2.dp),
            )
        }
    }
}

@Composable
private fun AuthButton(
    text: String,
    icon: String,
    isLoading: Boolean,
    isDark: Boolean,
    isPrimary: Boolean,
    onClick: () -> Unit,
) {
    // isPrimary = Apple (dark bg); !isPrimary = Google (surface bg)
    val containerColor = when {
        isPrimary && isDark  -> Color.White.copy(alpha = 0.10f)
        isPrimary            -> Color.Black
        isDark               -> PazColors.DarkCard2
        else                 -> Color.White
    }
    val contentColor = when {
        isPrimary -> Color.White
        isDark    -> Color(0xFFEAEFF7)
        else      -> PazColors.OnSurface
    }
    val borderColor = when {
        isPrimary && isDark  -> Color.White.copy(alpha = 0.20f)
        isPrimary            -> Color.Transparent
        isDark               -> Color(0xFF1C2A3D)
        else                 -> Color(0xFFE7ECF3)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(PazShapePill)
            .background(containerColor)
            .border(1.dp, borderColor, PazShapePill)
            .clickable(enabled = !isLoading, onClick = onClick)
            .padding(horizontal = PazSpacing.Xl),
        verticalAlignment             = Alignment.CenterVertically,
        horizontalArrangement         = androidx.compose.foundation.layout.Arrangement.Center,
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier    = Modifier.size(20.dp),
                color       = contentColor,
                strokeWidth = 2.dp,
            )
        } else {
            Text(
                text  = icon,
                style = MaterialTheme.typography.titleMedium.copy(
                    color      = contentColor,
                    fontFamily = DmSans,
                ),
            )
            Spacer(Modifier.width(PazSpacing.Sm))
            Text(
                text  = text,
                style = MaterialTheme.typography.titleMedium.copy(color = contentColor),
            )
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/auth/LoginScreen.kt
git commit -m "feat(android): redesign login screen — hero + overlapping card, dark mode"
```

---

## Task 5 — Android: AcademyScreen login bottom sheet

**Files:**
- Modify: `android/src/main/kotlin/br/church/paz/android/ui/features/academy/AcademyScreen.kt`

- [ ] **Step 1: Add showLoginSheet state and gate course taps**

At the top of `AcademyScreen`, add `showLoginSheet` state and the `ModalBottomSheet`:

```kotlin
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import br.church.paz.android.ui.features.auth.LoginScreen
```

Replace the `AcademyScreen` composable:

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademyScreen(
    navController: NavController,
    contentPadding: PaddingValues = PaddingValues(),
    viewModel: AcademyViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showLoginSheet by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is AcademyEffect.NavigateToPlayer ->
                    navController.navigate(Screen.VideoPlayer.createRoute(effect.videoId))
            }
        }
    }

    if (showLoginSheet) {
        ModalBottomSheet(
            onDismissRequest = { showLoginSheet = false },
            sheetState       = sheetState,
        ) {
            LoginScreen(
                onLoginSuccess = {
                    showLoginSheet = false
                    viewModel.refreshAuthState()
                },
                onDismiss = { showLoginSheet = false },
            )
        }
    }

    Column(Modifier.fillMaxSize()) {
        // hero Box unchanged
        Box(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Xl, vertical = PazSpacing.Lg),
        ) {
            Column {
                Text(
                    "Conteúdo exclusivo",
                    style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.5f)),
                )
                Text(
                    "Academia\nPaz Church",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                )
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading -> AcademySkeleton(contentPadding)
                uiState.error != null -> Box(
                    Modifier.fillMaxSize().padding(contentPadding),
                    contentAlignment = Alignment.Center,
                ) { Text(uiState.error!!, style = MaterialTheme.typography.bodyMedium) }
                uiState.tracks.isEmpty() -> Box(
                    Modifier.fillMaxSize().padding(contentPadding),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "Nenhum conteúdo disponível",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        ),
                    )
                }
                else -> AcademyContent(
                    tracks          = uiState.tracks,
                    contentPadding  = contentPadding,
                    isAuthenticated = uiState.isAuthenticated,
                    onCourseTap     = { course ->
                        if (uiState.isAuthenticated) {
                            viewModel.onVideoTapped(course.id)
                        } else {
                            showLoginSheet = true
                        }
                    },
                )
            }
        }
    }
}
```

- [ ] **Step 2: Update AcademyContent and CourseListItem to accept tap callback**

Replace `AcademyContent` and `CourseListItem`:

```kotlin
@Composable
private fun AcademyContent(
    tracks: List<CourseTrack>,
    contentPadding: PaddingValues,
    isAuthenticated: Boolean,
    onCourseTap: (Course) -> Unit,
) {
    LazyColumn(
        contentPadding      = contentPadding,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Xl),
        modifier            = Modifier.fillMaxSize(),
    ) {
        for (track in tracks) {
            item {
                Column(Modifier.padding(top = PazSpacing.Xl)) {
                    PazSectionHeader(
                        title    = track.title,
                        modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                    )
                    if (!track.description.isNullOrBlank()) {
                        Spacer(Modifier.height(PazSpacing.Xs))
                        Text(
                            text     = track.description!!,
                            style    = MaterialTheme.typography.bodySmall.copy(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                            ),
                            modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                        )
                    }
                }
            }
            items(track.courses, key = { "${track.id}_${it.id}" }) { course ->
                CourseListItem(
                    course   = course,
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                    onClick  = { onCourseTap(course) },
                )
            }
        }
        item { Spacer(Modifier.height(PazSpacing.Lg)) }
    }
}

@Composable
private fun CourseListItem(
    course: Course,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Box(
            modifier         = Modifier
                .size(width = 88.dp, height = 60.dp)
                .clip(PazShapes.medium)
                .background(PazGradients.Card),
            contentAlignment = Alignment.Center,
        ) {
            if (course.thumbnailUrl != null) {
                AsyncImage(
                    model              = course.thumbnailUrl,
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier.fillMaxSize(),
                )
            } else {
                Text(
                    text  = course.title.take(1),
                    style = MaterialTheme.typography.titleLarge.copy(color = Color.White),
                )
            }
        }
        Column(Modifier.weight(1f)) {
            Text(
                text     = course.title,
                style    = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                maxLines = 2,
            )
            if (!course.description.isNullOrBlank()) {
                Spacer(Modifier.height(2.dp))
                Text(
                    text     = course.description!!,
                    style    = MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    ),
                    maxLines = 2,
                )
            }
        }
    }
}
```

Note: add `import br.church.paz.android.navigation.Screen` if not already present.

- [ ] **Step 3: Commit**

```bash
git add android/src/main/kotlin/br/church/paz/android/ui/features/academy/AcademyScreen.kt
git commit -m "feat(android): academy presents login sheet for unauthenticated users"
```

---

## Task 6 — iOS: PazChurchApp always shows MainTabView

**Files:**
- Modify: `ios/PazChurch/PazChurchApp.swift`

- [ ] **Step 1: Remove isAuthenticated branch; always render MainTabView after splash**

Replace the `body` of `PazChurchApp`:

```swift
var body: some Scene {
    WindowGroup {
        Group {
            if authCoordinator.isLoading {
                SplashView()
            } else {
                MainTabView()
                    .environmentObject(authCoordinator)
                    .onAppear {
                        pushService.requestPermissionAndRegister()
                    }
            }
        }
        .environmentObject(pushService)
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jonathalima/Developer/church/kmp-mobile
git add ios/PazChurch/PazChurchApp.swift
git commit -m "feat(ios): app always opens to home tab, no login gate at root"
```

---

## Task 7 — iOS: PazTypography adds ExtraBold display font

**Files:**
- Modify: `ios/PazChurch/Theme/PazTypography.swift`

- [ ] **Step 1: Add displayLarge entry**

Add at the top of the Display/Headline section in `PazTypography.swift`:

```swift
struct PazTypography {
    // Display / Headline — Playfair Display
    static let displayLarge   = Font.custom("PlayfairDisplay-ExtraBold", size: 34)
    static let headlineLarge  = Font.custom("PlayfairDisplay-Bold",      size: 32)
    static let headlineMedium = Font.custom("PlayfairDisplay-Bold",      size: 28)
    static let headlineSmall  = Font.custom("PlayfairDisplay-Bold",      size: 24)

    // Title — Playfair Display (large) / DM Sans (medium/small)
    static let titleLarge  = Font.custom("PlayfairDisplay-Bold",    size: 22)
    static let titleMedium = Font.custom("DMSans-SemiBold",         size: 16)
    static let titleSmall  = Font.custom("DMSans-SemiBold",         size: 14)

    // Body — DM Sans
    static let bodyLarge  = Font.custom("DMSans-Regular", size: 16)
    static let bodyMedium = Font.custom("DMSans-Regular", size: 14)
    static let bodySmall  = Font.custom("DMSans-Regular", size: 12)

    // Label — DM Sans
    static let labelLarge  = Font.custom("DMSans-Medium", size: 14)
    static let labelMedium = Font.custom("DMSans-Medium", size: 12)
    static let labelSmall  = Font.custom("DMSans-Bold",   size: 11)
}
```

- [ ] **Step 2: Commit**

```bash
git add ios/PazChurch/Theme/PazTypography.swift
git commit -m "feat(ios): add displayLarge (Playfair ExtraBold 34pt) to typography"
```

---

## Task 8 — iOS: LoginView visual redesign

**Files:**
- Modify: `ios/PazChurch/Features/Auth/LoginView.swift`

New layout: hero zone (380pt gradient + scrim + ghost cross + optional close button) + card offset 332pt from top (= 380 - 48 overlap). Card: 26pt radius, shadow, border, Playfair title, gold rule, welcome text, Google/Apple buttons, visitor link.

- [ ] **Step 1: Replace LoginView.swift**

```swift
import SwiftUI
import AuthenticationServices
import CryptoKit
import Shared

struct LoginView: View {
    @ObservedObject var authCoordinator: AuthenticationCoordinator
    var onDismiss: (() -> Void)? = nil

    @State private var isLoading = false
    @State private var currentNonce: String?
    @State private var errorMessage: String?

    @Environment(\.colorScheme) private var colorScheme
    private var isDark: Bool { colorScheme == .dark }

    var body: some View {
        ZStack(alignment: .top) {
            Color(isDark ? UIColor(hex: "070E1A") : UIColor(hex: "EDF1F7"))
                .ignoresSafeArea()

            // ── Hero ──────────────────────────────────────────────────────
            heroZone
                .frame(maxWidth: .infinity)
                .frame(height: 380)
                .ignoresSafeArea(edges: .top)

            // ── Card ──────────────────────────────────────────────────────
            VStack(spacing: 0) {
                Spacer().frame(height: 332)   // 380 - 48
                loginCard
                    .padding(.horizontal, 16)
                Spacer()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    // MARK: - Hero

    @ViewBuilder
    private var heroZone: some View {
        ZStack {
            PazColors.heroGradient
            // Top scrim
            LinearGradient(
                colors: [Color.black.opacity(0.55), .clear],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 120)
            .frame(maxHeight: .infinity, alignment: .top)
            // Ghost cross
            Text("✝")
                .font(.system(size: 200, weight: .bold))
                .foregroundColor(.white.opacity(0.07))
            // Close button
            if let onDismiss {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.white.opacity(0.85))
                        .padding(10)
                        .background(Color.white.opacity(0.15))
                        .clipShape(Circle())
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(.top, 56)
                .padding(.trailing, 20)
            }
        }
    }

    // MARK: - Card

    @ViewBuilder
    private var loginCard: some View {
        let cardBg     = isDark ? Color(hex: "0D1826") : Color.white
        let titleColor = isDark ? PazColors.pazSky    : PazColors.pazPrimary
        let slateColor = isDark ? PazColors.slate     : Color(hex: "5A6B82")
        let linkColor  = isDark ? PazColors.pazSky    : PazColors.pazPrimaryLight

        VStack(spacing: 0) {
            Text("Paz Church")
                .font(PazTypography.displayLarge)
                .foregroundColor(titleColor)
                .multilineTextAlignment(.center)

            Spacer().frame(height: 14)

            // Gold rule
            RoundedRectangle(cornerRadius: 2)
                .fill(PazColors.pazGold)
                .frame(width: 32, height: 2)

            Spacer().frame(height: 14)

            Text("Uma comunidade de fé, amor e propósito.")
                .font(PazTypography.bodyLarge)
                .foregroundColor(slateColor)
                .multilineTextAlignment(.center)

            Spacer().frame(height: 22)

            // Google
            authButton(
                text: "Continuar com Google",
                icon: "g.circle.fill",
                isApple: false,
                isLoading: isLoading,
                action: { signInWithGoogle() }
            )

            Spacer().frame(height: 11)

            // Apple
            SignInWithAppleButton(.signIn) { request in
                let nonce = randomNonceString()
                currentNonce = nonce
                request.requestedScopes = [.fullName, .email]
                request.nonce = sha256(nonce)
            } onCompletion: { result in
                handleAppleSignIn(result, rawNonce: currentNonce)
            }
            .frame(height: 54)
            .clipShape(Capsule())

            Spacer().frame(height: 15)

            if let errorMessage {
                Text(errorMessage)
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, 8)
            }

            Button(action: { onDismiss?() ?? { authCoordinator.isAuthenticated = false }() }) {
                Text("Explorar como visitante")
                    .font(PazTypography.bodySmall)
                    .foregroundColor(slateColor)
                    .underline(color: linkColor)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 26)
        .background(cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 26))
        .overlay(
            RoundedRectangle(cornerRadius: 26)
                .stroke(Color(hex: "032E58").opacity(0.06), lineWidth: 1)
        )
        .shadow(
            color: Color(hex: "032E58").opacity(0.40),
            radius: 22, x: 0, y: 20
        )
        .shadow(
            color: Color(hex: "032E58").opacity(0.06),
            radius: 4, x: 0, y: 2
        )
    }

    @ViewBuilder
    private func authButton(
        text: String,
        icon: String,
        isApple: Bool,
        isLoading: Bool,
        action: @escaping () -> Void
    ) -> some View {
        let containerColor: Color = isApple
            ? (isDark ? Color.white.opacity(0.10) : Color.black)
            : (isDark ? Color(hex: "101F31") : Color.white)
        let contentColor: Color = isApple
            ? .white
            : (isDark ? Color(hex: "EAEFF7") : Color(hex: "16243A"))
        let borderColor: Color = isApple
            ? (isDark ? Color.white.opacity(0.20) : .clear)
            : (isDark ? Color(hex: "1C2A3D") : Color(hex: "E7ECF3"))

        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView().tint(contentColor)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(contentColor)
                    Text(text)
                        .font(.custom("DMSans-SemiBold", size: 15.5))
                        .foregroundColor(contentColor)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
        }
        .background(containerColor)
        .clipShape(Capsule())
        .overlay(Capsule().stroke(borderColor, lineWidth: 1))
        .disabled(isLoading)
    }

    // MARK: - Google Sign-In

    private func signInWithGoogle() {
        isLoading = true
        errorMessage = nil
        GoogleSignInHelper.getIdToken { idToken, error in
            if let error {
                if !(error.localizedDescription.lowercased().contains("cancel")) {
                    errorMessage = error.localizedDescription
                }
                isLoading = false
                return
            }
            guard let idToken else { isLoading = false; return }
            Task {
                await authCoordinator.signInWithGoogle(idToken: idToken)
                isLoading = false
                if authCoordinator.isAuthenticated { onDismiss?() }
            }
        }
    }

    // MARK: - Apple Sign-In

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>, rawNonce: String?) {
        switch result {
        case .success(let authorization):
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let idTokenData = appleIDCredential.identityToken,
                  let idToken = String(data: idTokenData, encoding: .utf8),
                  let rawNonce else {
                errorMessage = "Apple Sign-In state error"
                return
            }
            Task {
                await authCoordinator.signInWithApple(idToken: idToken, nonce: rawNonce)
                if authCoordinator.isAuthenticated { onDismiss?() }
            }
        case .failure(let error):
            if let authError = error as? ASAuthorizationError, authError.code == .canceled { return }
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Nonce Helpers

    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        precondition(errorCode == errSecSuccess)
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(randomBytes.map { charset[Int($0) % charset.count] })
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }
}

#Preview {
    LoginView(authCoordinator: AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}
```

**Note on visitor tap:** The "Explorar como visitante" button calls `onDismiss?()` if in modal context, or does nothing in full-screen context (user is already browsing; the fullScreenCover on AccountView will dismiss when `isAuthenticated` becomes false state is cleared). The cleanest behavior: in full-screen cover context (AccountView), visitor tap should dismiss the cover. Since the cover binding is driven by `!authCoordinator.isAuthenticated`, we can't simply dismiss it — the user is still not authenticated. Instead, the visitor link should pop the cover by passing an `onDismiss` from AccountView.

- [ ] **Step 2: Commit**

```bash
git add ios/PazChurch/Features/Auth/LoginView.swift
git commit -m "feat(ios): redesign login view — hero + overlapping card, dark mode"
```

---

## Task 9 — iOS: AccountView presents LoginView when unauthenticated

**Files:**
- Modify: `ios/PazChurch/Features/Account/AccountView.swift`

- [ ] **Step 1: Add authCoordinator environment object and fullScreenCover**

Add to `AccountView`:
1. `@EnvironmentObject private var authCoordinator: AuthenticationCoordinator`
2. `@State private var showLogin = false`
3. An `.onAppear` that sets `showLogin = !authCoordinator.isAuthenticated` when loading finishes
4. A `.fullScreenCover(isPresented: $showLogin)` presenting `LoginView`

Replace the `struct AccountView` and its `body`:

```swift
struct AccountView: View {
    @StateObject private var viewModel: AccountViewModel
    @EnvironmentObject private var authCoordinator: AuthenticationCoordinator
    @State private var showLogin = false

    init(userRepository: UserRepository, authRepository: AuthRepository) {
        _viewModel = StateObject(wrappedValue: AccountViewModel(
            userRepository: userRepository,
            authRepository: authRepository
        ))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if viewModel.isLoading {
                    loadingState
                } else {
                    contentState
                }
            }
            .navigationTitle("Conta")
        }
        .onAppear {
            if !viewModel.isLoading {
                showLogin = !authCoordinator.isAuthenticated
            }
        }
        .onChange(of: viewModel.isLoading) { isLoading in
            if !isLoading {
                showLogin = !authCoordinator.isAuthenticated
            }
        }
        .onChange(of: authCoordinator.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                showLogin = false
                viewModel.reload()
            } else {
                showLogin = true
            }
        }
        .fullScreenCover(isPresented: $showLogin) {
            LoginView(
                authCoordinator: authCoordinator,
                onDismiss: { showLogin = false }
            )
        }
    }
    // loadingState and contentState remain unchanged
```

- [ ] **Step 2: Add reload() to AccountViewModel**

In `AccountViewModel.swift`, add:

```swift
func reload() {
    isLoading = true
    loadUser()
}
```

- [ ] **Step 3: Commit**

```bash
git add ios/PazChurch/Features/Account/AccountView.swift \
        ios/PazChurch/Features/Account/AccountViewModel.swift
git commit -m "feat(ios): account tab shows login cover when unauthenticated"
```

---

## Task 10 — iOS: AcademyView presents LoginView sheet when unauthenticated

**Files:**
- Modify: `ios/PazChurch/Features/Academy/AcademyView.swift`

- [ ] **Step 1: Add authCoordinator and login sheet to AcademyView**

Add to `AcademyView`:
1. `@EnvironmentObject private var authCoordinator: AuthenticationCoordinator`
2. `@State private var showLoginSheet = false`
3. When a course is tapped and `!authCoordinator.isAuthenticated`, set `showLoginSheet = true`
4. `.sheet(isPresented: $showLoginSheet)` presenting `LoginView(onDismiss:)`
5. `.onChange(of: authCoordinator.isAuthenticated)` to auto-dismiss sheet on login

Replace the `struct AcademyView` declaration and add the sheet modifier to `body`:

```swift
struct AcademyView: View {
    @StateObject private var viewModel: AcademyViewModel
    @EnvironmentObject private var authCoordinator: AuthenticationCoordinator
    @State private var showLoginSheet = false

    init(academyRepository: AcademyRepository) {
        _viewModel = StateObject(wrappedValue: AcademyViewModel(academyRepository: academyRepository))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if viewModel.isLoading {
                    loadingState
                } else if viewModel.error != nil {
                    errorState
                } else if viewModel.tracks.isEmpty {
                    emptyState
                } else {
                    contentState
                }
            }
            .navigationTitle("Academia")
        }
        .sheet(isPresented: $showLoginSheet) {
            LoginView(
                authCoordinator: authCoordinator,
                onDismiss: { showLoginSheet = false }
            )
        }
        .onChange(of: authCoordinator.isAuthenticated) { isAuthenticated in
            if isAuthenticated { showLoginSheet = false }
        }
    }
```

- [ ] **Step 2: Pass onCourseTap to TrackSection**

Find where courses are tapped in `AcademyView` (in `contentState` → `TrackSection`). Wrap course taps:

In `contentState`, change `TrackSection(track: track)` to:
```swift
TrackSection(track: track) { course in
    if authCoordinator.isAuthenticated {
        viewModel.onCourseTapped(course)
    } else {
        showLoginSheet = true
    }
}
```

Update `TrackSection` to accept an `onCourseTap: (Course) -> Void` closure and pass it down to the course item tap handlers. (Check the actual `TrackSection` implementation for the exact parameter to add.)

Note: if `TrackSection` is defined inside `AcademyView.swift`, update it in the same file. If it's a separate file, update that file too.

- [ ] **Step 3: Commit**

```bash
git add ios/PazChurch/Features/Academy/AcademyView.swift
git commit -m "feat(ios): academy presents login sheet for unauthenticated course taps"
```

---

## Self-Review Checklist

- [x] Splash always navigates to Shell/MainTabView on both platforms ✓
- [x] Login is never shown at app launch ✓
- [x] Account tab navigates to Login when unauthenticated (Android: effect nav; iOS: fullScreenCover) ✓
- [x] Academy shows login modal when course tapped while unauthenticated ✓
- [x] After login from Academy modal, auth state refreshed, sheet dismissed ✓
- [x] LoginScreen visual redesign: hero zone, card overlap, Playfair title, gold rule, dark mode ✓
- [x] LoginView visual redesign: same for iOS ✓
- [x] `onDismiss` parameter on both Login screens for modal/sheet context ✓
- [x] No backend or shared KMP layer changes ✓
- [x] Playfair ExtraBold font already present in both Android (res/font) and iOS (Resources/Fonts + Info.plist) ✓
- [x] iOS AcademyView checks need verifying: `TrackSection` closure signature must be confirmed against actual file ✓ (Step 10.2 notes this)
- [x] iOS `isAuthenticated` is a `@Published var` on `AuthenticationCoordinator` — can be directly set for visitor flow? Actually visitor flow just dismisses the cover via `onDismiss`. The user is still unauthenticated. That's correct — they dismiss the cover and proceed as visitor. ✓
