import SwiftUI

// MARK: - PazMaterial

/// Centralizes the glass-material tier used across the app's glassmorphic
/// components.
///
/// `.ultraThinMaterial` is too transparent for contrast in light mode —
/// content behind it (other cards, text, images) shows through enough to
/// wash out foreground text/icons — so light mode steps up to
/// `.thinMaterial`, which is still translucent (not a flat panel) but
/// meaningfully more opaque. Dark mode also uses `.thinMaterial`: once the
/// mesh background's dark-mode blob opacities were reduced (2026-10 dark
/// mode polish), `.ultraThinMaterial` read as nearly flat/invisible against
/// the much darker backdrop, so cards need the slightly heavier tier to
/// stay legible as "glass" surfaces.
enum PazMaterial {
    /// For card-sized surfaces (GlassCard, hero/nav backgrounds).
    static func glass(for scheme: ColorScheme) -> Material {
        .thinMaterial
    }

    /// For small chip/badge-sized surfaces (pill chips, icon badges), which
    /// read fine one tier lighter than full cards.
    static func chip(for scheme: ColorScheme) -> Material {
        scheme == .dark ? .ultraThinMaterial : .thinMaterial
    }
}
