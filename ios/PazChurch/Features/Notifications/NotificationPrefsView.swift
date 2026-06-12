import Observation
import Shared
import SwiftUI

struct NotificationPrefsView: View {
    @State private var viewModel = NotificationPrefsViewModel()
    var body: some View {
        VStack(spacing: 0) {
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

                    PreferenceToggle(
                        title: "Academia",
                        description: "Conteúdos da academia",
                        isOn: $viewModel.academyNotifications
                    )

                    PreferenceToggle(
                        title: "Jornada do Membro",
                        description: "Acompanhe sua jornada na igreja",
                        isOn: $viewModel.memberJourneyNotifications
                    )

                    PreferenceToggle(
                        title: "Contribuições",
                        description: "Notificações sobre contribuições",
                        isOn: $viewModel.contributionsNotifications
                    )

                    if let error = viewModel.error {
                        Text(error)
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.red)
                            .padding(PazSpacing.lg)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                    }
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazColors.background)

            Button(action: { viewModel.onSave() }) {
                Text(viewModel.isSaving ? "Salvando..." : "Salvar")
                    .font(PazTypography.titleMedium)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(viewModel.isSaving ? Color.gray : PazColors.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(viewModel.isSaving)
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.md)
            .background(PazColors.background)
        }
        .background(PazColors.background)
        .navigationTitle("Notificações")
        .navigationBarTitleDisplayMode(.large)
        .task { await viewModel.loadPreferences() }
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
@Observable
class NotificationPrefsViewModel {
    var eventsNotifications = true
    var announcementsNotifications = true
    var lifeGroupNotifications = true
    var academyNotifications = true
    var memberJourneyNotifications = true
    var contributionsNotifications = true
    var isSaving = false
    var isLoading = false
    var error: String?

    func loadPreferences() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let prefs = try await IosAppContainer.shared.userRepository.getNotificationPreferences()
            eventsNotifications = prefs.eventsEnabled
            announcementsNotifications = prefs.announcementsEnabled
            lifeGroupNotifications = prefs.lifeGroupEnabled
            academyNotifications = prefs.academyEnabled
            memberJourneyNotifications = prefs.memberJourneyEnabled
            contributionsNotifications = prefs.contributionsEnabled
        } catch {
            // Silently keep defaults if load fails
        }
    }

    func onSave() {
        isSaving = true
        error = nil
        Task {
            do {
                try await IosAppContainer.shared.userRepository.updateNotificationPreferences(
                    dto: UpdateNotificationPrefsDto(
                        eventsEnabled: KotlinBoolean(value: eventsNotifications),
                        announcementsEnabled: KotlinBoolean(value: announcementsNotifications),
                        lifeGroupEnabled: KotlinBoolean(value: lifeGroupNotifications),
                        academyEnabled: KotlinBoolean(value: academyNotifications),
                        memberJourneyEnabled: KotlinBoolean(value: memberJourneyNotifications),
                        contributionsEnabled: KotlinBoolean(value: contributionsNotifications),
                        osPermissionStatus: nil
                    )
                )
            } catch {
                self.error = "Erro ao salvar preferências"
            }
            isSaving = false
        }
    }
}

#Preview {
    NotificationPrefsView()
}
