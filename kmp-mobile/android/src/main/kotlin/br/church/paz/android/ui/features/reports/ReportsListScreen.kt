package br.church.paz.android.ui.features.reports

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazMenuRow
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel

@Composable
fun ReportsListScreen(
    navController: NavController,
    viewModel: ReportsListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                ReportsListEffect.NavigateToCasaDePaz ->
                    navController.navigate(Screen.CasaDePazSubmissionsList.route)
                ReportsListEffect.NavigateToLifeGroupAnalytics ->
                    navController.navigate(Screen.LifeGroupAnalytics.createRoute())
                ReportsListEffect.NavigateToCasaDePazAnalytics ->
                    navController.navigate(Screen.CasaDePazAnalytics.route)
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding(),
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Voltar", tint = Color.White)
                }
                Text(
                    "Relatórios",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    modifier = Modifier.weight(1f),
                )
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background)
                .padding(PazSpacing.Lg),
        ) {
            if (uiState.isLoading) {
                Column {
                    repeat(2) { PazSkeleton(height = 56.dp) }
                }
            } else {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(PazShapes.large)
                        .background(MaterialTheme.colorScheme.surface),
                ) {
                    PazMenuRow(
                        title = "Casa de Paz",
                        icon = Icons.Outlined.Home,
                        iconTint = Color(0xFFE65100),
                        onClick = viewModel::onCasaDePaz,
                        showDivider = uiState.isLeader,
                    )
                    if (uiState.isLeader) {
                        PazMenuRow(
                            title = "Life Group",
                            icon = Icons.Outlined.BarChart,
                            iconTint = PazColors.PrimaryMid,
                            onClick = viewModel::onLifeGroupAnalytics,
                            showDivider = true,
                        )
                        PazMenuRow(
                            title = "Análise Casa de Paz",
                            icon = Icons.Outlined.BarChart,
                            iconTint = Color(0xFFE65100),
                            onClick = viewModel::onCasaDePazAnalytics,
                            showDivider = false,
                        )
                    }
                }
            }
        }
    }
}
