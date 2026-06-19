package br.church.paz.android.ui.features.formularios

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.User

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserPickerSheet(
    state: PickerState,
    selectedIds: Set<String>,
    onQueryChanged: (String) -> Unit,
    onSelect: (id: String, name: String) -> Unit,
    onDismiss: () -> Unit,
    onConfirmMulti: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth()) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .height(PazSpacing.Md),
            ) {}
            Text(
                state.label,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier
                    .fillMaxWidth()
                    .run { this },
            )
            Spacer(Modifier.height(PazSpacing.Md))
            OutlinedTextField(
                value = state.query,
                onValueChange = onQueryChanged,
                placeholder = { Text("Buscar por nome, telefone ou e-mail") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(Modifier.height(PazSpacing.Sm))
            when {
                state.isLoading -> Box(
                    Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
                state.error != null -> Text(state.error, color = MaterialTheme.colorScheme.error)
                state.results.isEmpty() && state.query.isNotBlank() -> Text("Nenhum resultado")
                else -> {
                    @Suppress("UNCHECKED_CAST")
                    val users = state.results as List<User>
                    LazyColumn(Modifier.heightIn(max = 300.dp)) {
                        items(users) { user ->
                            val selected = user.id in selectedIds
                            ListItem(
                                headlineContent = { Text(user.name) },
                                supportingContent = user.email.takeIf { it.isNotBlank() }?.let { { Text(it) } },
                                trailingContent = if (selected) {
                                    { Icon(Icons.Default.Check, null, tint = MaterialTheme.colorScheme.primary) }
                                } else {
                                    null
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onSelect(user.id, user.name) },
                            )
                            HorizontalDivider()
                        }
                    }
                }
            }
            if (state.isMulti) {
                Spacer(Modifier.height(PazSpacing.Md))
                Button(onClick = onConfirmMulti, modifier = Modifier.fillMaxWidth()) { Text("Confirmar") }
            }
            Spacer(Modifier.height(PazSpacing.Xl))
        }
    }
}
