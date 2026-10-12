import Shared
import SwiftUI

/// Read-only list of one life group's weekly reports (newest first).
struct LifeGroupReportsView: View {
    @State private var viewModel: LifeGroupReportsViewModel
    private let repository: LifeGroupReportRepository

    init(lifeGroupId: Int32, repository: LifeGroupReportRepository) {
        self.repository = repository
        _viewModel = State(initialValue: LifeGroupReportsViewModel(lifeGroupId: lifeGroupId, repository: repository))
    }

    var body: some View {
        content
            .background(PazMeshBackground())
            .navigationTitle("Relatórios semanais")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
            ScrollView {
                VStack(spacing: PazSpacing.md) {
                    ForEach(0..<5, id: \.self) { _ in
                        SkeletonView().frame(height: 80)
                    }
                }
                .padding(PazSpacing.lg)
            }
        } else if viewModel.noAccess {
            message("Você não tem acesso aos relatórios deste grupo.")
        } else if let error = viewModel.error {
            ErrorStateView(message: error, onRetry: { Task { await viewModel.load() } })
        } else if viewModel.reports.isEmpty {
            message("Nenhum relatório enviado")
        } else {
            ScrollView {
                VStack(spacing: PazSpacing.md) {
                    ForEach(viewModel.reports, id: \.id) { report in
                        NavigationLink {
                            LifeGroupReportDetailView(reportId: report.id, repository: repository)
                        } label: {
                            row(report)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(PazSpacing.lg)
            }
            .refreshable { await viewModel.load() }
        }
    }

    private func message(_ text: String) -> some View {
        // Scrollable so pull-to-refresh still works on the empty / no-access states.
        ScrollView {
            Text(text)
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(PazSpacing.xl)
                .padding(.top, 60)
        }
        .refreshable { await viewModel.load() }
    }

    private func row(_ report: LifeGroupWeeklyReport) -> some View {
        HStack(spacing: PazSpacing.md) {
            Image(systemName: "doc.text.fill")
                .font(.system(size: 18))
                .foregroundColor(PazColors.accent)
            VStack(alignment: .leading, spacing: PazSpacing.xs) {
                Text(brDateString(fromISODate: report.date))
                    .font(PazTypography.bodyMedium)
                    .foregroundColor(PazColors.ink)
                Text("\(report.committedMembersPresent) de \(report.committedMembers) presentes · \(report.guests) convidados")
                    .font(PazTypography.bodySmall)
                    .foregroundColor(PazColors.slate)
                Text("Oferta \(LifeGroupReportsPresentation.formatOffering(report.offering))")
                    .font(PazTypography.bodySmall)
                    .foregroundColor(PazColors.slate)
                if let author = report.submittedByName {
                    Text("Enviado por \(author)")
                        .font(PazTypography.labelSmall)
                        .foregroundColor(PazColors.slate)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 14))
                .foregroundColor(.gray)
        }
        .padding(PazSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
        .contentShape(Rectangle())
    }
}
