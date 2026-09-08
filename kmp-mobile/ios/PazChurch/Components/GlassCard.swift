import SwiftUI

// MARK: - GlassCard

/// A frosted, translucent card container used for the 2026-09 glassmorphic restyle.
/// Floats over `PazColors` gradients/backgrounds using system Material blur.
struct GlassCard<Content: View>: View {
    var radius: CGFloat = PazSpacing.cardRadiusCompact
    // Stronger than .ultraThinMaterial — plain-blur cards over the mesh
    // background didn't leave enough contrast for title text underneath.
    var material: Material = .regularMaterial
    @ViewBuilder var content: Content

    var body: some View {
        content
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(material)
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.12), lineWidth: 0.5)
            )
            .shadow(color: Color.black.opacity(0.10), radius: 16, x: 0, y: 8)
    }
}

extension View {
    /// Wraps this view in `GlassCard` styling without needing a separate container.
    func glassCard(
        radius: CGFloat = PazSpacing.cardRadiusCompact,
        material: Material = .regularMaterial
    ) -> some View {
        GlassCard(radius: radius, material: material) { self }
    }
}
