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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
import br.church.paz.shared.domain.model.MinistryUser
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/**
 * Leader/admin-only ministry management — edit name/description and
 * add/remove members. Port of iOS `MinistryManageView`; only reachable via
 * the "manage" toolbar icon on [MinistryDetailScreen], which already gates
 * on `uiState.canManage`.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MinistryManageScreen(
    navController: NavController,
    ministryId: String,
    viewModel: MinistryManageViewModel = koinViewModel(parameters = { parametersOf(ministryId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect {
            when (it) {
                MinistryManageEffect.Dismiss -> navController.popBackStack()
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Gerenciar ministério") },
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
                            PazSkeleton(height = 120.dp)
                        }
                    uiState.error != null -> PazErrorState(message = uiState.error!!, onRetry = {})
                    else ->
                        MinistryManageContent(
                            name = uiState.name,
                            description = uiState.description,
                            members = uiState.members,
                            saveError = uiState.saveError,
                            onNameChanged = viewModel::onNameChanged,
                            onDescriptionChanged = viewModel::onDescriptionChanged,
                            onAddMemberTap = viewModel::onAddMemberTap,
                            onRemoveMember = viewModel::onRemoveMember,
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
                onSelect = { user -> viewModel.onMemberSelected(user.id, user.name) },
                onDismiss = viewModel::onAddMemberDismiss,
            )
        }
    }
}

@Composable
private fun MinistryManageContent(
    name: String,
    description: String,
    members: List<MinistryUser>,
    saveError: String?,
    onNameChanged: (String) -> Unit,
    onDescriptionChanged: (String) -> Unit,
    onAddMemberTap: () -> Unit,
    onRemoveMember: (MinistryUser) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                Text("Informações do ministério", style = MaterialTheme.typography.titleSmall)
                PazGlassField(value = name, onValueChange = onNameChanged, label = "Nome")
                PazGlassField(
                    value = description,
                    onValueChange = onDescriptionChanged,
                    label = "Descrição",
                    singleLine = false,
                )
            }
        }

        item {
            Text("Membros (${members.size})", style = MaterialTheme.typography.titleSmall)
        }
        items(members, key = { it.id }) { member ->
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
            PazButton(
                text = "Adicionar membro",
                onClick = onAddMemberTap,
                variant = PazButtonVariant.Secondary,
            )
        }

        saveError?.let {
            item {
                Text(it, style = MaterialTheme.typography.bodySmall.copy(color = PazColors.Error))
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}
