package br.church.paz.android.ui.features.ministries

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazButtonVariant
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazGlassCard
import br.church.paz.android.ui.components.PazGlassField
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroupMember
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/**
 * Leader/admin-only life group management — edit group info and add/remove
 * members. Port of iOS `LifeGroupManageView`; only reachable via the
 * "manage" toolbar icon on [LifeGroupDetailScreen], which already gates on
 * `uiState.canManage`.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupManageScreen(
    navController: NavController,
    lifeGroupId: String,
    viewModel: LifeGroupManageViewModel = koinViewModel(parameters = { parametersOf(lifeGroupId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var memberPendingRemoval by remember { mutableStateOf<LifeGroupMember?>(null) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect {
            when (it) {
                LifeGroupManageEffect.Dismiss -> navController.popBackStack()
            }
        }
    }

    memberPendingRemoval?.let { member ->
        AlertDialog(
            onDismissRequest = { memberPendingRemoval = null },
            title = { Text("Remover membro") },
            text = { Text("Tem certeza que deseja remover ${member.name} deste grupo?") },
            confirmButton = {
                TextButton(onClick = {
                    memberPendingRemoval = null
                    viewModel.onRemoveMember(member)
                }) {
                    Text("Remover", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { memberPendingRemoval = null }) { Text("Cancelar") } },
        )
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Gerenciar grupo") },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onCancel) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Cancelar")
                        }
                    },
                    actions = {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(modifier = Modifier.padding(horizontal = PazSpacing.Md))
                        } else {
                            TextButton(onClick = viewModel::onSave, enabled = uiState.canSave) {
                                Text("Salvar")
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Box(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
                when {
                    uiState.isLoading ->
                        Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
                            PazSkeleton(height = 56.dp)
                            PazSkeleton(height = 160.dp)
                        }
                    uiState.error != null -> PazErrorState(message = uiState.error!!, onRetry = {})
                    else ->
                        LifeGroupManageContent(
                            uiState = uiState,
                            onNameChanged = viewModel::onNameChanged,
                            onLocationChanged = viewModel::onLocationChanged,
                            onMeetingDayChanged = viewModel::onMeetingDayChanged,
                            onMeetingTimeChanged = viewModel::onMeetingTimeChanged,
                            onKidsCountChanged = viewModel::onKidsCountChanged,
                            onAddMemberTap = viewModel::onAddMemberTap,
                            onRemoveMember = { member -> memberPendingRemoval = member },
                        )
                }
            }
        }

        if (uiState.showAddMember) {
            AddMemberSheet(
                query = uiState.addMemberQuery,
                results = uiState.addMemberResults,
                isSearching = uiState.isSearchingMembers,
                onQueryChanged = viewModel::onAddMemberQueryChanged,
                onSelect = { user -> viewModel.onMemberSelected(user.id, user.name, user.email) },
                onDismiss = viewModel::onAddMemberDismiss,
            )
        }
    }
}

@Composable
private fun LifeGroupManageContent(
    uiState: LifeGroupManageUiState,
    onNameChanged: (String) -> Unit,
    onLocationChanged: (String) -> Unit,
    onMeetingDayChanged: (String) -> Unit,
    onMeetingTimeChanged: (String) -> Unit,
    onKidsCountChanged: (String) -> Unit,
    onAddMemberTap: () -> Unit,
    onRemoveMember: (LifeGroupMember) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                Text("Informações do grupo", style = MaterialTheme.typography.titleSmall)
                PazGlassField(value = uiState.name, onValueChange = onNameChanged, label = "Nome")
                PazGlassField(value = uiState.location, onValueChange = onLocationChanged, label = "Endereço")
                MeetingDayDropdown(selected = uiState.meetingDay, onSelected = onMeetingDayChanged)
                PazGlassField(
                    value = uiState.meetingTime,
                    onValueChange = onMeetingTimeChanged,
                    label = "Horário (HH:mm)",
                    placeholder = "19:30",
                )
                PazGlassField(
                    value = uiState.kidsCount,
                    onValueChange = onKidsCountChanged,
                    label = "Quantidade de crianças",
                    keyboardType = KeyboardType.Number,
                )
            }
        }

        item {
            Text("Membros (${uiState.members.size})", style = MaterialTheme.typography.titleSmall)
        }
        items(uiState.members, key = { it.id }) { member ->
            PazGlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(PazSpacing.Md),
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(member.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    IconButton(onClick = { onRemoveMember(member) }) {
                        Icon(Icons.Default.Delete, contentDescription = "Remover", tint = PazColors.Error)
                    }
                }
            }
        }
        item {
            PazButton(text = "Adicionar membro", onClick = onAddMemberTap, variant = PazButtonVariant.Secondary)
        }

        uiState.saveError?.let {
            item {
                Text(it, style = MaterialTheme.typography.bodySmall.copy(color = PazColors.Error))
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
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
            value = selected.ifBlank { "Selecione..." },
            onValueChange = {},
            readOnly = true,
            label = { Text("Dia da reunião") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier =
                Modifier
                    .fillMaxWidth()
                    .menuAnchor(MenuAnchorType.PrimaryNotEditable, true),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            LifeGroupMeetingDays.forEach { day ->
                DropdownMenuItem(text = { Text(day) }, onClick = {
                    onSelected(day)
                    expanded = false
                })
            }
        }
    }
}
