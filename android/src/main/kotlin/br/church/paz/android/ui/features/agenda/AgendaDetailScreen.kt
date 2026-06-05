package br.church.paz.android.ui.features.agenda

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazGoldBadge
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AgendaEvent
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
fun AgendaDetailScreen(
    navController: NavController,
    eventId: String,
    viewModel: AgendaDetailViewModel = koinViewModel(parameters = { parametersOf(eventId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                AgendaDetailEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    when {
        uiState.isLoading -> LoadingState()
        uiState.error != null -> ErrorState(error = uiState.error!!, onRetry = viewModel::onRetry)
        uiState.event != null -> ContentState(event = uiState.event!!, onBack = viewModel::onBack)
    }
}

@Composable
private fun ContentState(
    event: AgendaEvent,
    onBack: () -> Unit,
) {
    var selectedTab by remember { mutableStateOf("geral") }

    Box(Modifier.fillMaxSize()) {
        // Hero area (300dp)
        Box(
            Modifier
                .fillMaxWidth()
                .height(300.dp)
                .background(PazGradients.Hero)
                .statusBarsPadding(),
        ) {
            Icon(
                Icons.Outlined.Favorite,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.08f),
                modifier = Modifier.size(180.dp).align(Alignment.Center),
            )
            Box(
                Modifier
                    .padding(PazSpacing.Md)
                    .size(40.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color.White.copy(.18f))
                    .clickable(onClick = onBack)
                    .align(Alignment.TopStart),
                Alignment.Center,
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White, modifier = Modifier.size(20.dp))
            }
            Column(
                Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = PazSpacing.Lg, end = PazSpacing.Lg, bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
            ) {
                PazGoldBadge(text = event.startDate.take(8).uppercase())
                Text(event.title, style = MaterialTheme.typography.headlineMedium.copy(color = Color.White))
            }
        }

        // Body card overlapping hero
        Box(
            Modifier
                .fillMaxSize()
                .padding(top = 280.dp)
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            LazyColumn(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
                item { Spacer(Modifier.height(PazSpacing.Lg)) }

                // Meta chips
                item {
                    Row(Modifier.padding(horizontal = PazSpacing.Lg), horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                        MetaChip(icon = Icons.Outlined.CalendarToday, label = "${event.startDate} — ${event.endDate ?: event.startDate}")
                        if (!event.location.isNullOrEmpty()) {
                            MetaChip(icon = Icons.Outlined.LocationOn, label = event.location!!)
                        }
                    }
                }

                // Tab bar
                item {
                    Row(Modifier.padding(horizontal = PazSpacing.Lg), horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xl)) {
                        listOf("geral" to "Geral", "info" to "Informações").forEach { (key, label) ->
                            Column(Modifier.clickable { selectedTab = key }, horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    label,
                                    style =
                                        MaterialTheme.typography.titleSmall.copy(
                                            color =
                                                if (selectedTab ==
                                                    key
                                                ) {
                                                    PazColors.Primary
                                                } else {
                                                    MaterialTheme.colorScheme.onSurface.copy(.5f)
                                                },
                                        ),
                                )
                                Spacer(Modifier.height(6.dp))
                                Box(
                                    Modifier
                                        .height(2.5.dp)
                                        .size(width = 48.dp, height = 2.5.dp)
                                        .background(if (selectedTab == key) PazColors.Primary else Color.Transparent),
                                )
                            }
                        }
                    }
                }

                // Tab content
                if (selectedTab == "geral") {
                    if (!event.description.isNullOrEmpty()) {
                        item {
                            Column(Modifier.padding(horizontal = PazSpacing.Lg)) {
                                Text("Descrição", style = MaterialTheme.typography.titleSmall)
                                Spacer(Modifier.height(PazSpacing.Sm))
                                Text(event.description!!, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                } else {
                    item {
                        Column(Modifier.padding(horizontal = PazSpacing.Lg)) {
                            Text("Detalhes do Evento", style = MaterialTheme.typography.titleSmall)
                            Spacer(Modifier.height(PazSpacing.Sm))
                            Text("Informações adicionais em breve.", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }

                // CTA
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = PazSpacing.Lg)
                            .height(56.dp)
                            .shadow(
                                12.dp,
                                RoundedCornerShape(16.dp),
                                ambientColor = PazColors.PrimaryMid.copy(.4f),
                                spotColor = PazColors.PrimaryMid.copy(.4f),
                            ).clip(RoundedCornerShape(16.dp))
                            .background(Brush.horizontalGradient(listOf(PazColors.PrimaryMid, PazColors.PrimaryLight)))
                            .clickable { },
                        Alignment.Center,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                            Icon(Icons.Outlined.Favorite, null, tint = Color.White, modifier = Modifier.size(20.dp))
                            Text("Confirmar presença", style = MaterialTheme.typography.titleSmall.copy(color = Color.White))
                        }
                    }
                    Spacer(Modifier.height(PazSpacing.Xl))
                }
            }
        }
    }
}

@Composable
private fun MetaChip(
    icon: ImageVector,
    label: String,
) {
    Row(
        modifier =
            Modifier
                .clip(
                    RoundedCornerShape(50.dp),
                ).background(MaterialTheme.colorScheme.surface)
                .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(icon, null, tint = PazColors.Primary, modifier = Modifier.size(14.dp))
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun ErrorState(
    error: String,
    onRetry: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Text(error, style = MaterialTheme.typography.bodySmall)
            PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun LoadingState() {
    Column(Modifier.fillMaxSize().padding(PazSpacing.Xl), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
        PazSkeleton(height = 300.dp)
        PazSkeleton(height = 32.dp)
        PazSkeleton(height = 120.dp)
    }
}
