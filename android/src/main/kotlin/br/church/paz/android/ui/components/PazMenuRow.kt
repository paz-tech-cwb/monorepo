package br.church.paz.android.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazSpacing

@Composable
fun PazMenuRow(
    title: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    trailing: @Composable (() -> Unit)? = null,
    showDivider: Boolean = true,
    tintIcon: Boolean = true,
) {
    Row(
        modifier          = modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier         = Modifier.size(34.dp),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector        = icon,
                contentDescription = null,
                modifier           = Modifier.size(20.dp),
                tint               = if (tintIcon) MaterialTheme.colorScheme.primary
                                     else MaterialTheme.colorScheme.error,
            )
        }
        Spacer(Modifier.width(PazSpacing.Md))
        Text(
            text     = title,
            style    = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f),
            color    = if (tintIcon) MaterialTheme.colorScheme.onSurface
                       else MaterialTheme.colorScheme.error,
        )
        if (trailing != null) {
            trailing()
        } else if (onClick != null) {
            Icon(
                imageVector        = Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint               = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                modifier           = Modifier.size(20.dp),
            )
        }
    }
    if (showDivider) {
        HorizontalDivider(
            modifier  = Modifier.padding(start = PazSpacing.Lg + 34.dp + PazSpacing.Md),
            color     = MaterialTheme.colorScheme.outline,
            thickness = 0.5.dp,
        )
    }
}
