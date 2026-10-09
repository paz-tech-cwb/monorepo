import SwiftUI

// MARK: - PazKeyboardAccessoryBar

/// Shared bottom-pinned action bar for one-question-per-screen flows (`FormStepView`,
/// `QuestionnaireView`), applied via `.safeAreaInset(edge: .bottom)`.
///
/// Uses a very light `.ultraThinMaterial` scrim rather than a fully transparent background:
/// without any material, scrolled content (e.g. a long Casa de Paz guest roster or multi-line
/// notes) can visibly pass underneath the bar during scroll/rubber-band, and the primary pill
/// button loses contrast against the mesh background in light mode. `.ultraThinMaterial` is
/// applied uniformly in light and dark mode — just enough blur to blend with
/// `PazMeshBackground` without reintroducing an opaque/shadowed slab.
struct PazKeyboardAccessoryBar<Content: View>: View {
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.md)
            .background(.ultraThinMaterial)
    }
}
