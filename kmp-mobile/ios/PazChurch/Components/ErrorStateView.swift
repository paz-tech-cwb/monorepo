import SwiftUI

struct ErrorStateView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: PazSpacing.md) {
            Spacer().frame(height: 60)
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 48))
                .foregroundStyle(PazColors.error)
            Text("Erro ao carregar").font(PazTypography.titleMedium)
            Text(message)
                .font(PazTypography.bodySmall)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button(action: onRetry) {
                Text("Tentar Novamente")
            }
            .buttonStyle(.pazPillPrimary)
            .padding(.top, PazSpacing.md)
        }
        .padding(PazSpacing.lg)
    }
}

#Preview {
    ErrorStateView(message: "Algo deu errado", onRetry: {})
}
