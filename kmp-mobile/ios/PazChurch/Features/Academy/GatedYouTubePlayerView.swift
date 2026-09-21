import SwiftUI
import WebKit

/// Gated YouTube player: loads the IFrame Player API (not a plain `<iframe src=.../embed/...>`
/// like `YouTubePlayerView` in `VideoPlayerView.swift`) so playback position can be polled via
/// JS and reported as progress checkpoints, with forward seek-ahead blocked client-side — lesson
/// completion unlocks the course questionnaire, so this matters for UX (not just enforcement;
/// the backend's own anti-cheat clamp in `CourseProgressService` is the real source of truth).
///
/// `window.webkit.messageHandlers.pazPlayer.postMessage({pct, t})` is the only bridge exposed to
/// the page, and `WKNavigationDelegate` restricts navigation to the youtube.com origin —
/// `WKScriptMessageHandler` otherwise widens the WebView's attack surface to any page it can
/// navigate to.
struct GatedYouTubePlayerView: UIViewRepresentable {
    let youtubeVideoId: String
    let onTick: (_ percentage: Int, _ positionSeconds: Int) -> Void
    let onPause: (_ percentage: Int, _ positionSeconds: Int) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onTick: onTick, onPause: onPause)
    }

    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "pazPlayer")

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.isScrollEnabled = false
        webView.backgroundColor = .black
        webView.isOpaque = false
        context.coordinator.webView = webView
        webView.loadHTMLString(
            Self.html(youtubeVideoId: youtubeVideoId),
            baseURL: URL(string: "https://www.youtube.com")
        )
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "pazPlayer")
    }

    /// Called on view disappear/pause — flushes the current position immediately.
    static func flushPause(_ webView: WKWebView?) {
        webView?.evaluateJavaScript("if (window.pazReportPause) window.pazReportPause();")
    }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        weak var webView: WKWebView?
        let onTick: (_ percentage: Int, _ positionSeconds: Int) -> Void
        let onPause: (_ percentage: Int, _ positionSeconds: Int) -> Void

        init(
            onTick: @escaping (_ percentage: Int, _ positionSeconds: Int) -> Void,
            onPause: @escaping (_ percentage: Int, _ positionSeconds: Int) -> Void
        ) {
            self.onTick = onTick
            self.onPause = onPause
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "pazPlayer",
                  let body = message.body as? [String: Any],
                  let pct = body["pct"] as? Double,
                  let currentTime = body["t"] as? Double
            else { return }

            let percentage = Int(pct.rounded()).clamped(to: 0...100)
            let seconds = max(0, Int(currentTime.rounded()))
            let kind = body["kind"] as? String ?? "tick"
            if kind == "pause" {
                onPause(percentage, seconds)
            } else {
                onTick(percentage, seconds)
            }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            if let targetFrame = navigationAction.targetFrame, !targetFrame.isMainFrame {
                decisionHandler(.allow)
                return
            }
            let host = navigationAction.request.url?.host
            let allowed = host == "www.youtube.com" || host == "youtube.com" || (host?.hasSuffix(".ytimg.com") ?? false)
            decisionHandler(allowed ? .allow : .cancel)
        }
    }

    private static func html(youtubeVideoId: String) -> String {
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
                videoId: '\(youtubeVideoId)',
                playerVars: {
                  controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1,
                  playsinline: 1, origin: 'https://www.youtube.com'
                },
                events: { onStateChange: onPlayerStateChange }
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
              window.webkit.messageHandlers.pazPlayer.postMessage({ pct: pct, t: current, kind: 'tick' });
            }

            function reportPause() {
              if (!player || !player.getDuration) return;
              var duration = player.getDuration();
              var current = player.getCurrentTime();
              if (!duration) return;
              var pct = Math.min(100, Math.round((current / duration) * 100));
              window.webkit.messageHandlers.pazPlayer.postMessage({ pct: pct, t: current, kind: 'pause' });
            }

            window.pazReportPause = reportPause;
          </script>
        </body>
        </html>
        """
    }
}

private extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
