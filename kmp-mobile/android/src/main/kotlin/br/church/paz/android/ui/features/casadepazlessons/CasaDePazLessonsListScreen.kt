package br.church.paz.android.ui.features.casadepazlessons

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
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
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.CasaDePazLesson
import org.koin.androidx.compose.koinViewModel

@Composable
fun CasaDePazLessonsListScreen(
    navController: NavController,
    viewModel: CasaDePazLessonsListViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is CasaDePazLessonsListEffect.NavigateToDetail ->
                    navController.navigate(Screen.CasaDePazLessonDetail.createRoute(effect.week))
                CasaDePazLessonsListEffect.NavigateBack -> navController.popBackStack()
            }
        }
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
                    "Conteúdo Casa de Paz",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    modifier = Modifier.weight(1f),
                )
            }
        }

        when {
            uiState.isLoading ->
                Column(Modifier.fillMaxSize().padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                    repeat(4) { PazSkeleton(height = 72.dp) }
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
            else ->
                LazyColumn(
                    contentPadding = PaddingValues(PazSpacing.Lg),
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                ) {
                    items(uiState.lessons, key = { it.week }) { lesson ->
                        LessonRow(lesson = lesson, onClick = { viewModel.onLessonTapped(lesson.week) })
                    }
                }
        }
    }
}

@Composable
private fun LessonRow(
    lesson: CasaDePazLesson,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Column(Modifier.weight(1f)) {
            Text("Semana ${lesson.week}", style = MaterialTheme.typography.labelSmall)
            Text(lesson.title, style = MaterialTheme.typography.bodyMedium, maxLines = 2)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null)
    }
}
