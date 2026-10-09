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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazGoldBadge
import br.church.paz.android.ui.components.PazPillPrimaryButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AgendaEvent
import coil3.compose.AsyncImage
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf
import java.time.LocalDateTime

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

// "Confirmar presença" is hidden for now — kept in code, not deleted, in case
// the feature is re-enabled later.
private const val ATTENDANCE_CONFIRMATION_ENABLED = false

@Composable
private fun ContentState(
    event: AgendaEvent,
    onBack: () -> Unit,
) {
    Box(Modifier.fillMaxSize()) {
        // Hero area (300dp)
        Box(
            Modifier
                .fillMaxWidth()
                .height(300.dp)
                .background(PazGradients.Hero)
                .statusBarsPadding(),
        ) {
            if (!event.imageUrl.isNullOrEmpty()) {
                AsyncImage(
                    model = event.imageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.matchParentSize(),
                )
                Box(
                    Modifier
                        .matchParentSize()
                        .background(Brush.verticalGradient(listOf(Color.Black.copy(.3f), Color.Black.copy(.7f)))),
                )
            } else {
                Icon(
                    Icons.Outlined.Favorite,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.08f),
                    modifier = Modifier.size(180.dp).align(Alignment.Center),
                )
            }
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
                PazGoldBadge(text = formatDetailDate(event.startDate).uppercase())
                Text(event.title, style = MaterialTheme.typography.headlineMedium.copy(color = Color.White))
            }
        }

        // Scrollable body — reaches the bottom edge of the screen now that
        // the pinned button is hidden (no bottom padding reserved for it).
        Box(
            Modifier
                .fillMaxSize()
                .padding(top = 280.dp)
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = PazSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
            ) {
                item { Spacer(Modifier.height(PazSpacing.Lg)) }

                // Meta chips — location only (the date is already shown by
                // the PazGoldBadge in the hero area, so no duplicate
                // calendar chip here).
                if (!event.location.isNullOrEmpty()) {
                    item {
                        Row(Modifier.padding(horizontal = PazSpacing.Lg), horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                            MetaChip(icon = Icons.Outlined.LocationOn, label = event.location!!)
                        }
                    }
                }

                // Description rendered inline — no "Geral"/"Informações" tabs.
                item {
                    Column(Modifier.padding(horizontal = PazSpacing.Lg)) {
                        Text("Descrição", style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(PazSpacing.Sm))
                        Text(
                            event.description?.takeIf { it.isNotEmpty() } ?: "Descrição em breve.",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }

                item { Spacer(Modifier.navigationBarsPadding()) }
            }
        }

        // Pinned "Confirmar presença" button at the bottom
        if (ATTENDANCE_CONFIRMATION_ENABLED) {
            Box(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .background(MaterialTheme.colorScheme.background)
                        .navigationBarsPadding()
                        .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
            ) {
                PazPillPrimaryButton(
                    text = "Confirmar presença",
                    icon = Icons.Outlined.Favorite,
                    onClick = { },
                )
            }
        }
    }
}

// ── Date formatting ────────────────────────────────────────────────────────────

private fun formatDetailDate(iso: String): String {
    val dt =
        runCatching {
            val s = iso.replace("Z", "").substringBefore("+").trimEnd()
            when {
                s.length == 10 -> LocalDateTime.parse("${s}T00:00")
                else -> LocalDateTime.parse(s.take(16))
            }
        }.getOrNull() ?: return iso
    val d = dt.dayOfMonth.toString().padStart(2, '0')
    val m = dt.monthValue.toString().padStart(2, '0')
    val h = dt.hour.toString().padStart(2, '0')
    val min = dt.minute.toString().padStart(2, '0')
    return "$d/$m/${dt.year}  $h:$min"
}

// ── Supporting composables ─────────────────────────────────────────────────────

@Composable
private fun MetaChip(
    icon: ImageVector,
    label: String,
) {
    Row(
        modifier =
            Modifier
                .clip(RoundedCornerShape(50.dp))
                .background(MaterialTheme.colorScheme.surface)
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
    PazErrorState(message = error, onRetry = onRetry)
}

@Composable
private fun LoadingState() {
    Column(Modifier.fillMaxSize().padding(PazSpacing.Xl), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
        PazSkeleton(height = 300.dp)
        PazSkeleton(height = 32.dp)
        PazSkeleton(height = 120.dp)
    }
}
