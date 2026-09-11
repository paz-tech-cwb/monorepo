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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Checkbox
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
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.brDateString
import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
fun LifeGroupAttendanceEditorScreen(
    navController: NavController,
    lifeGroupId: String,
    date: String,
    viewModel: LifeGroupAttendanceEditorViewModel =
        koinViewModel(parameters = { parametersOf(lifeGroupId.toInt(), date) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupAttendanceEditorEffect.NavigateBack -> navController.popBackStack()
                LifeGroupAttendanceEditorEffect.Saved -> navController.popBackStack()
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxWidth().background(PazGradients.Hero).statusBarsPadding()) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = viewModel::onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar", tint = Color.White)
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        "Lançar presença",
                        style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    )
                    Text(
                        brDateString(uiState.meetingDate),
                        style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(alpha = 0.8f)),
                    )
                }
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading -> AttendanceEditorSkeleton()
                uiState.error != null ->
                    AttendanceEditorError(message = uiState.error!!, onRetry = viewModel::load)
                uiState.entries.isEmpty() -> AttendanceEditorEmpty()
                else ->
                    AttendanceEditorContent(
                        entries = uiState.entries,
                        isSaving = uiState.isSaving,
                        saveError = uiState.saveError,
                        onToggle = viewModel::onTogglePresent,
                        onSave = viewModel::onSave,
                    )
            }
        }
    }
}

@Composable
private fun AttendanceEditorContent(
    entries: List<LifeGroupAttendanceEntry>,
    isSaving: Boolean,
    saveError: String?,
    onToggle: (Int) -> Unit,
    onSave: () -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(PazSpacing.Lg),
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
        ) {
            item {
                Text(
                    "${entries.count { it.present }} de ${entries.size} presentes",
                    style = MaterialTheme.typography.titleSmall.copy(color = PazColors.Primary),
                )
                Spacer(Modifier.height(PazSpacing.Md))
            }
            items(entries, key = { it.userId }) { entry ->
                MemberRow(entry = entry, onToggle = { onToggle(entry.userId) })
            }
            item { Spacer(Modifier.height(PazSpacing.Xl)) }
        }

        Column(Modifier.padding(PazSpacing.Lg)) {
            if (saveError != null) {
                Text(
                    saveError,
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error),
                    modifier = Modifier.padding(bottom = PazSpacing.Sm),
                )
            }
            PazButton(
                text = "Salvar presença",
                onClick = onSave,
                enabled = !isSaving,
                loading = isSaving,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun MemberRow(
    entry: LifeGroupAttendanceEntry,
    onToggle: () -> Unit,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onToggle)
                .padding(horizontal = PazSpacing.Md, vertical = PazSpacing.Sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Icon(
            imageVector = if (entry.present) Icons.Filled.CheckCircle else Icons.Outlined.Circle,
            contentDescription = null,
            tint = if (entry.present) PazColors.Primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
        )
        Text(entry.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Checkbox(checked = entry.present, onCheckedChange = { onToggle() })
    }
}

@Composable
private fun AttendanceEditorEmpty() {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Text(
            "Este grupo ainda não tem membros para lançar presença",
            style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)),
            modifier = Modifier.padding(PazSpacing.Xl),
        )
    }
}

@Composable
private fun AttendanceEditorError(
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
private fun AttendanceEditorSkeleton() {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        repeat(6) { item { PazCardSkeleton() } }
    }
}
