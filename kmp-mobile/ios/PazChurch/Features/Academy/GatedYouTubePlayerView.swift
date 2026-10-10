import AVFAudio
import SwiftUI
import WebKit

/// Gated YouTube player: loads the IFrame Player API (not a plain `<iframe src=.../embed/...>`
/// like `YouTubePlayerView` in `VideoPlayerView.swift`) so playback position can be polled via
/// JS and reported as progress checkpoints, with forward seek-ahead blocked client-side — lesson
/// completion unlocks the course questionnaire, so this matters for UX (not just enforcement;
/// the backend's own anti-cheat clamp in `CourseProgressService` is the real source of truth).
///
/// Native controls are visible (`controls: 1`) with `autoplay: 1` so there is always something
/// tappable to start/pause the video — the 1s poll still blocks any forward jump greater than 2s
/// beyond the last known time via `seekTo`, so visible controls don't defeat the anti-cheat gate.
///
/// `window.webkit.messageHandlers.pazPlayer.postMessage({pct, t, kind})` is the only bridge
/// exposed to the page, and `WKNavigationDelegate` restricts navigation to the youtube.com origin
/// — `WKScriptMessageHandler` otherwise widens the WebView's attack surface to any page it can
/// navigate to.
/// Holds a weak reference to the player's `WKWebView` so the host view can read it (e.g. to flush
/// a pending progress checkpoint on disappear) without mutating `@State` via a `Binding` from
/// `makeUIView`, which runs during SwiftUI's view-update pass.
final class WebViewBox {
    weak var webView: WKWebView?
}

struct GatedYouTubePlayerView: UIViewRepresentable {
    let youtubeVideoId: String
    let onTick: (_ percentage: Int, _ positionSeconds: Int) -> Void
    let onPause: (_ percentage: Int, _ positionSeconds: Int) -> Void
    var onError: (_ code: Int) -> Void = { _ in }
    /// Exposes the underlying WebView so the host view can flush a pending progress checkpoint
    /// on disappear (see `flushPause`). A reference-type holder, not a `Binding`, since assigning
    /// to a `@State`-backed `Binding` from `makeUIView` (called during SwiftUI's view-update pass)
    /// triggers undefined behavior; assigning to a class property is safe here.
    var webViewBox: WebViewBox?

    func makeCoordinator() -> Coordinator {
        Coordinator(onTick: onTick, onPause: onPause, onError: onError)
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
        webViewBox?.webView = webView

        // `loadHTMLString(_:baseURL:)` gives the WebView an opaque/null document origin
        // regardless of `baseURL`, which can make the YouTube IFrame API's own origin check
        // fail and misreport spurious errors. Writing the HTML to a file and loading it via
        // `loadFileURL` gives the WebView a genuine `file://` origin instead, and we drop the
        // explicit `origin` player var so the IFrame API infers it from that real origin rather
        // than asserting a mismatched `https://www.youtube.com` value.
        if let fileURL = Self.writeTemporaryHTMLFile(youtubeVideoId: youtubeVideoId) {
            webView.loadFileURL(fileURL, allowingReadAccessTo: fileURL.deletingLastPathComponent())
        } else {
            webView.loadHTMLString(
                Self.html(youtubeVideoId: youtubeVideoId),
                baseURL: URL(string: "https://www.youtube.com")
            )
        }

        Self.configureAudioSession()
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "pazPlayer")
        deactivateAudioSession()
    }

    /// Writes the player HTML to a temporary file so the WebView loads it with a real `file://`
    /// origin (see `makeUIView`). Returns `nil` on failure so callers can fall back to
    /// `loadHTMLString`.
    private static func writeTemporaryHTMLFile(youtubeVideoId: String) -> URL? {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("GatedYouTubePlayer", isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let fileURL = directory.appendingPathComponent("\(youtubeVideoId).html")
            try html(youtubeVideoId: youtubeVideoId).write(to: fileURL, atomically: true, encoding: .utf8)
            return fileURL
        } catch {
            return nil
        }
    }

    /// Lesson audio otherwise respects the hardware mute switch under the default ambient audio
    /// session category. Configured locally here (rather than at the app level) since this is the
    /// only Academy player gated enough to warrant unmuted playback; `VideoPlayerView`'s open
    /// catalog player is left untouched.
    private static func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            // Best-effort — playback still works via the default session, just possibly muted.
        }
    }

    private static func deactivateAudioSession() {
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    /// Called on view disappear/pause — flushes the current position immediately.
    static func flushPause(_ webView: WKWebView?) {
        webView?.evaluateJavaScript("if (window.pazReportPause) window.pazReportPause();")
    }

    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        weak var webView: WKWebView?
        let onTick: (_ percentage: Int, _ positionSeconds: Int) -> Void
        let onPause: (_ percentage: Int, _ positionSeconds: Int) -> Void
        let onError: (_ code: Int) -> Void

        init(
            onTick: @escaping (_ percentage: Int, _ positionSeconds: Int) -> Void,
            onPause: @escaping (_ percentage: Int, _ positionSeconds: Int) -> Void,
            onError: @escaping (_ code: Int) -> Void
        ) {
            self.onTick = onTick
            self.onPause = onPause
            self.onError = onError
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "pazPlayer",
                  let body = message.body as? [String: Any]
            else { return }

            let kind = body["kind"] as? String ?? "tick"
            if kind == "error" {
                let code = Int((body["code"] as? Double) ?? -1)
                onError(code)
                return
            }

            guard let pct = body["pct"] as? Double,
                  let currentTime = body["t"] as? Double
            else { return }

            let percentage = Int(pct.rounded()).clamped(to: 0...100)
            let seconds = max(0, Int(currentTime.rounded()))
            if kind == "pause" || kind == "ended" {
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
            // The initial load is the locally-bundled `file://` HTML (see `makeUIView`); only
            // subsequent navigations need to be restricted to the YouTube origin.
            if navigationAction.request.url?.isFileURL == true {
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
                  autoplay: 1, controls: 1, disablekb: 1, fs: 0, rel: 0, modestbranding: 1,
                  playsinline: 1
                },
                events: {
                  onReady: onPlayerReady,
                  onStateChange: onPlayerStateChange,
                  onError: onPlayerError
                }
              });
            }

            function onPlayerReady() {}

            function onPlayerError(event) {
              window.webkit.messageHandlers.pazPlayer.postMessage({ kind: 'error', code: event.data });
            }

            function onPlayerStateChange(event) {
              if (event.data === YT.PlayerState.PLAYING) {
                if (!pollTimer) pollTimer = setInterval(poll, 1000);
              } else if (event.data === YT.PlayerState.PAUSED) {
                clearInterval(pollTimer);
                pollTimer = null;
                reportPause();
              } else if (event.data === YT.PlayerState.ENDED) {
                clearInterval(pollTimer);
                pollTimer = null;
                reportEnded();
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

            function reportEnded() {
              if (!player || !player.getDuration) return;
              var duration = player.getDuration();
              if (!duration) return;
              window.webkit.messageHandlers.pazPlayer.postMessage({ pct: 100, t: duration, kind: 'ended' });
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
