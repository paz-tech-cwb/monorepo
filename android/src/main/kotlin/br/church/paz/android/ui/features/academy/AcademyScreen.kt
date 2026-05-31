package br.church.paz.android.ui.features.academy

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazSectionHeader
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AcademyVideo
import coil3.compose.AsyncImage
import org.koin.androidx.compose.koinViewModel

@Composable
fun AcademyScreen(
    contentPadding: PaddingValues = PaddingValues(),
    viewModel: AcademyViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is AcademyEffect.OpenYouTube -> {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(effect.url)))
                }
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        // Header
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
                uiState.error != null -> Box(
                    Modifier.fillMaxSize().padding(contentPadding),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(uiState.error!!, style = MaterialTheme.typography.bodyMedium)
                }
                else -> AcademyContent(
                    uiState        = uiState,
                    onVideoTap     = { viewModel.onVideoTapped(it.youtubeUrl) },
                    onCategorySelect = viewModel::onCategorySelected,
                    contentPadding = contentPadding,
                )
            }
        }
    }
}

@Composable
private fun AcademyContent(
    uiState: AcademyUiState,
    onVideoTap: (AcademyVideo) -> Unit,
    onCategorySelect: (String) -> Unit,
    contentPadding: PaddingValues,
) {
    LazyColumn(
        contentPadding      = contentPadding,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        modifier            = Modifier.fillMaxSize(),
    ) {
        // Featured video
        uiState.featured?.let { video ->
            item {
                FeaturedVideoCard(
                    video    = video,
                    onClick  = { onVideoTap(video) },
                    modifier = Modifier.padding(top = PazSpacing.Xl, start = PazSpacing.Lg, end = PazSpacing.Lg),
                )
            }
        }

        // Category chips
        item {
            LazyRow(
                contentPadding        = PaddingValues(horizontal = PazSpacing.Lg),
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
            ) {
                items(uiState.categories) { category ->
                    val selected = category == uiState.selectedCategory
                    Box(
                        modifier = Modifier
                            .clip(PazShapePill)
                            .background(if (selected) PazColors.Primary else MaterialTheme.colorScheme.surface)
                            .border(1.dp, if (selected) Color.Transparent else MaterialTheme.colorScheme.outline, PazShapePill)
                            .clickable { onCategorySelect(category) }
                            .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
                    ) {
                        Text(
                            text  = category,
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                color      = if (selected) Color.White else MaterialTheme.colorScheme.onSurface,
                            ),
                        )
                    }
                }
            }
        }

        // Video list
        if (uiState.filteredVideos.isNotEmpty()) {
            item {
                PazSectionHeader(
                    title    = "Séries",
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                )
            }
            items(uiState.filteredVideos, key = { it.id }) { video ->
                VideoListItem(
                    video    = video,
                    onClick  = { onVideoTap(video) },
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                )
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Lg)) }
    }
}

@Composable
private fun FeaturedVideoCard(
    video: AcademyVideo,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(180.dp)
            .clip(PazShapes.large)
            .clickable(onClick = onClick),
    ) {
        AsyncImage(
            model              = video.thumbnailUrl,
            contentDescription = video.title,
            contentScale       = ContentScale.Crop,
            modifier           = Modifier.fillMaxSize(),
        )
        Box(
            Modifier
                .fillMaxSize()
                .background(PazGradients.Card)
        )
        Box(Modifier.fillMaxSize().background(Color(0x55000000)))

        // Play button
        Box(
            Modifier
                .size(52.dp)
                .align(Alignment.Center)
                .clip(RoundedCornerShape(50))
                .background(Color.White.copy(alpha = 0.9f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = PazColors.Primary, modifier = Modifier.size(28.dp))
        }

        // Info overlay
        Column(
            Modifier
                .align(Alignment.BottomStart)
                .padding(PazSpacing.Md),
        ) {
            if (video.category != null) {
                Box(
                    Modifier
                        .clip(PazShapePill)
                        .background(PazColors.Gold)
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                ) {
                    Text(
                        video.category!!.uppercase(),
                        style = MaterialTheme.typography.labelSmall.copy(color = Color(0xFF140E00)),
                    )
                }
                Spacer(Modifier.height(4.dp))
            }
            Text(video.title, style = MaterialTheme.typography.titleMedium.copy(color = Color.White))
            if (video.author != null) {
                Text(
                    "${video.author} · ${video.viewCount ?: 0} visualizações",
                    style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.6f)),
                )
            }
        }

        // Duration badge
        if (video.durationFormatted != null) {
            Box(
                Modifier
                    .align(Alignment.BottomEnd)
                    .padding(PazSpacing.Sm)
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color.Black.copy(alpha = 0.6f))
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            ) {
                Text(video.durationFormatted!!, style = MaterialTheme.typography.labelSmall.copy(color = Color.White))
            }
        }
    }
}

@Composable
private fun VideoListItem(
    video: AcademyVideo,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier          = modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Box(
            modifier         = Modifier
                .size(width = 88.dp, height = 60.dp)
                .clip(PazShapes.medium)
                .background(PazGradients.Card),
            contentAlignment = Alignment.Center,
        ) {
            if (video.thumbnailUrl != null) {
                AsyncImage(
                    model              = video.thumbnailUrl,
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier.fillMaxSize(),
                )
            }
            Icon(Icons.Default.PlayArrow, null, tint = Color.White.copy(.8f), modifier = Modifier.size(24.dp))
            if (video.durationFormatted != null) {
                Box(
                    Modifier
                        .align(Alignment.BottomEnd)
                        .padding(3.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(Color.Black.copy(.6f))
                        .padding(horizontal = 4.dp, vertical = 1.dp),
                ) {
                    Text(video.durationFormatted!!, style = MaterialTheme.typography.labelSmall.copy(color = Color.White, fontSize = 9.sp))
                }
            }
        }
        Column(Modifier.weight(1f)) {
            Text(video.title, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), maxLines = 2)
            if (video.author != null) {
                Text(video.author!!, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)))
            }
            if (video.category != null) {
                Spacer(Modifier.height(3.dp))
                Box(
                    Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                ) {
                    Text(video.category!!, style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant))
                }
            }
        }
    }
}

@Composable
private fun AcademySkeleton(contentPadding: PaddingValues) {
    LazyColumn(
        contentPadding      = contentPadding,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        modifier            = Modifier.fillMaxSize().padding(top = PazSpacing.Xl, start = PazSpacing.Lg, end = PazSpacing.Lg),
    ) {
        item { PazSkeleton(height = 180.dp) }
        item { PazSkeleton(height = 40.dp, width = 200.dp) }
        repeat(4) { item { PazCardSkeleton() } }
    }
}

// Extension for fontSize parameter
private val Int.sp: androidx.compose.ui.unit.TextUnit
    get() = androidx.compose.ui.unit.TextUnit(this.toFloat(), androidx.compose.ui.unit.TextUnitType.Sp)
