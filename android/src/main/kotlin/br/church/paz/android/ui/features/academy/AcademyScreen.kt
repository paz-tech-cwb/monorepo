package br.church.paz.android.ui.features.academy

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazSectionHeader
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.features.auth.LoginScreen
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.Course
import br.church.paz.shared.domain.model.CourseTrack
import coil3.compose.AsyncImage
import org.koin.androidx.compose.koinViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademyScreen(
    navController: NavController,
    contentPadding: PaddingValues = PaddingValues(),
    viewModel: AcademyViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showLoginSheet by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is AcademyEffect.NavigateToPlayer ->
                    navController.navigate(Screen.VideoPlayer.createRoute(effect.videoId))
            }
        }
    }

    if (showLoginSheet) {
        ModalBottomSheet(
            onDismissRequest = { showLoginSheet = false },
            sheetState = sheetState,
        ) {
            LoginScreen(
                onLoginSuccess = {
                    showLoginSheet = false
                    viewModel.refreshAuthState()
                },
                onDismiss = { showLoginSheet = false },
            )
        }
    }

    Column(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Xl, vertical = PazSpacing.Lg),
        ) {
            Column {
                Text(
                    "Conteúdo exclusivo",
                    style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.5f)),
                )
                Text(
                    "Academia\nPaz Church",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
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
                uiState.isLoading -> AcademySkeleton(contentPadding)
                uiState.error != null ->
                    Box(
                        Modifier.fillMaxSize().padding(contentPadding),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(uiState.error!!, style = MaterialTheme.typography.bodyMedium)
                    }
                uiState.tracks.isEmpty() ->
                    Box(
                        Modifier.fillMaxSize().padding(contentPadding),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "Nenhum conteúdo disponível",
                            style =
                                MaterialTheme.typography.bodyMedium.copy(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                ),
                        )
                    }
                else ->
                    AcademyContent(
                        tracks = uiState.tracks,
                        contentPadding = contentPadding,
                        onCourseTap = { course ->
                            if (uiState.isAuthenticated) {
                                viewModel.onVideoTapped(course.id)
                            } else {
                                showLoginSheet = true
                            }
                        },
                    )
            }
        }
    }
}

@Composable
private fun AcademyContent(
    tracks: List<CourseTrack>,
    contentPadding: PaddingValues,
    onCourseTap: (Course) -> Unit,
) {
    LazyColumn(
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Xl),
        modifier = Modifier.fillMaxSize(),
    ) {
        for (track in tracks) {
            item {
                Column(Modifier.padding(top = PazSpacing.Xl)) {
                    PazSectionHeader(
                        title = track.title,
                        modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                    )
                    if (!track.description.isNullOrBlank()) {
                        Spacer(Modifier.height(PazSpacing.Xs))
                        Text(
                            text = track.description!!,
                            style =
                                MaterialTheme.typography.bodySmall.copy(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                                ),
                            modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                        )
                    }
                }
            }
            items(track.courses, key = { "${track.id}_${it.id}" }) { course ->
                CourseListItem(
                    course = course,
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                    onClick = { onCourseTap(course) },
                )
            }
        }
        item { Spacer(Modifier.height(PazSpacing.Lg)) }
    }
}

@Composable
private fun CourseListItem(
    course: Course,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier =
            modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onClick)
                .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Box(
            modifier =
                Modifier
                    .size(width = 88.dp, height = 60.dp)
                    .clip(PazShapes.medium)
                    .background(PazGradients.Card),
            contentAlignment = Alignment.Center,
        ) {
            if (course.thumbnailUrl != null) {
                AsyncImage(
                    model = course.thumbnailUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Text(
                    text = course.title.take(1),
                    style = MaterialTheme.typography.titleLarge.copy(color = Color.White),
                )
            }
        }
        Column(Modifier.weight(1f)) {
            Text(
                text = course.title,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                maxLines = 2,
            )
            if (!course.description.isNullOrBlank()) {
                Spacer(Modifier.height(2.dp))
                Text(
                    text = course.description!!,
                    style =
                        MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        ),
                    maxLines = 2,
                )
            }
        }
    }
}

@Composable
private fun AcademySkeleton(contentPadding: PaddingValues) {
    LazyColumn(
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        modifier = Modifier.fillMaxSize().padding(top = PazSpacing.Xl, start = PazSpacing.Lg, end = PazSpacing.Lg),
    ) {
        item { PazSkeleton(height = 24.dp, width = 160.dp) }
        repeat(3) { item { PazCardSkeleton() } }
        item { PazSkeleton(height = 24.dp, width = 120.dp) }
        repeat(2) { item { PazCardSkeleton() } }
    }
}
