import Shared
import SwiftUI

/// Read-only detail of one weekly report.
struct LifeGroupReportDetailView: View {
    @State private var viewModel: LifeGroupReportDetailViewModel

    init(reportId: String, repository: LifeGroupReportRepository) {
        _viewModel = State(initialValue: LifeGroupReportDetailViewModel(reportId: reportId, repository: repository))
    }

    var body: some View {
        content
            .background(PazMeshBackground())
            .navigationTitle(viewModel.report.map { brDateString(fromISODate: $0.date) } ?? "Relatório")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
            ScrollView {
                VStack(spacing: PazSpacing.md) {
                    ForEach(0..<3, id: \.self) { _ in
                        SkeletonView().frame(height: 140)
                    }
                }
                .padding(PazSpacing.lg)
            }
        } else if viewModel.noAccess {
            message("Relatório não encontrado ou sem acesso.")
        } else if let error = viewModel.error {
            ErrorStateView(message: error, onRetry: { Task { await viewModel.load() } })
        } else if let report = viewModel.report {
            ScrollView {
                VStack(spacing: PazSpacing.lg) {
                    card("Reunião", rows: meetingRows(report))
                    card("Liderança", rows: leadershipRows(report))
                    card("Atividades", rows: activityRows(report))
                }
                .padding(PazSpacing.lg)
            }
            .refreshable { await viewModel.load() }
        } else {
            message("Relatório não encontrado.")
        }
    }

    private func message(_ text: String) -> some View {
        Text(text)
            .font(PazTypography.bodyMedium)
            .foregroundStyle(PazColors.slate)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(PazSpacing.xl)
    }

    private func meetingRows(_ report: LifeGroupWeeklyReport) -> [(String, String)] {
        var rows: [(String, String)] = [("Data", brDateString(fromISODate: report.date))]
        if let author = report.submittedByName { rows.append(("Enviado por", author)) }
        rows += [
            ("Membros comprometidos", "\(report.committedMembers)"),
            ("Comprometidos presentes", "\(report.committedMembersPresent)"),
            ("Crianças (0 a 11)", "\(report.kids0To11)"),
            ("Convidados", "\(report.guests)"),
            ("MDAs", "\(report.mdas)"),
            ("Oferta", LifeGroupReportsPresentation.formatOffering(report.offering)),
        ]
        return rows
    }

    private func leadershipRows(_ report: LifeGroupWeeklyReport) -> [(String, String)] {
        [
            ("Comprometidos no Tadel", "\(report.committedAtTadel)"),
            ("Comprometidos no culto", "\(report.committedAtCulto)"),
            ("Líder presente em", LifeGroupReportsPresentation.activitySummary(types: report.leaderAttended, other: nil)),
            ("Discípulos", "\(report.disciplesCount)"),
            ("Discipulados na semana", "\(report.disciplesDiscipledThisWeek)"),
        ]
    }

    private func activityRows(_ report: LifeGroupWeeklyReport) -> [(String, String)] {
        [
            (
                "Pastoreio",
                LifeGroupReportsPresentation.activitySummary(
                    types: report.pastoringActivityType, other: report.pastoringActivityOther
                )
            ),
            (
                "Treinamento",
                LifeGroupReportsPresentation.activitySummary(
                    types: report.trainingActivityType, other: report.trainingActivityOther
                )
            ),
        ]
    }

    private func card(_ title: String, rows: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            Text(title)
                .font(PazTypography.titleSmall)
                .foregroundColor(PazColors.ink)
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                VStack(alignment: .leading, spacing: 2) {
                    Text(row.0)
                        .font(PazTypography.labelSmall)
                        .foregroundColor(PazColors.slate)
                    Text(row.1)
                        .font(PazTypography.bodyMedium)
                        .foregroundColor(PazColors.ink)
                }
            }
        }
        .padding(PazSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}
