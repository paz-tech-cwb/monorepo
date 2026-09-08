import SwiftUI

// MARK: - PazMaterial

/// Centralizes the glass-material tier used across the app's glassmorphic
/// components. Dark mode needs a visibly stronger tier than light mode —
/// `.thinMaterial`/`.ultraThinMaterial` barely separate from the dark mesh
/// background, leaving title text with poor contrast. Every glass surface
/// should read its material through here rather than hardcoding a tier, so
/// dark-mode contrast stays consistent app-wide from one place.
enum PazMaterial {
    /// For card-sized surfaces (GlassCard, hero/nav backgrounds).
    static func glass(for colorScheme: ColorScheme) -> Material {
        colorScheme == .dark ? .thickMaterial : .thinMaterial
    }

    /// For small chip/badge-sized surfaces (pill chips, icon badges), which
    /// read fine one tier lighter than full cards.
    static func chip(for colorScheme: ColorScheme) -> Material {
        colorScheme == .dark ? .regularMaterial : .ultraThinMaterial
    }
}
