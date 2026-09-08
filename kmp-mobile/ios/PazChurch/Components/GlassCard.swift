import SwiftUI

// MARK: - GlassCard

/// A frosted, translucent card container used for the 2026-09 glassmorphic restyle.
/// Floats over `PazColors` gradients/backgrounds using system Material blur.
struct GlassCard<Content: View>: View {
    var radius: CGFloat = PazSpacing.cardRadiusCompact
    // A step stronger than .ultraThinMaterial for legibility over the mesh
    // background, but not as opaque as .regularMaterial (which read as flat
    // white instead of glass).
    var material: Material = .thinMaterial
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
        material: Material = .thinMaterial
    ) -> some View {
        GlassCard(radius: radius, material: material) { self }
    }
}
