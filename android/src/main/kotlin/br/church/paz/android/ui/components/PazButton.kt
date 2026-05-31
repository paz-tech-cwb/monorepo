package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazShapePill

enum class PazButtonVariant { Primary, Secondary, Destructive, Ghost }

@Composable
fun PazButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: PazButtonVariant = PazButtonVariant.Primary,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val colors = when (variant) {
        PazButtonVariant.Primary -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor   = MaterialTheme.colorScheme.onPrimary,
        )
        PazButtonVariant.Secondary -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
            contentColor   = MaterialTheme.colorScheme.secondary,
        )
        PazButtonVariant.Destructive -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.errorContainer,
            contentColor   = MaterialTheme.colorScheme.error,
        )
        PazButtonVariant.Ghost -> ButtonDefaults.buttonColors(
            containerColor = androidx.compose.ui.graphics.Color.Transparent,
            contentColor   = MaterialTheme.colorScheme.primary,
        )
    }
    Button(
        onClick  = { if (!loading) onClick() },
        modifier = modifier,
        enabled  = enabled && !loading,
        shape    = PazShapePill,
        colors   = colors,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier    = Modifier.size(18.dp),
                color       = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp,
            )
        } else {
            Text(text = text, style = MaterialTheme.typography.titleMedium)
        }
    }
}
