package br.church.paz.android.ui.features.academy

import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AcademyVideo
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
fun VideoPlayerScreen(
    navController: NavController,
    videoId: String,
    viewModel: VideoPlayerViewModel = koinViewModel(parameters = { parametersOf(videoId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize()) {
        // Toolbar
        Row(
            Modifier
                .fillMaxWidth()
                .background(Color.Black)
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White)
            }
            Text(
                uiState.video?.title ?: "",
                style = MaterialTheme.typography.titleSmall.copy(color = Color.White),
                modifier = Modifier.weight(1f),
                maxLines = 1,
            )
        }

        // YouTube embed player (16:9)
        Box(
            Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .background(Color.Black),
            contentAlignment = Alignment.Center,
        ) {
            when {
                uiState.isLoading -> CircularProgressIndicator(color = PazColors.Primary)
                uiState.video != null -> YouTubeWebView(youtubeId = uiState.video!!.youtubeId)
                else -> Icon(Icons.Default.PlayArrow, null, tint = Color.White, modifier = Modifier.size(48.dp))
            }
        }

        // Video metadata + related videos
        when {
            uiState.video != null -> MetadataAndRelated(
                video   = uiState.video!!,
                related = uiState.relatedVideos,
                onVideoTap = { viewModel.onVideoTapped(it) },
            )
            uiState.isLoading -> LoadingMetadata()
        }
    }
}

@Composable
private fun YouTubeWebView(youtubeId: String) {
    // YouTube iframe embed with autoplay=1, rel=0 (no related), modestbranding=1
    val htmlContent = """
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { margin: 0; padding: 0; background: #000; }
            iframe { width: 100%; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe
            src="https://www.youtube.com/embed/$youtubeId?autoplay=1&rel=0&modestbranding=1&playsinline=1"
            allow="autoplay; encrypted-media; fullscreen"
            allowfullscreen>
          </iframe>
        </body>
        </html>
    """.trimIndent()

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                webChromeClient = WebChromeClient()
                settings.apply {
                    javaScriptEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                    domStorageEnabled = true
                    cacheMode = WebSettings.LOAD_NO_CACHE
                }
                loadDataWithBaseURL(
                    "https://www.youtube.com",
                    htmlContent,
                    "text/html",
                    "UTF-8",
                    null,
                )
            }
        },
        modifier = Modifier.fillMaxSize(),
    )
}

@Composable
private fun MetadataAndRelated(
    video: AcademyVideo,
    related: List<AcademyVideo>,
    onVideoTap: (String) -> Unit,
) {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                Text(video.title, style = MaterialTheme.typography.titleMedium)

                Row(
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    video.category?.let { cat ->
                        Box(
                            Modifier
                                .clip(androidx.compose.foundation.shape.RoundedCornerShape(20.dp))
                                .background(PazColors.Primary.copy(alpha = 0.12f))
                                .padding(horizontal = 10.dp, vertical = 4.dp),
                        ) {
                            Text(cat, style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary))
                        }
                    }
                    video.durationFormatted?.let { dur ->
                        Text(dur, style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)))
                    }
                    video.viewCount?.let { views ->
                        Text("$views visualizações", style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)))
                    }
                }

                video.author?.let { author ->
                    Text(author, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)))
                }
            }
        }

        if (!video.description.isNullOrEmpty()) {
            item {
                Text(
                    video.description!!,
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)),
                )
            }
        }

        if (related.isNotEmpty()) {
            item {
                Spacer(Modifier.height(PazSpacing.Sm))
                Text("Mais vídeos", style = MaterialTheme.typography.titleSmall)
            }

            items(related) { relVideo ->
                RelatedVideoRow(video = relVideo, onClick = { onVideoTap(relVideo.id) })
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun RelatedVideoRow(video: AcademyVideo, onClick: () -> Unit) {
    androidx.compose.material3.Surface(
        onClick = onClick,
        shape   = PazShapes.large,
        color   = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(PazSpacing.Md),
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(72.dp, 48.dp)
                    .clip(PazShapes.large)
                    .background(PazColors.Primary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.PlayArrow, null, tint = PazColors.Primary, modifier = Modifier.size(24.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(video.title, style = MaterialTheme.typography.titleSmall, maxLines = 2)
                video.durationFormatted?.let { dur ->
                    Text(dur, style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)))
                }
            }
        }
    }
}

@Composable
private fun LoadingMetadata() {
    Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
        PazSkeleton(height = 22.dp)
        PazSkeleton(height = 16.dp, width = 120.dp)
        PazSkeleton(height = 14.dp)
        PazSkeleton(height = 14.dp, width = 200.dp)
    }
}
