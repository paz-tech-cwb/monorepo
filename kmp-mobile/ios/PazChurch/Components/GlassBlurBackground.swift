import SwiftUI

// MARK: - GlassBlurBackground

private struct GlassBlurBackgroundView: View {
    let gradient: LinearGradient
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            gradient
            Rectangle().fill(PazMaterial.glass(for: colorScheme))
        }
        .ignoresSafeArea()
    }
}

extension View {
    /// Applies a brand gradient background with a frosted material layer on top,
    /// used behind hero sections and nav-adjacent chrome in the 2026-09 restyle.
    func glassBlurBackground(gradient: LinearGradient = PazColors.heroGradient) -> some View {
        background(GlassBlurBackgroundView(gradient: gradient))
    }
}
