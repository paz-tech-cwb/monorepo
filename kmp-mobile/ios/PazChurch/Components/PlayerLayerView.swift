import AVFoundation
import SwiftUI

/// Fullscreen, non-interactive video surface backed by `AVPlayerLayer` directly — unlike
/// AVKit's `VideoPlayer`, this has no built-in tap-to-reveal scrubber/play-pause/AirPlay/PiP
/// controls. Used for the onboarding welcome video, which is not skippable and must not
/// expose a pause/seek affordance.
struct PlayerLayerView: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerContainerView {
        let view = PlayerContainerView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspectFill
        view.isUserInteractionEnabled = false
        return view
    }

    func updateUIView(_ uiView: PlayerContainerView, context: Context) {
        uiView.playerLayer.player = player
    }

    /// Backs its layer with `AVPlayerLayer` so playback renders without a hosting
    /// `AVPlayerViewController`/`VideoPlayer` and its native controls.
    final class PlayerContainerView: UIView {
        override static var layerClass: AnyClass { AVPlayerLayer.self }

        var playerLayer: AVPlayerLayer {
            // swiftlint:disable:next force_cast
            layer as! AVPlayerLayer
        }
    }
}
