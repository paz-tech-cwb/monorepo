package br.church.paz.android.ui.features.relatorios

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing

private data class ReportItem(
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val title: String,
    val description: String,
    val route: String,
)

private val REPORTS =
    listOf(
        ReportItem(
            icon = Icons.Outlined.BarChart,
            title = "Life Groups Frequency and Distribution",
            description =
                "Veja quantos membros compareceram a cada reunião, a taxa de presença por mês, " +
                    "and how Life Groups are distributed por dia, horário, bairro e cidade.",
            route = Screen.LifeGroupAnalytics.createRoute(),
        ),
    )

/**
 * Top-level "Relatórios" tab — visible to admins/pastors only. Lists every
 * available report with a short explanation of what it shows, rather than
 * dropping straight into a single report screen, so the tab can grow to
 * hold more reports later without changing its navigation shape.
 */
@Composable
fun RelatoriosListScreen(
    navController: NavController,
    contentPadding: PaddingValues = PaddingValues(),
) {
    Scaffold { innerPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(innerPadding),
            contentPadding = contentPadding,
        ) {
            item {
                Text(
                    "Relatórios",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(PazSpacing.Lg),
                )
            }
            items(REPORTS) { report ->
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm)
                            .clip(PazShapes.large)
                            .background(MaterialTheme.colorScheme.surface)
                            .clickable { navController.navigate(report.route) }
                            .padding(PazSpacing.Lg),
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    verticalAlignment = Alignment.Top,
                ) {
                    Box(
                        Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(PazColors.Primary.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(report.icon, contentDescription = null, tint = PazColors.Primary)
                    }
                    Column(Modifier.weight(1f)) {
                        Text(report.title, style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            report.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        )
                    }
                    Icon(
                        Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                    )
                }
            }
            item { Spacer(Modifier.height(PazSpacing.Xl)) }
        }
    }
}
