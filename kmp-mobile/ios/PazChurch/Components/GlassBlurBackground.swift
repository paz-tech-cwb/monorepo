import SwiftUI

// MARK: - GlassBlurBackground

extension View {
    /// Applies a brand gradient background with a frosted material layer on top,
    /// used behind hero sections and nav-adjacent chrome in the 2026-09 restyle.
    func glassBlurBackground(gradient: LinearGradient = PazColors.heroGradient) -> some View {
        background(
            ZStack {
                gradient
                Rectangle().fill(.thinMaterial)
            }
            .ignoresSafeArea()
        )
    }
}
