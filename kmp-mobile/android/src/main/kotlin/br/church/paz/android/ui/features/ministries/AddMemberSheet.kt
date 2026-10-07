package br.church.paz.android.ui.features.ministries

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
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

/**
 * User search sheet for adding a member to a ministry or life group — port of
 * iOS `AddMinistryMemberView`/`AddLifeGroupMemberView` (near-identical on
 * both platforms, so shared as a single composable here rather than
 * duplicated per entity).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddMemberSheet(
    query: String,
    results: List<User>,
    isSearching: Boolean,
    onQueryChanged: (String) -> Unit,
    onSelect: (User) -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg)) {
            Text("Adicionar membro", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(PazSpacing.Md))
            OutlinedTextField(
                value = query,
                onValueChange = onQueryChanged,
                placeholder = { Text("Buscar por nome ou email") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(Modifier.height(PazSpacing.Sm))
            when {
                isSearching ->
                    Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                query.length < 2 ->
                    Text(
                        "Digite ao menos 2 caracteres para buscar.",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(vertical = PazSpacing.Md),
                    )
                results.isEmpty() ->
                    Text(
                        "Nenhum usuário encontrado.",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(vertical = PazSpacing.Md),
                    )
                else ->
                    LazyColumn(Modifier.heightIn(max = 320.dp)) {
                        items(results, key = { it.id }) { user ->
                            ListItem(
                                headlineContent = { Text(user.name) },
                                supportingContent = { Text(user.email) },
                                modifier =
                                    Modifier
                                        .fillMaxWidth()
                                        .clickable { onSelect(user) },
                            )
                            HorizontalDivider()
                        }
                    }
            }
            Spacer(Modifier.height(PazSpacing.Xl))
        }
    }
}
