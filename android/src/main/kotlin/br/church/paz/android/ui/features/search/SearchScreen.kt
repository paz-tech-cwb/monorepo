package br.church.paz.android.ui.features.search

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel

@Composable
fun SearchScreen(
    navController: NavController,
    viewModel: SearchViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is SearchEffect.NavigateToAgendaDetail ->
                    navController.navigate(Screen.AgendaDetail.createRoute(effect.eventId))
                is SearchEffect.NavigateToFormDetail ->
                    navController.navigate(Screen.FormDetail.createRoute(effect.formId))
                is SearchEffect.NavigateToMinistryDetail ->
                    navController.navigate(Screen.MinistryDetail.createRoute(effect.ministryId))
                is SearchEffect.NavigateToLifeGroupDetail ->
                    navController.navigate(Screen.LifeGroupDetail.createRoute(effect.lifeGroupId))
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        // Hero search header
        Column(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            Text("Buscar", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White))

            OutlinedTextField(
                value = uiState.query,
                onValueChange = viewModel::onQueryChanged,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Eventos, vídeos, formulários...", color = Color.White.copy(alpha = 0.7f)) },
                leadingIcon = {
                    if (uiState.isSearching) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.Search, contentDescription = null, tint = Color.White)
                    }
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color.White.copy(alpha = 0.6f),
                    unfocusedBorderColor = Color.White.copy(alpha = 0.3f),
                    cursorColor = Color.White,
                ),
                shape = PazShapes.large,
            )
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                !uiState.hasSearched && uiState.query.isEmpty() -> EmptyQueryState()
                uiState.hasSearched && uiState.results.isEmpty -> NoResultsState(query = uiState.query)
                else -> ResultsList(uiState = uiState, viewModel = viewModel)
            }
        }
    }
}

@Composable
private fun ResultsList(uiState: SearchUiState, viewModel: SearchViewModel) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }

        if (uiState.results.events.isNotEmpty()) {
            item { SectionHeader("Eventos", uiState.results.events.size) }
            items(uiState.results.events.size) { i ->
                val event = uiState.results.events[i]
                ResultRow(
                    icon = Icons.Default.CalendarToday,
                    title = event.title,
                    subtitle = event.startDate,
                    onClick = { viewModel.onEventTap(event.id) },
                )
            }
            item { Spacer(Modifier.height(PazSpacing.Sm)) }
        }

        if (uiState.results.videos.isNotEmpty()) {
            item { SectionHeader("Vídeos", uiState.results.videos.size) }
            items(uiState.results.videos.size) { i ->
                val video = uiState.results.videos[i]
                ResultRow(
                    icon = Icons.Default.PlayArrow,
                    title = video.title,
                    subtitle = video.category ?: "",
                    onClick = { /* video player not yet implemented */ },
                )
            }
            item { Spacer(Modifier.height(PazSpacing.Sm)) }
        }

        if (uiState.results.forms.isNotEmpty()) {
            item { SectionHeader("Formulários", uiState.results.forms.size) }
            items(uiState.results.forms.size) { i ->
                val form = uiState.results.forms[i]
                ResultRow(
                    icon = Icons.Default.List,
                    title = form.title,
                    subtitle = form.description ?: form.type.name.replace("_", " "),
                    onClick = { viewModel.onFormTap(form.id) },
                )
            }
            item { Spacer(Modifier.height(PazSpacing.Sm)) }
        }

        if (uiState.results.ministries.isNotEmpty()) {
            item { SectionHeader("Ministérios", uiState.results.ministries.size) }
            items(uiState.results.ministries.size) { i ->
                val ministry = uiState.results.ministries[i]
                ResultRow(
                    icon = Icons.Default.Groups,
                    title = ministry.name,
                    subtitle = ministry.description ?: "",
                    onClick = { viewModel.onMinistryTap(ministry.id) },
                )
            }
            item { Spacer(Modifier.height(PazSpacing.Sm)) }
        }

        if (uiState.results.lifeGroups.isNotEmpty()) {
            item { SectionHeader("Grupos de Vida", uiState.results.lifeGroups.size) }
            items(uiState.results.lifeGroups.size) { i ->
                val group = uiState.results.lifeGroups[i]
                ResultRow(
                    icon = Icons.Default.Person,
                    title = group.name,
                    subtitle = group.leader?.let { "Líder: $it" } ?: "${group.membersCount} membros",
                    onClick = { viewModel.onLifeGroupTap(group.id) },
                )
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun SectionHeader(title: String, count: Int) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
        modifier = Modifier.padding(vertical = PazSpacing.Xs),
    ) {
        Text(title, style = MaterialTheme.typography.titleSmall)
        Box(
            Modifier
                .clip(androidx.compose.foundation.shape.RoundedCornerShape(20.dp))
                .background(PazColors.Primary.copy(alpha = 0.12f))
                .padding(horizontal = 8.dp, vertical = 2.dp),
        ) {
            Text(
                count.toString(),
                style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary),
            )
        }
    }
}

@Composable
private fun ResultRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    androidx.compose.material3.Surface(
        onClick = onClick,
        shape = PazShapes.large,
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(PazShapes.large)
                    .background(PazColors.Primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(20.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, maxLines = 1)
                if (subtitle.isNotEmpty()) {
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        ),
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyQueryState() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Icon(
                Icons.Default.Search,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                modifier = Modifier.size(48.dp),
            )
            Text(
                "Busque eventos, vídeos, formulários, ministérios e grupos de vida",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                ),
            )
        }
    }
}

@Composable
private fun NoResultsState(query: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Icon(
                Icons.Default.Search,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                modifier = Modifier.size(48.dp),
            )
            Text(
                "Nenhum resultado para \"$query\"",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                ),
            )
        }
    }
}
