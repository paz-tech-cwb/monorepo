package br.church.paz.android.ui.features.formularios

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
fun CasaDePazSubmissionEditorScreen(
    navController: NavController,
    submissionId: String,
    viewModel: CasaDePazSubmissionEditorViewModel = koinViewModel(parameters = { parametersOf(submissionId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showDeleteConfirm by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                CasaDePazSubmissionEditorEffect.Saved -> navController.popBackStack()
                CasaDePazSubmissionEditorEffect.Deleted -> navController.popBackStack()
                CasaDePazSubmissionEditorEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Excluir registro") },
            text = { Text("Tem certeza que deseja excluir este registro de Casa de Paz? Essa ação não pode ser desfeita.") },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteConfirm = false
                    viewModel.onDelete()
                }) { Text("Excluir", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) { Text("Cancelar") }
            },
        )
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        Text("Editar Registro", style = MaterialTheme.typography.headlineMedium)

        if (uiState.error != null) {
            Text(uiState.error!!, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error))
        }

        if (!uiState.isLoading) {
            OutlinedTextField(
                value = uiState.date,
                onValueChange = viewModel::onDateChange,
                label = { Text("Data (AAAA-MM-DD)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = uiState.facilitator,
                onValueChange = viewModel::onFacilitatorChange,
                label = { Text("Facilitador") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            SectorDropdown(
                sectorNames = uiState.sectorNames,
                selectedId = uiState.sectorId,
                onSelected = viewModel::onSectorChange,
            )

            MeetingDayDropdown(
                selected = uiState.meetingDay,
                onSelected = viewModel::onMeetingDayChange,
            )

            OutlinedTextField(
                value = uiState.meetingTime,
                onValueChange = viewModel::onMeetingTimeChange,
                label = { Text("Horário (HH:MM)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = uiState.adults,
                onValueChange = viewModel::onAdultsChange,
                label = { Text("Adultos") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = uiState.kids,
                onValueChange = viewModel::onKidsChange,
                label = { Text("Crianças") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = uiState.guests,
                onValueChange = viewModel::onGuestsChange,
                label = { Text("Convidados") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = uiState.conversions,
                onValueChange = viewModel::onConversionsChange,
                label = { Text("Conversões") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            PazButton(
                text = "Salvar",
                onClick = viewModel::onSave,
                enabled = uiState.sectorId != null && !uiState.isSaving && !uiState.isDeleting,
                loading = uiState.isSaving,
                modifier = Modifier.fillMaxWidth(),
            )

            PazButton(
                text = "Excluir registro",
                onClick = { showDeleteConfirm = true },
                enabled = !uiState.isSaving && !uiState.isDeleting,
                loading = uiState.isDeleting,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SectorDropdown(
    sectorNames: Map<Int, String>,
    selectedId: Int?,
    onSelected: (Int) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = selectedId?.let { sectorNames[it] } ?: ""

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        TextField(
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text("Setor") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable, true),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            sectorNames.entries.sortedBy { it.value }.forEach { (id, name) ->
                DropdownMenuItem(text = { Text(name) }, onClick = {
                    onSelected(id)
                    expanded = false
                })
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MeetingDayDropdown(
    selected: String,
    onSelected: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        TextField(
            value = selected.ifBlank { "—" },
            onValueChange = {},
            readOnly = true,
            label = { Text("Dia da reunião") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable, true),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            MEETING_DAY_OPTIONS.forEach { day ->
                DropdownMenuItem(text = { Text(day) }, onClick = {
                    onSelected(day)
                    expanded = false
                })
            }
        }
    }
}
