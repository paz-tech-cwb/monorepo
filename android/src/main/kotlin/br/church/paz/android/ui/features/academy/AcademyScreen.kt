package br.church.paz.android.ui.features.academy

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.VideoLibrary
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazGoldBadge
import br.church.paz.android.ui.components.PazPillChip
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.features.auth.LoginScreen
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.Course
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
    var selectedTrackIndex by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is AcademyEffect.NavigateToPlayer ->
                    navController.navigate(Screen.VideoPlayer.createRoute(effect.videoId))
            }
        }
    }

    if (showLoginSheet) {
        ModalBottomSheet(onDismissRequest = { showLoginSheet = false }, sheetState = sheetState) {
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
                Text("Conteúdo exclusivo", style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.5f)))
                Text("Academia\nPaz Church", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White))
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
                uiState.error != null -> AcademyError(message = uiState.error!!, onRetry = viewModel::load)
                !uiState.isAuthenticated && uiState.tracks.isEmpty() ->
                    LoggedOutPromo(onLogin = { showLoginSheet = true })
                uiState.tracks.isEmpty() -> AcademyEmpty()
                else ->
                    AcademyContent(
                        uiState = uiState,
                        selectedTrackIndex = selectedTrackIndex,
                        onSelectTrack = { selectedTrackIndex = it },
                        onCourseTap = { course ->
                            if (uiState.isAuthenticated) {
                                viewModel.onVideoTapped(course.id)
                            } else {
                                showLoginSheet = true
                            }
                        },
                        contentPadding = contentPadding,
                    )
            }
        }
    }
}

// ── Content state ─────────────────────────────────────────────────────────────

@Composable
private fun AcademyContent(
    uiState: AcademyUiState,
    selectedTrackIndex: Int,
    onSelectTrack: (Int) -> Unit,
    onCourseTap: (Course) -> Unit,
    contentPadding: PaddingValues,
) {
    LazyColumn(contentPadding = contentPadding, modifier = Modifier.fillMaxSize()) {
        item {
            Spacer(Modifier.height(PazSpacing.Lg))

            if (uiState.isAuthenticated && uiState.resumeCourse != null) {
                ResumeBanner(
                    course = uiState.resumeCourse,
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg).padding(bottom = PazSpacing.Lg),
                )
            }

            LazyRow(
                contentPadding = PaddingValues(horizontal = PazSpacing.Lg),
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
            ) {
                itemsIndexed(uiState.tracks) { index, track ->
                    PazPillChip(
                        label = track.title,
                        selected = selectedTrackIndex == index,
                        onClick = { onSelectTrack(index) },
                    )
                }
            }
            Spacer(Modifier.height(PazSpacing.Lg))
        }

        val track = uiState.tracks.getOrNull(selectedTrackIndex) ?: uiState.tracks.first()

        if (!track.description.isNullOrBlank()) {
            item {
                Text(
                    track.description!!,
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.55f)),
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                )
                Spacer(Modifier.height(PazSpacing.Md))
            }
        }

        itemsIndexed(track.courses, key = { _, c -> c.id }) { index, course ->
            var visible by remember { mutableStateOf(false) }
            LaunchedEffect(course.id) { visible = true }
            AnimatedVisibility(
                visible = visible,
                enter =
                    fadeIn(tween(600, index * 65, CubicBezierEasing(.2f, .7f, .2f, 1f))) +
                        slideInVertically(tween(600, index * 65)) { 20 },
            ) {
                CourseCard(
                    course = course,
                    onClick = { onCourseTap(course) },
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg).padding(bottom = PazSpacing.Md),
                )
            }
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun ResumeBanner(
    course: Course,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier =
            modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable { }
                .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Box(
            Modifier.size(width = 72.dp, height = 48.dp).clip(PazShapes.medium).background(PazGradients.Card),
            Alignment.Center,
        ) {
            Icon(Icons.Outlined.PlayArrow, null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
        Column(Modifier.weight(1f)) {
            Text("Continuar assistindo", style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Accent))
            Text(course.title, style = MaterialTheme.typography.titleSmall, maxLines = 1)
        }
        PazGoldBadge(text = "Retomar")
    }
}

@Composable
private fun CourseCard(
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
            modifier = Modifier.size(width = 104.dp, height = 68.dp).clip(RoundedCornerShape(10.dp)).background(PazGradients.Card),
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
                Icon(Icons.Outlined.VideoLibrary, null, tint = Color.White.copy(.7f), modifier = Modifier.size(28.dp))
            }
            Box(
                Modifier.size(28.dp).clip(RoundedCornerShape(50)).background(Color.White.copy(.22f)),
                Alignment.Center,
            ) {
                Icon(Icons.Outlined.PlayArrow, null, tint = Color.White, modifier = Modifier.size(16.dp))
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(course.title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), maxLines = 2)
            if (!course.description.isNullOrBlank()) {
                Text(
                    course.description!!,
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)),
                    maxLines = 1,
                )
            }
        }
    }
}

// ── Logged-out state ──────────────────────────────────────────────────────────

@Composable
private fun LoggedOutPromo(onLogin: () -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Lg)) }
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(PazShapes.large)
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(PazSpacing.Xl),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                Box(
                    Modifier.size(64.dp).clip(RoundedCornerShape(50)).background(PazColors.Primary.copy(.1f)),
                    Alignment.Center,
                ) {
                    Icon(Icons.Outlined.Lock, null, tint = PazColors.Primary, modifier = Modifier.size(32.dp))
                }
                Text("Conteúdo exclusivo", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Faça login para acessar todos os cursos da Academia Paz Church",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)),
                )
            }
        }
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(PazShapes.large)
                    .background(PazGradients.Card)
                    .padding(PazSpacing.Xl),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                Text("O que você encontra", style = MaterialTheme.typography.titleMedium.copy(color = Color.White))
                listOf(
                    Icons.Outlined.School to "Cursos de discipulado",
                    Icons.Outlined.VideoLibrary to "Videoaulas exclusivas",
                    Icons.Outlined.Star to "Trilhas de aprendizado",
                ).forEach { (icon, label) ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
                    ) {
                        Icon(icon, null, tint = PazColors.Gold, modifier = Modifier.size(18.dp))
                        Text(label, style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.9f)))
                    }
                }
                Spacer(Modifier.height(PazSpacing.Sm))
                Box(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color.White)
                        .clickable(onClick = onLogin)
                        .padding(vertical = 14.dp),
                    Alignment.Center,
                ) {
                    Text("Entrar na minha conta", style = MaterialTheme.typography.titleSmall.copy(color = PazColors.Primary))
                }
            }
        }
    }
}

// ── Trivial states ────────────────────────────────────────────────────────────

@Composable
private fun AcademyEmpty() {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Text(
            "Nenhum conteúdo disponível",
            style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)),
        )
    }
}

@Composable
private fun AcademyError(
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
private fun AcademySkeleton(contentPadding: PaddingValues) {
    LazyColumn(
        contentPadding = contentPadding,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        modifier = Modifier.fillMaxSize().padding(top = PazSpacing.Xl, start = PazSpacing.Lg, end = PazSpacing.Lg),
    ) {
        item { PazSkeleton(height = 38.dp) }
        item { PazSkeleton(height = 24.dp, width = 160.dp) }
        repeat(4) { item { PazCardSkeleton() } }
    }
}
