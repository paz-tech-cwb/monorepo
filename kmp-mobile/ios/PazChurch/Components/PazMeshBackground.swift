import SwiftUI

// MARK: - PazMeshBackground

/// App-wide soft "mesh gradient" backdrop — several large, softly blurred brand-color
/// blobs layered over the base background, sitting behind every screen so glass
/// surfaces (GlassCard, GlassBlurBackground) have something to actually show through.
/// Uses only existing PazColors — no new brand colors introduced.
struct PazMeshBackground: View {
    @Environment(\.colorScheme) private var colorScheme
    private var isDark: Bool {
        colorScheme == .dark
    }

    var body: some View {
        ZStack {
            PazColors.background

            Circle()
                .fill(PazColors.pazPrimaryLight.opacity(isDark ? 0.10 : 0.28))
                .frame(width: 420, height: 420)
                .blur(radius: 120)
                .offset(x: -140, y: -260)

            Circle()
                .fill(PazColors.pazSky.opacity(isDark ? 0.08 : 0.22))
                .frame(width: 380, height: 380)
                .blur(radius: 110)
                .offset(x: 160, y: -60)

            Circle()
                .fill(PazColors.pazPrimaryMid.opacity(isDark ? 0.09 : 0.20))
                .frame(width: 460, height: 460)
                .blur(radius: 130)
                .offset(x: -120, y: 320)

            Circle()
                .fill(PazColors.pazGold.opacity(isDark ? 0.04 : 0.08))
                .frame(width: 300, height: 300)
                .blur(radius: 100)
                .offset(x: 150, y: 380)
        }
        .ignoresSafeArea()
    }
}

extension View {
    /// Applies the app-wide mesh background behind this view.
    func pazMeshBackground() -> some View {
        background(PazMeshBackground())
    }

    /// The ONE full-screen background of a screen. `.background(PazMeshBackground())` alone sizes the mesh
    /// to the content, so a compact state view (error, empty, loading) leaves a small mesh region over the
    /// real, larger screen background (two visible backgrounds). Filling the proposed size first makes the
    /// mesh cover the whole screen. State views must therefore never add a background or glass card of
    /// their own around their content.
    func pazScreenBackground() -> some View {
        frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(PazMeshBackground())
    }
}
