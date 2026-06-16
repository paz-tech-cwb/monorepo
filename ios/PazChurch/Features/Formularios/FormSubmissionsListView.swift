import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class FormSubmissionsListViewModel {
    var submissions: [ServiceReportSubmission] = []
    var isLoading = true
    var error: String?

    private let formsRepository: FormsRepository

    init(formsRepository: FormsRepository) {
        self.formsRepository = formsRepository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            submissions = try await (formsRepository.getServiceReportSubmissions() as? [ServiceReportSubmission]) ?? []
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct FormSubmissionsListView: View {
    @State private var viewModel: FormSubmissionsListViewModel

    init(formsRepository: FormsRepository) {
        _viewModel = State(initialValue: FormSubmissionsListViewModel(formsRepository: formsRepository))
    }

    var body: some View {
        screenContent
            .background(PazColors.background)
            .navigationTitle("Relatório do Culto")
            .navigationBarTitleDisplayMode(.large)
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(error)
        } else if viewModel.submissions.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var contentState: some View {
        ScrollView {
            VStack(spacing: 10) {
                Spacer().frame(height: 8)
                ForEach(viewModel.submissions, id: \.id) { submission in
                    NavigationLink(destination: FormSubmissionDetailView(submission: submission)) {
                        SubmissionRow(submission: submission)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                }
                Spacer().frame(height: 32)
            }
            .padding(.top, 8)
        }
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhum registro encontrado").font(PazTypography.titleMedium)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(20)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Spacer()
            Text(message).font(PazTypography.bodySmall)
            Button("Tentar Novamente") { Task { await viewModel.load() } }
            Spacer()
        }
        .padding(20)
    }

    private var loadingState: some View {
        VStack(spacing: 12) {
            Spacer().frame(height: 16)
            ForEach(0..<3, id: \.self) { _ in SkeletonView().frame(height: 72).padding(.horizontal, 20) }
            Spacer()
        }
    }
}

private struct SubmissionRow: View {
    let submission: ServiceReportSubmission

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(submission.date) · \(submission.period)").font(PazTypography.titleSmall)
            Text(submission.atmosphereResponsible).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
            Text("Adultos: \(submission.tadelAdults) · Crianças: \(submission.tadelKids)")
                .font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct FormSubmissionDetailView: View {
    let submission: ServiceReportSubmission

    private var rows: [(String, String)] {
        [
            ("Data", submission.date),
            ("Tipo", submission.reportType),
            ("Período", submission.period),
            ("Responsável", submission.atmosphereResponsible),
            ("Adultos (Tadel)", "\(submission.tadelAdults)"),
            ("Crianças (Tadel)", "\(submission.tadelKids)"),
            ("Carros", "\(submission.vehiclesCars)"),
            ("Motos", "\(submission.vehiclesMotos)"),
            ("Bicicletas", "\(submission.vehiclesBikes)"),
            ("Voluntários Atmosfera", "\(submission.volunteersAtmosfera)"),
            ("Voluntários Louvor", "\(submission.volunteersLouvor)"),
            ("Voluntários Mídia", "\(submission.volunteersMiddia)"),
            ("Voluntários Dança", "\(submission.volunteersDanca)"),
            ("Observações", submission.notes ?? "-"),
        ]
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.md) {
                Spacer().frame(height: PazSpacing.sm)
                ForEach(rows, id: \.0) { label, value in
                    InfoRowView(icon: "doc.text", label: label, value: value)
                }
                Spacer().frame(height: PazSpacing.lg)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazColors.background)
        .navigationTitle("Detalhe do Registro")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct InfoRowView: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(PazColors.primary)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(label).font(PazTypography.labelSmall).foregroundColor(.gray)
                Text(value).font(PazTypography.bodySmall)
            }
            Spacer()
        }
        .padding(PazSpacing.md)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
