import SwiftUI

struct NotificationPrefsView: View {
    @StateObject private var viewModel = NotificationPrefsViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                VStack(spacing: 0) {
                    // Hero header
                    VStack(alignment: .leading) {
                        HStack(spacing: PazSpacing.lg) {
                            Button(action: { dismiss() }) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                            Text("Notificações")
                                .font(PazTypography.headlineMedium)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, PazSpacing.lg)
                        .padding(.vertical, PazSpacing.md)
                    }
                    .background(PazColors.heroGradient)

                    // Content
                    ScrollView {
                        VStack(alignment: .leading, spacing: PazSpacing.lg) {
                            Spacer().frame(height: PazSpacing.lg)

                            Text("Preferências de Notificação")
                                .font(PazTypography.titleSmall)
                            Text("Escolha quais notificações você deseja receber")
                                .font(PazTypography.bodySmall)
                                .foregroundColor(.gray)

                            PreferenceToggle(
                                title: "Notificações de Eventos",
                                description: "Receba alertas sobre eventos e reuniões",
                                isOn: $viewModel.eventsNotifications
                            )

                            PreferenceToggle(
                                title: "Avisos e Comunicados",
                                description: "Receba avisos importantes da igreja",
                                isOn: $viewModel.announcementsNotifications
                            )

                            PreferenceToggle(
                                title: "Notificações do Grupo de Vida",
                                description: "Atualizações do seu grupo de vida",
                                isOn: $viewModel.lifeGroupNotifications
                            )

                            if let error = viewModel.error {
                                Text(error)
                                    .font(PazTypography.bodySmall)
                                    .foregroundColor(.red)
                                    .padding(PazSpacing.lg)
                                    .background(Color.red.opacity(0.1))
                                    .cornerRadius(12)
                            }

                            Spacer().frame(height: PazSpacing.lg)

                            Button(action: { viewModel.onSave() }) {
                                Text(viewModel.isSaving ? "Salvando..." : "Salvar")
                                    .font(PazTypography.titleMedium)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, PazSpacing.md)
                                    .background(viewModel.isSaving ? Color.gray : PazColors.primary)
                                    .cornerRadius(12)
                                    .disabled(viewModel.isSaving)
                            }

                            Spacer().frame(height: PazSpacing.xl)
                        }
                        .padding(.horizontal, PazSpacing.lg)
                    }
                    .background(PazColors.background)
                }
                .background(PazColors.background)
            }
        }
        .navigationBarBackButtonHidden()
    }
}

private struct PreferenceToggle: View {
    let title: String
    let description: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: PazSpacing.lg) {
            VStack(alignment: .leading, spacing: PazSpacing.xs) {
                Text(title)
                    .font(PazTypography.titleSmall)
                Text(description)
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.gray)
            }
            Spacer()
            Toggle("", isOn: $isOn)
                .labelsHidden()
        }
        .padding(PazSpacing.lg)
        .background(PazColors.surface)
        .cornerRadius(16)
    }
}

@MainActor
class NotificationPrefsViewModel: ObservableObject {
    @Published var eventsNotifications = true
    @Published var announcementsNotifications = true
    @Published var lifeGroupNotifications = true
    @Published var isSaving = false
    @Published var error: String?

    func onSave() {
        isSaving = true
        error = nil

        // TODO: persist to backend via API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.isSaving = false
        }
    }
}

#Preview {
    NotificationPrefsView()
}
