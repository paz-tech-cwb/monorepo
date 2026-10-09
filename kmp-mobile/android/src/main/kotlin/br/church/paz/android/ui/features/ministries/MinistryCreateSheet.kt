package br.church.paz.android.ui.features.ministries

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.User

/**
 * Bottom sheet form for creating a new ministry. Self-contained — does not
 * couple to the forms feature's PickerState, per plan. Visibility is gated
 * by the caller (only shown to [MinistriesUiState.canManage] users).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MinistryCreateSheet(
    state: MinistryCreateFormState,
    onDismiss: () -> Unit,
    onNameChanged: (String) -> Unit,
    onDescriptionChanged: (String) -> Unit,
    onMembershipModeChanged: (String) -> Unit,
    onLeaderQueryChanged: (String) -> Unit,
    onLeaderSelected: (id: String, name: String) -> Unit,
    onCoLeaderQueryChanged: (String) -> Unit,
    onCoLeaderSelected: (id: String, name: String) -> Unit,
    onConfirm: () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = PazSpacing.Lg)
                .padding(bottom = PazSpacing.Xl),
        ) {
            Text("Novo ministério", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(PazSpacing.Lg))

            OutlinedTextField(
                value = state.name,
                onValueChange = onNameChanged,
                label = { Text("Nome") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(PazSpacing.Md))

            OutlinedTextField(
                value = state.description,
                onValueChange = onDescriptionChanged,
                label = { Text("Descrição (opcional)") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(PazSpacing.Md))

            LeaderSearchField(
                label = "Líder",
                query = state.leaderSearchQuery,
                selectedName = state.leaderName,
                results = state.leaderSearchResults,
                isSearching = state.isSearchingLeader,
                onQueryChanged = onLeaderQueryChanged,
                onSelected = onLeaderSelected,
            )
            Spacer(Modifier.height(PazSpacing.Md))

            LeaderSearchField(
                label = "Co-líder (opcional)",
                query = state.coLeaderSearchQuery,
                selectedName = state.coLeaderName,
                results = state.coLeaderSearchResults,
                isSearching = state.isSearchingCoLeader,
                onQueryChanged = onCoLeaderQueryChanged,
                onSelected = onCoLeaderSelected,
            )
            Spacer(Modifier.height(PazSpacing.Md))

            Text("Forma de participação", style = MaterialTheme.typography.labelLarge)
            Spacer(Modifier.height(PazSpacing.Sm))
            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                MembershipModeOption(
                    label = "Equipes",
                    selected = state.membershipMode == "teams",
                    onClick = { onMembershipModeChanged("teams") },
                )
                MembershipModeOption(
                    label = "Membros diretos",
                    selected = state.membershipMode == "direct",
                    onClick = { onMembershipModeChanged("direct") },
                )
            }

            if (state.error != null) {
                Spacer(Modifier.height(PazSpacing.Md))
                Text(state.error, color = PazColors.Error, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(Modifier.height(PazSpacing.Xl))
            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                    Text("Cancelar")
                }
                Button(
                    onClick = onConfirm,
                    enabled = state.canSubmit,
                    modifier = Modifier.weight(1f),
                ) {
                    if (state.isSaving) {
                        CircularProgressIndicator(modifier = Modifier.height(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Criar")
                    }
                }
            }
        }
    }
}

@Composable
private fun MembershipModeOption(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = PazShapes.medium,
        color = if (selected) PazColors.Primary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface,
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = PazSpacing.Md, vertical = PazSpacing.Sm),
            style =
                MaterialTheme.typography.labelMedium.copy(
                    color = if (selected) PazColors.Primary else MaterialTheme.colorScheme.onSurface,
                ),
        )
    }
}

@Composable
private fun LeaderSearchField(
    label: String,
    query: String,
    selectedName: String,
    results: List<User>,
    isSearching: Boolean,
    onQueryChanged: (String) -> Unit,
    onSelected: (id: String, name: String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        OutlinedTextField(
            value = if (selectedName.isNotBlank() && !expanded) selectedName else query,
            onValueChange = {
                expanded = true
                onQueryChanged(it)
            },
            label = { Text(label) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        if (expanded) {
            Spacer(Modifier.height(PazSpacing.Xs))
            when {
                isSearching ->
                    Box(
                        Modifier.fillMaxWidth().height(60.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(modifier = Modifier.height(20.dp), strokeWidth = 2.dp)
                    }
                results.isEmpty() && query.isNotBlank() ->
                    Text(
                        "Nenhum resultado",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(PazSpacing.Sm),
                    )
                results.isEmpty() -> Unit
                else ->
                    LazyColumn(Modifier.heightIn(max = 180.dp)) {
                        items(results) { user ->
                            Surface(
                                onClick = {
                                    onSelected(user.id, user.name)
                                    expanded = false
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                ListItem(
                                    headlineContent = { Text(user.name) },
                                    supportingContent = user.email.takeIf { it.isNotBlank() }?.let { { Text(it) } },
                                )
                            }
                            HorizontalDivider()
                        }
                    }
            }
        }
    }
}
