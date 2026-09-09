import SwiftUI

// MARK: - GlassCard

/// A frosted, translucent card container used for the 2026-09 glassmorphic restyle.
/// Floats over `PazColors` gradients/backgrounds using system Material blur.
/// Material tier is chosen automatically per color scheme (see `PazMaterial`) —
/// no call site should hardcode a `Material` here.
struct GlassCard<Content: View>: View {
    var radius: CGFloat = PazSpacing.cardRadiusCompact
    @ViewBuilder var content: Content

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        content
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(PazMaterial.glass(for: colorScheme))
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
    func glassCard(radius: CGFloat = PazSpacing.cardRadiusCompact) -> some View {
        GlassCard(radius: radius) { self }
    }
}
