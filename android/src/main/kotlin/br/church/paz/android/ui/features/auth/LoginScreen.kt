package br.church.paz.android.ui.features.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazButtonVariant
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    Box(Modifier.fillMaxSize().background(PazGradients.Hero)) {
        Column(
            modifier            = Modifier.fillMaxSize().padding(PazSpacing.Xl),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("Paz Church", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White))
            Spacer(Modifier.height(PazSpacing.Xxxl))
            PazButton(text = "Continuar com Google", onClick = { /* TODO Phase 2 */ })
            Spacer(Modifier.height(PazSpacing.Md))
            PazButton(text = "Continuar com Apple", onClick = { /* TODO Phase 2 */ }, variant = PazButtonVariant.Secondary)
        }
    }
}
