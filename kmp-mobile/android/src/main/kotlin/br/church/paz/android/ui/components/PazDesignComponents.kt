package br.church.paz.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazColors

/** 38 dp tinted icon container used in Conta / Formulários rows. */
@Composable
fun PazIconContainer(
    icon: ImageVector,
    tint: Color,
    modifier: Modifier = Modifier,
    size: Dp = 38.dp,
) {
    Box(
        modifier =
            modifier
                .size(size)
                .clip(RoundedCornerShape(12.dp))
                .background(tint.copy(alpha = 0.14f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(size * 0.53f))
    }
}

/** Gold pill badge — "Gratuito", event time labels. */
@Composable
fun PazGoldBadge(
    text: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier =
            modifier
                .clip(RoundedCornerShape(50.dp))
                .background(PazColors.Gold)
                .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text = text,
            style =
                MaterialTheme.typography.labelSmall.copy(
                    color = PazColors.GoldOnBadge,
                    fontWeight = FontWeight.Bold,
                ),
        )
    }
}

/** Selectable pill chip for filter bars. */
@Composable
fun PazPillChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val bg = if (selected) PazColors.Primary else MaterialTheme.colorScheme.surface
    val fg = if (selected) Color.White else MaterialTheme.colorScheme.onSurface
    Box(
        modifier =
            modifier
                .height(38.dp)
                .clip(RoundedCornerShape(50.dp))
                .background(bg)
                .then(
                    if (!selected) {
                        Modifier.border(1.dp, PazColors.Primary.copy(0.18f), RoundedCornerShape(50.dp))
                    } else {
                        Modifier
                    },
                ).clickable(onClick = onClick)
                .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium.copy(color = fg, fontWeight = FontWeight.SemiBold),
        )
    }
}
