import SwiftUI

/// Glass-styled text field matching the app's 2026-09 glassmorphic restyle (see
/// `GlassCard`). Use this instead of `.textFieldStyle(.roundedBorder)` — the latter
/// renders the platform-default bordered chrome, which doesn't match the design system.
struct PazGlassField: View {
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var textContentType: UITextContentType?

    var body: some View {
        TextField(placeholder, text: $text)
            .font(PazTypography.bodyMedium)
            .foregroundStyle(PazColors.ink)
            .keyboardType(keyboardType)
            .textContentType(textContentType)
            .padding(.horizontal, PazSpacing.md)
            .frame(height: 56)
            .glassCard(radius: 12)
    }
}
