import SwiftUI

// MARK: - PazMaterial

/// Centralizes the glass-material tier used across the app's glassmorphic
/// components. Text/icon contrast comes from `PazColors.accent`/`.ink`
/// (both adapt per color scheme), not from how opaque the material is — so
/// the same translucent tier works in both modes and cards keep a real
/// glass/blur look instead of reading as flat gray panels in dark mode.
enum PazMaterial {
    /// For card-sized surfaces (GlassCard, hero/nav backgrounds).
    static func glass(for _: ColorScheme) -> Material {
        .ultraThinMaterial
    }

    /// For small chip/badge-sized surfaces (pill chips, icon badges), which
    /// read fine one tier lighter than full cards.
    static func chip(for _: ColorScheme) -> Material {
        .ultraThinMaterial
    }
}
