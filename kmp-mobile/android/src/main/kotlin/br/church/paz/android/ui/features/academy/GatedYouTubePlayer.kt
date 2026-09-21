package br.church.paz.android.ui.features.academy

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver

/**
 * Gated YouTube player: loads the IFrame Player API (not the plain `<iframe src=.../embed/...>`
 * used by [VideoPlayerScreen]'s open catalog player) so we can poll playback position via JS and
 * report progress checkpoints, and block forward seek-ahead (anti-cheat) — required because
 * lesson completion unlocks the course questionnaire.
 *
 * The JS bridge ([ProgressBridge]) only exposes primitive-arg methods, and WebView navigation is
 * restricted to the youtube.com origin via [shouldOverrideUrlLoading] — `addJavascriptInterface`
 * otherwise widens the WebView's XSS/RCE surface to any page it can navigate to.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun GatedYouTubePlayer(
    youtubeVideoId: String,
    modifier: Modifier = Modifier,
    onTick: (percentage: Int, positionSeconds: Int) -> Unit,
    onPause: (percentage: Int, positionSeconds: Int) -> Unit,
) {
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnTick by rememberUpdatedState(onTick)
    val currentOnPause by rememberUpdatedState(onPause)
    var webViewRef by remember { mutableStateOf<WebView?>(null) }

    DisposableEffect(lifecycleOwner) {
        val observer =
            LifecycleEventObserver { _, event ->
                if (event == Lifecycle.Event.ON_PAUSE) {
                    webViewRef?.evaluateJavascript("if (window.pazReportPause) window.pazReportPause();", null)
                }
            }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    AndroidView(
        modifier = modifier.background(Color.Black),
        factory = { context ->
            WebView(context).also { webViewRef = it }.apply {
                layoutParams =
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                webChromeClient = WebChromeClient()
                webViewClient =
                    object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView,
                            request: WebResourceRequest,
                        ): Boolean {
                            val host = request.url.host.orEmpty()
                            val allowed = host == "www.youtube.com" || host == "youtube.com" || host.endsWith(".ytimg.com")
                            return !allowed
                        }
                    }
                settings.apply {
                    javaScriptEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                    domStorageEnabled = true
                    cacheMode = WebSettings.LOAD_NO_CACHE
                }
                addJavascriptInterface(
                    object {
                        @JavascriptInterface
                        fun onTick(
                            pct: Double,
                            seconds: Double,
                        ) {
                            currentOnTick(pct.toInt().coerceIn(0, 100), seconds.toInt().coerceAtLeast(0))
                        }

                        @JavascriptInterface
                        fun onPaused(
                            pct: Double,
                            seconds: Double,
                        ) {
                            currentOnPause(pct.toInt().coerceIn(0, 100), seconds.toInt().coerceAtLeast(0))
                        }
                    },
                    "PazPlayerBridge",
                )
                loadDataWithBaseURL(
                    "https://www.youtube.com",
                    gatedPlayerHtml(youtubeVideoId),
                    "text/html",
                    "utf-8",
                    null,
                )
            }
        },
    )
}

/**
 * IFrame Player API HTML: `controls=0&disablekb=1&fs=0&rel=0&modestbranding=1&playsinline=1`
 * hides native player chrome (users can't scrub via visible controls), and a 1s poll blocks any
 * forward jump greater than 2s beyond the last known time via `seekTo` — a JS-level speed-bump,
 * not a security boundary (the backend's own anti-cheat clamp in `CourseProgressService` is the
 * real source of truth).
 */
private fun gatedPlayerHtml(youtubeVideoId: String): String =
    """
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>* { margin: 0; padding: 0; background: #000; } #player { width: 100%; height: 100vh; }</style>
    </head>
    <body>
      <div id="player"></div>
      <script src="https://www.youtube.com/iframe_api"></script>
      <script>
        var player;
        var lastAllowedTime = 0;
        var pollTimer = null;

        function onYouTubeIframeAPIReady() {
          player = new YT.Player('player', {
            videoId: '$youtubeVideoId',
            playerVars: {
              controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1,
              playsinline: 1, origin: 'https://www.youtube.com'
            },
            events: {
              onStateChange: onPlayerStateChange
            }
          });
        }

        function onPlayerStateChange(event) {
          if (event.data === YT.PlayerState.PLAYING) {
            if (!pollTimer) pollTimer = setInterval(poll, 1000);
          } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            clearInterval(pollTimer);
            pollTimer = null;
            reportPause();
          }
        }

        function poll() {
          if (!player || !player.getDuration) return;
          var duration = player.getDuration();
          var current = player.getCurrentTime();
          if (!duration) return;

          if (current > lastAllowedTime + 2) {
            player.seekTo(lastAllowedTime, true);
            current = lastAllowedTime;
          } else {
            lastAllowedTime = current;
          }

          var pct = Math.min(100, Math.round((current / duration) * 100));
          if (window.PazPlayerBridge) window.PazPlayerBridge.onTick(pct, current);
        }

        function reportPause() {
          if (!player || !player.getDuration) return;
          var duration = player.getDuration();
          var current = player.getCurrentTime();
          if (!duration) return;
          var pct = Math.min(100, Math.round((current / duration) * 100));
          if (window.PazPlayerBridge) window.PazPlayerBridge.onPaused(pct, current);
        }

        window.pazReportPause = reportPause;
      </script>
    </body>
    </html>
    """.trimIndent()
