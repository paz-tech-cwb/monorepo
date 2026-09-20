import SwiftUI

/// Shown after any dynamic form submits successfully — without this, the screen used to
/// just silently dismiss, giving the user no confirmation their submission actually went
/// through. Reused by every form via `FormStepView`.
struct SuccessStateView: View {
    var title: String = "Enviado com sucesso!"
    var message: String = "Seu formulário foi registrado."
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(PazColors.success)
            Text(title)
                .font(PazTypography.headlineSmall)
                .foregroundStyle(PazColors.ink)
                .multilineTextAlignment(.center)
            Text(message)
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)
                .multilineTextAlignment(.center)
            Spacer()
            Button(action: onDone) {
                Text("Concluir")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.pazPillPrimary)
        }
        .padding(PazSpacing.lg)
        .transition(.opacity.combined(with: .scale(scale: 0.96)))
    }
}
