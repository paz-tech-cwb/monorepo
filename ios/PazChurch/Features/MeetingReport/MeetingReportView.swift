import Observation
import Shared
import SwiftUI

struct MeetingReportView: View {
    @State private var viewModel: MeetingReportViewModel

    init(formsRepository: FormsRepository, authRepository: AuthRepository) {
        _viewModel = State(initialValue: MeetingReportViewModel(
            formsRepository: formsRepository,
            authRepository: authRepository
        ))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: PazSpacing.lg) {
                    Spacer().frame(height: PazSpacing.lg)

                    FormField(label: "Data da Reunião", placeholder: "DD/MM/YYYY", text: $viewModel.date)
                    FormField(label: "Participantes", placeholder: "0", text: $viewModel.attendees)
                    FormField(label: "Visitantes", placeholder: "0", text: $viewModel.visitors)
                    FormField(label: "Ofertas (R$)", placeholder: "0,00", text: $viewModel.offerings)
                    FormField(
                        label: "Observações",
                        placeholder: "Algo importante?",
                        text: $viewModel.observations,
                        multiline: true
                    )

                    if let error = viewModel.error {
                        Text(error)
                            .font(PazTypography.bodySmall)
                            .foregroundColor(.red)
                            .padding(PazSpacing.lg)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                    }

                    Button(action: { viewModel.onSubmit() }) {
                        Text(viewModel.isSubmitting ? "Enviando..." : "Enviar Relatório")
                            .font(PazTypography.titleMedium)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, PazSpacing.md)
                            .background(viewModel.isSubmitting ? Color.gray : PazColors.primary)
                            .cornerRadius(12)
                    }
                    .disabled(viewModel.isSubmitting || viewModel.date.isEmpty || viewModel.attendees.isEmpty)

                    Spacer().frame(height: PazSpacing.xl)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazColors.background)
            .navigationTitle("Relatar Reunião")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

private struct FormField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var multiline = false

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            Text(label)
                .font(PazTypography.labelMedium)
                .foregroundColor(PazColors.onSurface)

            if multiline {
                TextEditor(text: $text)
                    .font(PazTypography.bodyMedium)
                    .frame(height: 120)
                    .padding(PazSpacing.sm)
                    .background(PazColors.surface)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
            } else {
                TextField(placeholder, text: $text)
                    .font(PazTypography.bodyMedium)
                    .padding(.horizontal, PazSpacing.md)
                    .padding(.vertical, PazSpacing.sm)
                    .background(PazColors.surface)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
            }
        }
    }
}

@MainActor
@Observable
class MeetingReportViewModel {
    var date = ""
    var attendees = ""
    var visitors = ""
    var offerings = ""
    var observations = ""
    var isSubmitting = false
    var error: String?

    private let formsRepository: FormsRepository
    private let authRepository: AuthRepository

    init(formsRepository: FormsRepository, authRepository: AuthRepository) {
        self.formsRepository = formsRepository
        self.authRepository = authRepository
    }

    func onSubmit() {
        if date.isEmpty {
            error = "Data é obrigatória"
            return
        }
        if attendees.isEmpty {
            error = "Número de participantes é obrigatório"
            return
        }

        isSubmitting = true
        error = nil

        Task {
            do {
                let user = try await authRepository.currentUser() as? Shared.User
                let report = MeetingReportRequest(
                    lifeGroupId: user?.id ?? "",
                    date: date,
                    attendees: Int32(attendees) ?? 0,
                    visitors: Int32(visitors) ?? 0,
                    offerings: Double(offerings).map { KotlinDouble(value: $0) },
                    observations: observations.isEmpty ? nil : observations
                )

                try await formsRepository.submitLifeGroupReport(report: report)
                isSubmitting = false
                // Navigate back
            } catch {
                self.error = error.localizedDescription
                isSubmitting = false
            }
        }
    }
}

#Preview {
    MeetingReportView(
        formsRepository: IosAppContainer.shared.formsRepository,
        authRepository: IosAppContainer.shared.authRepository
    )
}
