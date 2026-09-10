package br.church.paz.android.ui.features.lifegroupattendance

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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.brDateString
import br.church.paz.shared.domain.model.LifeGroupAttendance
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf
import java.time.LocalDate

@Composable
fun LifeGroupAttendanceHistoryScreen(
    navController: NavController,
    lifeGroupId: String,
    viewModel: LifeGroupAttendanceHistoryViewModel =
        koinViewModel(parameters = { parametersOf(lifeGroupId.toInt()) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Reload whenever this screen returns to the foreground (e.g. popping
    // back from the editor after a save) — the ViewModel is scoped to the
    // nav back stack entry and only loads once in init otherwise, so a
    // freshly-saved/edited record would not show up without this.
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnResume = rememberUpdatedState(viewModel::load)
    DisposableEffect(lifecycleOwner) {
        val observer =
            LifecycleEventObserver { _, event ->
                if (event == Lifecycle.Event.ON_RESUME) currentOnResume.value()
            }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupAttendanceHistoryEffect.NavigateBack -> navController.popBackStack()
                is LifeGroupAttendanceHistoryEffect.NavigateToEditor ->
                    navController.navigate(
                        Screen.LifeGroupAttendanceEditor.createRoute(lifeGroupId, effect.date),
                    )
            }
        }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.onRecordTapped(LocalDate.now().toString()) },
                containerColor = PazColors.Primary,
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Lançar presença", tint = Color.White)
            }
        },
    ) { _ ->
        Column(Modifier.fillMaxSize()) {
            Box(
                Modifier.fillMaxWidth().background(PazGradients.Hero).statusBarsPadding(),
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = viewModel::onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar", tint = Color.White)
                    }
                    Text(
                        "Presença",
                        style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Box(
                Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(MaterialTheme.colorScheme.background),
            ) {
                when {
                    uiState.isLoading -> AttendanceHistorySkeleton()
                    uiState.error != null ->
                        AttendanceHistoryError(message = uiState.error!!, onRetry = viewModel::load)
                    uiState.records.isEmpty() -> AttendanceHistoryEmpty()
                    else ->
                        AttendanceHistoryList(
                            records = uiState.records,
                            onRecordTap = { viewModel.onRecordTapped(it.meetingDate) },
                        )
                }
            }
        }
    }
}

@Composable
private fun AttendanceHistoryList(
    records: List<LifeGroupAttendance>,
    onRecordTap: (LifeGroupAttendance) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        items(records, key = { it.id ?: it.meetingDate }) { record ->
            AttendanceRecordCard(record = record, onClick = { onRecordTap(record) })
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun AttendanceRecordCard(
    record: LifeGroupAttendance,
    onClick: () -> Unit,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onClick)
                .padding(PazSpacing.Lg),
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Groups, contentDescription = null, tint = PazColors.Primary)
        Column(Modifier.weight(1f)) {
            Text(brDateString(record.meetingDate), style = MaterialTheme.typography.bodyMedium)
            Text(
                "${record.presentCount} de ${record.membersCount} presentes",
                style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)),
            )
        }
    }
}

@Composable
private fun AttendanceHistoryEmpty() {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            Icon(Icons.Outlined.Groups, null, tint = PazColors.Primary)
            Text(
                "Nenhuma presença lançada ainda",
                style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)),
            )
        }
    }
}

@Composable
private fun AttendanceHistoryError(
    message: String,
    onRetry: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Text(message, style = MaterialTheme.typography.bodySmall)
            PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun AttendanceHistorySkeleton() {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        repeat(5) { item { PazCardSkeleton() } }
    }
}
