package br.church.paz.android.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazSpacing

data class PazNavItem(
    val icon: ImageVector,
    val label: String,
)

@Composable
fun PazBottomNavBar(
    items: List<PazNavItem>,
    selectedIndex: Int,
    onItemSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    NavigationBar(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
        tonalElevation = 0.dp,
    ) {
        items.forEachIndexed { index, item ->
            val selected = index == selectedIndex
            NavigationBarItem(
                selected = selected,
                onClick = { onItemSelected(index) },
                icon = {
                    AnimatedContent(
                        targetState = selected,
                        transitionSpec = { fadeIn() togetherWith fadeOut() },
                        label = "nav_$index",
                    ) { isSelected ->
                        if (isSelected) {
                            Row(
                                modifier =
                                    Modifier
                                        .clip(PazShapePill)
                                        .background(MaterialTheme.colorScheme.primary)
                                        .padding(horizontal = PazSpacing.Md, vertical = 7.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    item.icon,
                                    contentDescription = item.label,
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier.size(20.dp),
                                )
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    item.label,
                                    style =
                                        MaterialTheme.typography.labelSmall.copy(
                                            color = MaterialTheme.colorScheme.onPrimary,
                                            fontSize = 11.sp,
                                            letterSpacing = 0.sp,
                                        ),
                                )
                            }
                        } else {
                            Icon(
                                item.icon,
                                contentDescription = item.label,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                            )
                        }
                    }
                },
                label = null,
                colors = NavigationBarItemDefaults.colors(indicatorColor = androidx.compose.ui.graphics.Color.Transparent),
            )
        }
    }
}
