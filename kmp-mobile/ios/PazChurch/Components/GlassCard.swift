import SwiftUI

// MARK: - Export mode environment key

/// Set to `true` while rendering content for `ImageRenderer`-based PDF
/// export. `ImageRenderer` does not render SwiftUI `Material` (e.g.
/// `.thinMaterial`/`.ultraThinMaterial`) — fills using it come out fully
/// transparent, so views that need an opaque surface for export (like
/// `GlassCard`) should check this flag and swap to a plain opaque fill.
private struct IsExportingPDFKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var isExportingPDF: Bool {
        get { self[IsExportingPDFKey.self] }
        set { self[IsExportingPDFKey.self] = newValue }
    }
}

// MARK: - GlassCard

/// A frosted, translucent card container used for the 2026-09 glassmorphic restyle.
/// Floats over `PazColors` gradients/backgrounds using system Material blur.
/// Material tier is chosen automatically per color scheme (see `PazMaterial`) —
/// no call site should hardcode a `Material` here.
struct GlassCard<Content: View>: View {
    var radius: CGFloat = PazSpacing.cardRadiusCompact
    @ViewBuilder var content: Content

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.isExportingPDF) private var isExportingPDF

    var body: some View {
        content
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(
                        isExportingPDF
                            ? AnyShapeStyle(PazColors.surface)
                            : AnyShapeStyle(PazMaterial.glass(for: colorScheme))
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.12), lineWidth: 0.5)
            )
            .shadow(
                color: Color.black.opacity(isExportingPDF ? 0.05 : 0.10),
                radius: isExportingPDF ? 4 : 16,
                x: 0,
                y: isExportingPDF ? 2 : 8
            )
    }
}

extension View {
    /// Wraps this view in `GlassCard` styling without needing a separate container.
    func glassCard(radius: CGFloat = PazSpacing.cardRadiusCompact) -> some View {
        GlassCard(radius: radius) { self }
    }
}
