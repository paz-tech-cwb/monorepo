package br.church.paz.android.ui.features.academy

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
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
import br.church.paz.android.ui.components.PazButtonVariant
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.CourseDetail
import br.church.paz.shared.domain.model.Lesson
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
fun CourseDetailScreen(
    navController: NavController,
    courseId: String,
    viewModel: CourseDetailViewModel = koinViewModel(parameters = { parametersOf(courseId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is CourseDetailEffect.NavigateToQuestionnaire ->
                    navController.navigate(Screen.Questionnaire.createRoute(effect.courseId))
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier
                .fillMaxWidth()
                .background(Color.Black)
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar", tint = Color.White)
            }
            Text(
                uiState.course?.title ?: "",
                style = MaterialTheme.typography.titleSmall.copy(color = Color.White),
                modifier = Modifier.weight(1f),
                maxLines = 1,
            )
        }

        when {
            uiState.isLoading -> CourseDetailSkeleton()
            uiState.error != null ->
                PazErrorState(message = uiState.error ?: "Não foi possível carregar o curso", onRetry = viewModel::load)
            uiState.course == null ->
                PazErrorState(message = "Curso não encontrado", onRetry = viewModel::load)
            else ->
                CourseDetailContent(
                    course = uiState.course!!,
                    selectedLesson = uiState.selectedLesson,
                    onSelectLesson = viewModel::onSelectLesson,
                    onPlaybackTick = viewModel::onPlaybackTick,
                    onPlaybackPaused = viewModel::onPlaybackPaused,
                    onQuestionnaireTapped = viewModel::onQuestionnaireTapped,
                )
        }
    }
}

@Composable
private fun CourseDetailContent(
    course: CourseDetail,
    selectedLesson: Lesson?,
    onSelectLesson: (String) -> Unit,
    onPlaybackTick: (Int, Int) -> Unit,
    onPlaybackPaused: (Int, Int) -> Unit,
    onQuestionnaireTapped: () -> Unit,
) {
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Box(
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .background(Color.Black),
            ) {
                if (selectedLesson != null) {
                    GatedYouTubePlayer(
                        youtubeVideoId = selectedLesson.youtubeVideoId,
                        modifier = Modifier.fillMaxSize(),
                        onTick = onPlaybackTick,
                        onPause = onPlaybackPaused,
                    )
                }
            }
        }

        item {
            Column(Modifier.padding(PazSpacing.Lg)) {
                Text(selectedLesson?.title ?: course.title, style = MaterialTheme.typography.titleMedium)
                if (!course.description.isNullOrBlank()) {
                    Spacer(Modifier.height(PazSpacing.Sm))
                    Text(
                        course.description!!,
                        style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)),
                    )
                }
            }
        }

        item {
            Column(Modifier.padding(horizontal = PazSpacing.Lg)) {
                Text("Aulas", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(PazSpacing.Sm))
            }
        }

        items(course.lessons, key = { it.id }) { lesson ->
            LessonRow(
                lesson = lesson,
                selected = lesson.id == selectedLesson?.id,
                onClick = { onSelectLesson(lesson.id) },
                modifier = Modifier.padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Xs / 2),
            )
        }

        item {
            Spacer(Modifier.height(PazSpacing.Lg))
            QuestionnaireCta(
                course = course,
                onClick = onQuestionnaireTapped,
                modifier = Modifier.padding(horizontal = PazSpacing.Lg),
            )
            Spacer(Modifier.height(PazSpacing.Xl))
        }
    }
}

@Composable
private fun LessonRow(
    lesson: Lesson,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        shape = PazShapes.large,
        color = if (selected) PazColors.PrimaryTint else MaterialTheme.colorScheme.surface,
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(PazSpacing.Md),
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(28.dp).clip(RoundedCornerShape(50)).background(PazColors.Primary.copy(alpha = .1f)),
                Alignment.Center,
            ) {
                if (lesson.myProgress.completed) {
                    Icon(Icons.Filled.CheckCircle, null, tint = PazColors.Success, modifier = Modifier.size(18.dp))
                } else {
                    Icon(Icons.Filled.PlayArrow, null, tint = PazColors.Primary, modifier = Modifier.size(16.dp))
                }
            }
            Column(Modifier.weight(1f)) {
                Text(lesson.title, style = MaterialTheme.typography.bodyMedium, maxLines = 2)
                Spacer(Modifier.height(4.dp))
                LinearProgressIndicator(
                    progress = { lesson.myProgress.maxWatchedPercentage / 100f },
                    modifier = Modifier.fillMaxWidth().height(4.dp),
                )
            }
        }
    }
}

@Composable
private fun QuestionnaireCta(
    course: CourseDetail,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier) {
        PazButton(
            text = if (course.certificate != null) "Ver certificado" else "Fazer questionário",
            onClick = onClick,
            enabled = course.questionnaireUnlocked && course.questionnaire != null,
            variant = if (course.certificate != null) PazButtonVariant.Secondary else PazButtonVariant.Primary,
            modifier = Modifier.fillMaxWidth(),
        )
        if (!course.questionnaireUnlocked && course.questionnaire != null) {
            Spacer(Modifier.height(PazSpacing.Sm))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xs)) {
                Icon(Icons.Outlined.Lock, null, tint = MaterialTheme.colorScheme.onSurface.copy(.5f), modifier = Modifier.size(14.dp))
                Text(
                    "Assista pelo menos 90% de cada aula para liberar o questionário",
                    style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)),
                )
            }
        }
    }
}

@Composable
private fun CourseDetailSkeleton() {
    Column(Modifier.fillMaxSize().padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
        PazSkeleton(height = 200.dp)
        PazSkeleton(height = 24.dp, width = 200.dp)
        repeat(3) { PazSkeleton(height = 56.dp) }
    }
}
