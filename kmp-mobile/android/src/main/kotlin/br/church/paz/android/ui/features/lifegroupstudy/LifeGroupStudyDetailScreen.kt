package br.church.paz.android.ui.features.lifegroupstudy

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.MarkdownText
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroupStudy
import coil3.compose.AsyncImage
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
fun LifeGroupStudyDetailScreen(
    navController: NavController,
    studyId: String,
    viewModel: LifeGroupStudyDetailViewModel = koinViewModel(parameters = { parametersOf(studyId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showDeleteConfirm by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupStudyDetailEffect.NavigateBack -> navController.popBackStack()
                is LifeGroupStudyDetailEffect.NavigateToEdit ->
                    navController.navigate(Screen.LifeGroupStudyEdit.createRoute(effect.studyId))
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Excluir estudo") },
            text = { Text("Tem certeza que deseja excluir este estudo? Essa ação não pode ser desfeita.") },
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

    Column(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding(),
        ) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = viewModel::onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar", tint = Color.White)
                }
                Text(
                    uiState.study?.title ?: "Estudo do Life",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                )
                if (uiState.canEdit) {
                    IconButton(onClick = viewModel::onEditTapped) {
                        Icon(Icons.Filled.Edit, "editar", tint = Color.White)
                    }
                    IconButton(onClick = { showDeleteConfirm = true }) {
                        Icon(Icons.Filled.Delete, "excluir", tint = Color.White)
                    }
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
                uiState.isLoading ->
                    Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
                        Spacer(Modifier.height(PazSpacing.Lg))
                        PazSkeleton(height = 180.dp)
                        PazSkeleton(height = 28.dp, width = 220.dp)
                        PazSkeleton(height = 120.dp)
                    }
                uiState.error != null ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                            modifier = Modifier.padding(PazSpacing.Xl),
                        ) {
                            Text(uiState.error!!, style = MaterialTheme.typography.bodySmall)
                            PazButton(text = "Tentar Novamente", onClick = viewModel::load, modifier = Modifier.fillMaxWidth())
                        }
                    }
                uiState.study != null -> StudyDetailContent(study = uiState.study!!)
                else ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                            modifier = Modifier.padding(PazSpacing.Xl),
                        ) {
                            Text("Algo deu errado. Tente novamente.", style = MaterialTheme.typography.bodySmall)
                            PazButton(text = "Tentar Novamente", onClick = viewModel::load, modifier = Modifier.fillMaxWidth())
                        }
                    }
            }
        }
    }
}

@Composable
private fun StudyDetailContent(study: LifeGroupStudy) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Lg)) }

        if (study.imageUrl != null) {
            item {
                AsyncImage(
                    model = study.imageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().height(180.dp).clip(RoundedCornerShape(16.dp)),
                )
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Xs)) {
                Text(study.title, style = MaterialTheme.typography.headlineSmall)
                Text(
                    "Por ${study.author}",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.55f)),
                )
            }
        }

        item { MarkdownText(markdown = study.bodyMarkdown) }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}
