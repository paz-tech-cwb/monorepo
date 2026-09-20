package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazSpacing

private val SuccessGreen = Color(0xFF28A745)

/**
 * Shown after any dynamic form submits successfully — without this, the screen used to just
 * show a snackbar and instantly pop back, giving no real confirmation the submission went
 * through. Reused by every form via `FormStepScreen`.
 */
@Composable
fun PazSuccessState(
    onDone: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = "Enviado com sucesso!",
    message: String = "Seu formulário foi registrado.",
    contentPadding: PaddingValues = PaddingValues(PazSpacing.Lg),
) {
    Box(
        modifier
            .fillMaxSize()
            .padding(contentPadding),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            Icon(
                Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = SuccessGreen,
                modifier = Modifier.size(72.dp),
            )
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(
                message,
                style =
                    MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    ),
            )
            PazButton(text = "Concluir", onClick = onDone, modifier = Modifier.fillMaxWidth())
        }
    }
}
