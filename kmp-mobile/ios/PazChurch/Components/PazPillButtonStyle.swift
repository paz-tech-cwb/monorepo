import SwiftUI

// MARK: - PazPillButtonStyle

/// Fully-rounded ("pill") button style used for the 2026-09 glassmorphic restyle.
struct PazPillButtonStyle: ButtonStyle {
    enum Variant {
        case primary
        case secondary
    }

    var variant: Variant

    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 17, weight: .semibold))
            .frame(maxWidth: .infinity)
            .frame(height: PazSpacing.pillButtonHeight)
            .foregroundStyle(foregroundColor)
            .background(
                Capsule(style: .continuous)
                    .fill(backgroundColor)
            )
            .overlay(
                Capsule(style: .continuous)
                    .strokeBorder(borderColor, lineWidth: variant == .secondary ? 1 : 0)
            )
            .opacity(configuration.isPressed ? 0.85 : (isEnabled ? 1.0 : 0.5))
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }

    private var backgroundColor: Color {
        variant == .primary ? PazColors.ink : Color.clear
    }

    private var foregroundColor: Color {
        variant == .primary ? PazColors.surface : PazColors.ink
    }

    private var borderColor: Color {
        PazColors.line
    }
}

extension ButtonStyle where Self == PazPillButtonStyle {
    static var pazPillPrimary: PazPillButtonStyle {
        PazPillButtonStyle(variant: .primary)
    }

    static var pazPillSecondary: PazPillButtonStyle {
        PazPillButtonStyle(variant: .secondary)
    }
}
