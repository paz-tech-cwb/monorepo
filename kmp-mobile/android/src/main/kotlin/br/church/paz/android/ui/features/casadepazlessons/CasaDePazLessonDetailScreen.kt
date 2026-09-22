package br.church.paz.android.ui.features.casadepazlessons

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.MarkdownText
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.components.YouTubeWebView
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.CasaDePazLesson
import br.church.paz.shared.domain.model.youtubeVideoId
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
fun CasaDePazLessonDetailScreen(
    navController: NavController,
    week: Int,
    viewModel: CasaDePazLessonDetailViewModel = koinViewModel(parameters = { parametersOf(week) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                CasaDePazLessonDetailEffect.NavigateBack -> navController.popBackStack()
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
                    uiState.lesson?.let { "Semana ${it.week}" } ?: "Casa de Paz",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
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
                uiState.lesson != null -> LessonDetailContent(lesson = uiState.lesson!!)
                else ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Text("Semana não encontrada.", style = MaterialTheme.typography.bodySmall)
                    }
            }
        }
    }
}

@Composable
private fun LessonDetailContent(lesson: CasaDePazLesson) {
    val context = LocalContext.current
    val videoId = lesson.youtubeVideoId

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Lg)) }

        item { Text(lesson.title, style = MaterialTheme.typography.headlineSmall) }

        if (!lesson.youtubeUrl.isNullOrBlank()) {
            item {
                if (videoId != null) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.Black),
                    ) {
                        YouTubeWebView(youtubeId = videoId)
                    }
                } else {
                    PazButton(
                        text = "Abrir no YouTube",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(lesson.youtubeUrl))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }

        if (lesson.summary.isNotBlank()) {
            item { MarkdownText(markdown = lesson.summary) }
        }

        if (lesson.guidelines.isNotBlank()) {
            item { MarkdownText(markdown = lesson.guidelines) }
        }

        if (lesson.questions.isNotEmpty()) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                    Text("Perguntas", style = MaterialTheme.typography.titleMedium)
                    lesson.questions.forEachIndexed { index, question ->
                        Text("${index + 1}. $question", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}
