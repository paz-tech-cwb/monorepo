package br.church.paz.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing

/**
 * Ink-filled pill button matching the visual treatment of the
 * "Confirmar presença" CTA on the agenda detail screen — gradient fill,
 * drop shadow, white icon + label. Use for primary surface-level actions
 * that should read as the same "confirm" affordance across the app.
 */
@Composable
fun PazPillPrimaryButton(
    text: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        modifier =
            modifier
                .fillMaxWidth()
                .height(56.dp)
                .shadow(
                    12.dp,
                    RoundedCornerShape(16.dp),
                    ambientColor = PazColors.PrimaryMid.copy(alpha = 0.4f),
                    spotColor = PazColors.PrimaryMid.copy(alpha = 0.4f),
                ),
        shape = RoundedCornerShape(16.dp),
        color = Color.Transparent,
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .background(Brush.horizontalGradient(listOf(PazColors.PrimaryMid, PazColors.PrimaryLight))),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                Icon(icon, null, tint = Color.White, modifier = Modifier.size(20.dp))
                Text(text, style = MaterialTheme.typography.titleSmall.copy(color = Color.White))
            }
        }
    }
}
