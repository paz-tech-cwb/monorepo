package br.church.paz.android.ui.features.lifegroupstudy

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroupStudy
import coil3.compose.AsyncImage
import org.koin.androidx.compose.koinViewModel

@Composable
fun LifeGroupStudyListScreen(
    navController: NavController,
    viewModel: LifeGroupStudyListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is LifeGroupStudyListEffect.NavigateToDetail ->
                    navController.navigate(Screen.LifeGroupStudyDetail.createRoute(effect.studyId))
                LifeGroupStudyListEffect.NavigateToCreate ->
                    navController.navigate(Screen.LifeGroupStudyCreate.route)
            }
        }
    }

    Scaffold(
        floatingActionButton = {
            if (uiState.canPublish) {
                FloatingActionButton(onClick = viewModel::onCreateTapped, containerColor = PazColors.Primary) {
                    Icon(Icons.Filled.Add, contentDescription = "Novo estudo", tint = Color.White)
                }
            }
        },
    ) { _ ->
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
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar", tint = Color.White)
                    }
                    Text(
                        "Estudo do Life",
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
                    uiState.isLoading -> LifeGroupStudySkeleton()
                    uiState.error != null -> LifeGroupStudyError(message = uiState.error!!, onRetry = viewModel::load)
                    uiState.studies.isEmpty() -> LifeGroupStudyEmpty()
                    else ->
                        LifeGroupStudyListContent(
                            studies = uiState.studies,
                            isLoadingMore = uiState.isLoadingMore,
                            onStudyTap = { viewModel.onStudyTapped(it.id) },
                            onLoadMore = viewModel::loadMore,
                        )
                }
            }
        }
    }
}

@Composable
private fun LifeGroupStudyListContent(
    studies: List<LifeGroupStudy>,
    isLoadingMore: Boolean,
    onStudyTap: (LifeGroupStudy) -> Unit,
    onLoadMore: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        items(studies, key = { it.id }) { study ->
            StudyCard(study = study, onClick = { onStudyTap(study) })
        }
        item {
            LaunchedEffect(Unit) { onLoadMore() }
            if (isLoadingMore) {
                Box(Modifier.fillMaxWidth().padding(PazSpacing.Md), Alignment.Center) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                }
            }
        }
    }
}

@Composable
private fun StudyCard(
    study: LifeGroupStudy,
    onClick: () -> Unit,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onClick)
                .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Box(
            modifier = Modifier.size(width = 88.dp, height = 64.dp).clip(RoundedCornerShape(10.dp)).background(PazGradients.Card),
            contentAlignment = Alignment.Center,
        ) {
            if (study.imageUrl != null) {
                AsyncImage(
                    model = study.imageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Icon(Icons.Outlined.MenuBook, null, tint = Color.White.copy(.7f), modifier = Modifier.size(24.dp))
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(study.title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), maxLines = 2)
            Text(
                study.author,
                style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.55f)),
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun LifeGroupStudyEmpty() {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            Icon(Icons.Outlined.MenuBook, null, tint = PazColors.Primary, modifier = Modifier.size(36.dp))
            Text(
                "Nenhum estudo publicado ainda",
                style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)),
            )
        }
    }
}

@Composable
private fun LifeGroupStudyError(
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
private fun LifeGroupStudySkeleton() {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        repeat(5) { item { PazCardSkeleton() } }
    }
}
