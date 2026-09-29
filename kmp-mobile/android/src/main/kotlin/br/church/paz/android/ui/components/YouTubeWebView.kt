package br.church.paz.android.ui.components

import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

// Open (non-gated) YouTube iframe embed — used by the Academy video catalog and any other
// screen that just needs to play a public YouTube video with no anti-cheat/completion
// tracking. Distinct from GatedYouTubePlayer, which enforces watch-through for course
// completion tracking.
@Composable
fun YouTubeWebView(youtubeId: String) {
    // YouTube iframe embed with autoplay=1, rel=0 (no related), modestbranding=1
    val htmlContent =
        """
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
                layoutParams =
                    ViewGroup.LayoutParams(
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
