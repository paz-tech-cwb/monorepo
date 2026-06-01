package br.church.paz.android.ui.features.auth

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cwb.pazchurch.app.BuildConfig
import br.church.paz.android.auth.GoogleSignInHelper
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.OAuthProvider
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.koin.androidx.compose.koinViewModel

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LoginEffect.NavigateToHome    -> onLoginSuccess()
                is LoginEffect.ShowError      -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PazGradients.Hero),
    ) {
        // Decorative orbs
        Box(
            Modifier
                .size(320.dp)
                .align(Alignment.TopEnd)
                .background(
                    Color.White.copy(alpha = 0.05f),
                    androidx.compose.foundation.shape.CircleShape,
                )
        )

        Column(
            modifier            = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Xl),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.weight(1f))

            // Wordmark
            Text(
                text  = "✝",
                style = MaterialTheme.typography.displayLarge.copy(
                    color = Color.White.copy(alpha = 0.12f),
                ),
            )
            Spacer(Modifier.height(PazSpacing.Md))
            Text(
                text  = "Paz Church",
                style = MaterialTheme.typography.displayLarge.copy(color = Color.White),
            )
            Text(
                text  = "CURITIBA",
                style = MaterialTheme.typography.labelSmall.copy(
                    color = Color.White.copy(alpha = 0.4f),
                ),
            )

            Spacer(Modifier.height(PazSpacing.Md))
            Box(
                Modifier
                    .width(36.dp)
                    .height(1.5.dp)
                    .background(Color.White.copy(alpha = 0.2f))
            )
            Spacer(Modifier.height(PazSpacing.Md))
            Text(
                text      = "Uma comunidade de fé, amor e propósito.",
                style     = MaterialTheme.typography.bodyMedium.copy(
                    color = Color.White.copy(alpha = 0.55f),
                ),
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.weight(1f))

            // ── Sign-in buttons ──────────────────────────────────────────
            SignInButton(
                text     = "Continuar com Google",
                icon     = "G",
                enabled  = !uiState.isLoading,
                loading  = uiState.isLoading,
                primary  = true,
                onClick  = {
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
            )

            Spacer(Modifier.height(PazSpacing.Md))

            SignInButton(
                text    = "Continuar com Apple",
                icon    = "",
                enabled = !uiState.isLoading,
                loading = false,
                primary = false,
                onClick = {
                    // Apple Sign-In uses FirebaseAuth's OAuthProvider on Android
                    // (redirects through a browser tab, no native SDK needed)
                    val provider = OAuthProvider.newBuilder("apple.com")
                        .setScopes(listOf("email", "name"))
                        .build()
                    val activity = context as? Activity ?: return@SignInButton
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
            )

            Spacer(Modifier.height(PazSpacing.Lg))

            Text(
                text  = "Explorar como visitante",
                style = MaterialTheme.typography.bodySmall.copy(
                    color          = Color.White.copy(alpha = 0.38f),
                    textDecoration = TextDecoration.Underline,
                ),
                modifier = Modifier
                    .clip(PazShapes.small)
                    .clickable(enabled = !uiState.isLoading, onClick = onLoginSuccess),
            )

            Spacer(Modifier.height(PazSpacing.Xxxl))
            Spacer(Modifier.navigationBarsPadding())
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier  = Modifier.align(Alignment.BottomCenter).navigationBarsPadding(),
        ) { data ->
            Snackbar(
                snackbarData    = data,
                containerColor  = MaterialTheme.colorScheme.errorContainer,
                contentColor    = MaterialTheme.colorScheme.onErrorContainer,
            )
        }
    }
}

@Composable
private fun SignInButton(
    text: String,
    icon: String,
    enabled: Boolean,
    loading: Boolean,
    primary: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val containerColor = if (primary) Color.White else Color.White.copy(alpha = 0.11f)
    val contentColor   = if (primary) PazColors.Primary else Color.White
    val borderMod      = if (primary) Modifier
    else Modifier.border(1.5.dp, Color.White.copy(alpha = 0.22f), PazShapePill)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(PazShapePill)
            .background(containerColor)
            .then(borderMod)
            .clickable(enabled = enabled && !loading, onClick = onClick)
            .padding(horizontal = PazSpacing.Xl),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
    ) {
        if (loading) {
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
                    fontFamily = br.church.paz.android.ui.theme.DmSans,
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
