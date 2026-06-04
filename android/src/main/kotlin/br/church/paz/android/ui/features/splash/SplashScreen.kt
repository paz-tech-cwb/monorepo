package br.church.paz.android.ui.features.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel

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

    Box(
        modifier         = Modifier.fillMaxSize().background(PazGradients.Hero),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier            = Modifier.statusBarsPadding(),
        ) {
            Text(
                text  = "✝",
                style = MaterialTheme.typography.displayLarge.copy(
                    color = Color.White.copy(alpha = 0.15f),
                ),
            )
            Spacer(Modifier.height(PazSpacing.Md))
            Text(
                text  = "Paz Church",
                style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
            )
        }
    }
}
