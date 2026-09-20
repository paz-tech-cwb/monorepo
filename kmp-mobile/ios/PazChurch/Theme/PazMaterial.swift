import SwiftUI

// MARK: - PazMaterial

/// Centralizes the glass-material tier used across the app's glassmorphic
/// components.
///
/// `.ultraThinMaterial` reads well over the dark mesh background, but is too
/// transparent for contrast in light mode — content behind it (other cards,
/// text, images) shows through enough to wash out foreground text/icons.
/// Dark mode keeps the thinnest tier for a real glass/blur look; light mode
/// steps up to `.thinMaterial`, which is still translucent (not a flat
/// panel) but meaningfully more opaque.
enum PazMaterial {
    /// For card-sized surfaces (GlassCard, hero/nav backgrounds).
    static func glass(for scheme: ColorScheme) -> Material {
        scheme == .dark ? .ultraThinMaterial : .thinMaterial
    }

    /// For small chip/badge-sized surfaces (pill chips, icon badges), which
    /// read fine one tier lighter than full cards.
    static func chip(for scheme: ColorScheme) -> Material {
        scheme == .dark ? .ultraThinMaterial : .thinMaterial
    }
}
