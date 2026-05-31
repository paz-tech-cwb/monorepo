package br.church.paz.android.ui.features.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing
import kotlinx.coroutines.delay
import org.koin.compose.koinInject
import br.church.paz.shared.domain.repository.AuthRepository

@Composable
fun SplashScreen(
    onNavigateToLogin: () -> Unit,
    onNavigateToHome: () -> Unit,
    authRepository: AuthRepository = koinInject(),
) {
    LaunchedEffect(Unit) {
        delay(800)
        if (authRepository.currentUser() != null) onNavigateToHome() else onNavigateToLogin()
    }
    Box(
        modifier          = Modifier.fillMaxSize().background(PazGradients.Hero),
        contentAlignment  = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("✝", style = MaterialTheme.typography.displayLarge.copy(color = Color.White.copy(alpha = 0.15f)))
            Spacer(Modifier.height(PazSpacing.Md))
            Text("Paz Church", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White))
        }
    }
}
