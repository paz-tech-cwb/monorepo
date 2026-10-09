import SwiftUI

/// Transient, non-blocking message presenter for non-critical failures (e.g. a failed
/// save/toggle where the rest of the screen's content is still usable). For blocking
/// errors (screen has nothing useful to show), use `ErrorStateView` instead.
///
/// Usage:
/// ```swift
/// SomeView()
///     .pazToast(message: $viewModel.toastMessage)
/// ```
/// Setting `message` to a non-nil value shows the toast; it auto-dismisses after ~3s
/// and clears the binding back to `nil`.
struct PazToastModifier: ViewModifier {
    @Binding var message: String?
    @State private var dismissTask: Task<Void, Never>?

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .bottom) {
                if let message {
                    PazToastView(message: message)
                        .padding(.bottom, PazSpacing.xl)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .onAppear { scheduleDismiss() }
                        .accessibilityElement(children: .combine)
                        .accessibilityAddTraits(.updatesFrequently)
                }
            }
            .animation(.spring(duration: 0.3), value: message)
            .onChange(of: message) { _, newValue in
                guard newValue != nil else { return }
                scheduleDismiss()
            }
    }

    private func scheduleDismiss() {
        dismissTask?.cancel()
        dismissTask = Task {
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            message = nil
        }
    }
}

private struct PazToastView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(PazTypography.bodySmall)
            .foregroundStyle(.primary)
            .multilineTextAlignment(.center)
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.md)
            .background(.regularMaterial, in: Capsule())
            .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
            .padding(.horizontal, PazSpacing.lg)
            .accessibilityLabel(message)
    }
}

extension View {
    /// Shows a transient, auto-dismissing toast over the view when `message` is non-nil.
    func pazToast(message: Binding<String?>) -> some View {
        modifier(PazToastModifier(message: message))
    }
}

#Preview {
    @Previewable @State var message: String? = "Erro ao salvar preferências"
    Color.clear
        .pazToast(message: $message)
}
