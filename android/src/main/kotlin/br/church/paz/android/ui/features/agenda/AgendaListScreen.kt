package br.church.paz.android.ui.features.agenda

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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazSectionHeader
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AgendaEvent
import org.koin.androidx.compose.koinViewModel

@Composable
fun AgendaListScreen(
    navController: NavController,
    viewModel: AgendaListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxWidth().background(PazGradients.Hero).statusBarsPadding()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White)
                }
                Text("Agenda", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White), modifier = Modifier.weight(1f))
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading -> AgendaListSkeleton()
                uiState.events.isEmpty() ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Text("Nenhum evento disponível", style = MaterialTheme.typography.bodyMedium)
                    }
                else ->
                    AgendaEventList(
                        events = uiState.events,
                        onTap = { navController.navigate(Screen.AgendaDetail.createRoute(it.id)) },
                    )
            }
        }
    }
}

@Composable
private fun AgendaEventList(
    events: List<AgendaEvent>,
    onTap: (AgendaEvent) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item {
            Spacer(Modifier.height(PazSpacing.Md))
            PazSectionHeader("Próximos eventos")
        }
        items(events, key = { it.id }) { event ->
            AgendaEventCard(event = event, onClick = { onTap(event) })
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun AgendaEventCard(
    event: AgendaEvent,
    onClick: () -> Unit,
) {
    val parts = event.startDate.split("-")
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onClick)
                .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Column(
            Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(PazColors.Primary.copy(.08f)),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(parts.getOrNull(2) ?: "--", style = MaterialTheme.typography.titleMedium.copy(color = PazColors.Primary))
            Text(monthAbbrev(parts.getOrNull(1)), style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Accent))
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(event.title, style = MaterialTheme.typography.titleSmall, maxLines = 2)
            if (!event.location.isNullOrEmpty()) {
                Text(
                    event.location!!,
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)),
                    maxLines = 1,
                )
            }
        }
        Box(Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(PazColors.Primary))
    }
}

private fun monthAbbrev(m: String?) =
    when (m) {
        "01" -> "JAN"
        "02" -> "FEV"
        "03" -> "MAR"
        "04" -> "ABR"
        "05" -> "MAI"
        "06" -> "JUN"
        "07" -> "JUL"
        "08" -> "AGO"
        "09" -> "SET"
        "10" -> "OUT"
        "11" -> "NOV"
        "12" -> "DEZ"
        else -> "???"
    }

@Composable
private fun AgendaListSkeleton() {
    LazyColumn(
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(top = PazSpacing.Lg),
    ) {
        repeat(6) { item { PazSkeleton(height = 72.dp) } }
    }
}
