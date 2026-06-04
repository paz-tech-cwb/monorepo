package br.church.paz.android.ui.features.auth

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
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

/**
 * Full-screen login (standalone route or bottom sheet).
 * For embedding inside another tab (tab bar stays visible), use [isEmbedded] = true.
 */
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onDismiss: (() -> Unit)? = null,
    isEmbedded: Boolean = false,
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
                LoginEffect.NavigateToHome  -> onLoginSuccess()
                is LoginEffect.ShowError    -> snackbarHostState.showSnackbar(effect.message)
            }
        }
    }

    val onGoogleClick: () -> Unit = {
        scope.launch {
            val helper = GoogleSignInHelper(context)
            helper.getIdToken(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                .onSuccess { viewModel.onGoogleSignIn(it) }
                .onFailure { e ->
                    if (e.message?.contains("cancel", ignoreCase = true) == false) {
                        snackbarHostState.showSnackbar(e.message ?: "Erro ao entrar com Google.")
                    }
                }
        }
    }

    val onAppleClick: () -> Unit = run@{
        val provider = OAuthProvider.newBuilder("apple.com")
            .setScopes(listOf("email", "name"))
            .build()
        val activity = context as? Activity ?: return@run
        FirebaseAuth.getInstance()
            .startActivityForSignInWithProvider(activity, provider)
            .addOnSuccessListener { result ->
                scope.launch {
                    result.user?.getIdToken(false)?.await()?.token?.let { viewModel.onAppleSignIn(it) }
                }
            }
            .addOnFailureListener { e ->
                if (e.message?.contains("cancel", ignoreCase = true) == false) {
                    scope.launch { snackbarHostState.showSnackbar(e.message ?: "Erro ao entrar com Apple.") }
                }
            }
    }

    if (isEmbedded) {
        // ── Embedded: card only, tab bar stays visible ─────────────────────
        Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            Column(
                modifier              = Modifier.fillMaxSize().padding(vertical = 32.dp),
                horizontalAlignment   = Alignment.CenterHorizontally,
                verticalArrangement   = Arrangement.Center,
            ) {
                LoginCard(
                    isLoading = uiState.isLoading,
                    isDark    = isDark,
                    onGoogle  = onGoogleClick,
                    onApple   = onAppleClick,
                    onVisitor = { onLoginSuccess() },
                )
            }
            SnackbarHost(
                hostState = snackbarHostState,
                modifier  = Modifier.align(Alignment.BottomCenter),
            ) { data ->
                Snackbar(snackbarData = data,
                    containerColor = MaterialTheme.colorScheme.errorContainer,
                    contentColor   = MaterialTheme.colorScheme.onErrorContainer)
            }
        }
    } else {
        // ── Full-screen: hero + overlapping card ────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(380.dp)
                    .background(PazGradients.Hero),
            ) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(120.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(PazColors.DarkBackground.copy(alpha = 0.55f), Color.Transparent),
                            ),
                        )
                )
                Text(
                    text  = "✝",
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontSize = 200.sp,
                        color    = Color.White.copy(alpha = 0.07f),
                    ),
                    modifier = Modifier.align(Alignment.Center),
                )
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

            Column(Modifier.fillMaxSize()) {
                Spacer(Modifier.height(332.dp))
                LoginCard(
                    isLoading = uiState.isLoading,
                    isDark    = isDark,
                    onGoogle  = onGoogleClick,
                    onApple   = onAppleClick,
                    onVisitor = { onLoginSuccess() },
                )
                Spacer(Modifier.weight(1f))
                Spacer(Modifier.navigationBarsPadding())
            }

            SnackbarHost(
                hostState = snackbarHostState,
                modifier  = Modifier.align(Alignment.BottomCenter).navigationBarsPadding(),
            ) { data ->
                Snackbar(snackbarData = data,
                    containerColor = MaterialTheme.colorScheme.errorContainer,
                    contentColor   = MaterialTheme.colorScheme.onErrorContainer)
            }
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
    val cardBg     = if (isDark) PazColors.DarkSurface else Color.White
    val titleColor = if (isDark) PazColors.Accent      else PazColors.Primary
    val slateColor = if (isDark) PazColors.DarkSlate   else PazColors.Slate

    Box(
        modifier = Modifier
            .padding(horizontal = 20.dp)
            .shadow(
                elevation    = 20.dp,
                shape        = CardShape,
                ambientColor = PazColors.Primary.copy(alpha = 0.25f),
                spotColor    = PazColors.Primary.copy(alpha = 0.40f),
            )
            .background(cardBg, CardShape)
            .border(1.dp, PazColors.Primary.copy(alpha = 0.06f), CardShape)
            .padding(horizontal = 24.dp, vertical = 26.dp),
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text      = "Paz Church",
                style     = MaterialTheme.typography.displayLarge.copy(
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

            AuthButton(
                text      = "Continuar com Google",
                icon      = "G",
                isLoading = isLoading,
                isDark    = isDark,
                isApple   = false,
                onClick   = onGoogle,
            )
            Spacer(Modifier.height(11.dp))
            AuthButton(
                text    = "Continuar com Apple",
                icon    = "",
                isLoading = false,
                isDark  = isDark,
                isApple = true,
                onClick = onApple,
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
    isApple: Boolean,
    onClick: () -> Unit,
) {
    val containerColor = when {
        isApple && isDark -> Color.White.copy(alpha = 0.10f)
        isApple           -> Color.Black
        isDark            -> PazColors.DarkCard2
        else              -> Color.White
    }
    val contentColor = when {
        isApple -> Color.White
        isDark  -> PazColors.OnDarkButton
        else    -> PazColors.OnSurface
    }
    val borderColor = when {
        isApple && isDark -> Color.White.copy(alpha = 0.20f)
        isApple           -> Color.Transparent
        isDark            -> PazColors.DarkButtonBorder
        else              -> PazColors.LightButtonBorder
    }

    Row(
        modifier              = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(PazShapePill)
            .background(containerColor)
            .border(1.dp, borderColor, PazShapePill)
            .clickable(enabled = !isLoading, onClick = onClick)
            .padding(horizontal = PazSpacing.Xl),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        if (isLoading && !isApple) {
            CircularProgressIndicator(
                modifier    = Modifier.size(20.dp),
                color       = contentColor,
                strokeWidth = 2.dp,
            )
        } else {
            Text(
                text  = icon,
                style = MaterialTheme.typography.titleMedium.copy(color = contentColor),
            )
            Spacer(Modifier.width(PazSpacing.Sm))
            Text(
                text  = text,
                style = MaterialTheme.typography.titleMedium.copy(color = contentColor),
            )
        }
    }
}
