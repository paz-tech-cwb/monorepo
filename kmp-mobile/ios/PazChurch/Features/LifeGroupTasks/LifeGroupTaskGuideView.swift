import Shared
import SwiftUI

/// Guide for a task assigned to the signed-in member (opened from "Minhas tarefas" or the
/// `paz://tarefa/{id}` push deep link).
struct LifeGroupTaskGuideView: View {
    @State private var viewModel: LifeGroupTaskGuideViewModel
    @Environment(\.dismiss) private var dismiss

    init(
        assignmentId: String,
        repository: LifeGroupTaskRepository
    ) {
        _viewModel = State(
            initialValue: LifeGroupTaskGuideViewModel(assignmentId: assignmentId, repository: repository)
        )
    }

    var body: some View {
        screenContent
            .pazScreenBackground()
            .navigationTitle("Tarefa do Life")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
            .alert("Não posso fazer esta tarefa?", isPresented: $viewModel.showDeclineConfirm) {
                Button("Cancelar", role: .cancel) {}
                Button("Sim, não posso", role: .destructive) {
                    Task { await viewModel.confirmDecline() }
                }
            } message: {
                Text("A tarefa será passada para outra pessoa do grupo e a liderança será avisada.")
            }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            ScrollView { ErrorStateView(message: error) { Task { await viewModel.load() } } }
        } else if let reassigned = viewModel.declinedReassigned {
            declinedState(reassigned: reassigned)
        } else if let task = viewModel.task {
            content(task: task)
        }
    }

    private func content(task: LifeGroupTask) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                Text(task.name)
                    .font(PazTypography.headlineSmall)
                    .foregroundStyle(PazColors.titleInk)

                GlassCard(radius: PazSpacing.cardRadiusCompact) {
                    VStack(alignment: .leading, spacing: PazSpacing.md) {
                        infoRow(icon: "person.3.fill", label: "Grupo", value: task.lifeGroupName)
                        infoRow(
                            icon: "calendar",
                            label: "Reunião",
                            value: brDateString(fromISODate: task.meetingDate)
                        )
                    }
                    .padding(PazSpacing.lg)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                if !task.description_.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    GlassCard(radius: PazSpacing.cardRadiusCompact) {
                        VStack(alignment: .leading, spacing: PazSpacing.sm) {
                            Text("Sobre a tarefa").font(PazTypography.titleSmall)
                            Text(task.description_)
                                .font(PazTypography.bodyMedium)
                                .foregroundStyle(PazColors.slate)
                        }
                        .padding(PazSpacing.lg)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                if !task.guidance.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    GlassCard(radius: PazSpacing.cardRadiusCompact) {
                        VStack(alignment: .leading, spacing: PazSpacing.sm) {
                            Text("Guia").font(PazTypography.titleSmall)
                            LifeGroupTaskMarkdownView(markdown: task.guidance)
                        }
                        .padding(PazSpacing.lg)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                VStack(spacing: PazSpacing.sm) {
                    if let declineError = viewModel.declineError {
                        Text(declineError)
                            .font(PazTypography.bodySmall)
                            .foregroundStyle(PazColors.error)
                    }
                    Button(role: .destructive) {
                        viewModel.declineTapped()
                    } label: {
                        Text(viewModel.isDeclining ? "Enviando..." : "Não posso")
                            .font(PazTypography.titleSmall)
                            .frame(maxWidth: .infinity)
                            .frame(height: PazSpacing.pillButtonHeight)
                            .foregroundStyle(.white)
                            .background(PazColors.error)
                            .clipShape(Capsule())
                    }
                    .disabled(viewModel.isDeclining)
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(PazSpacing.lg)
        }
    }

    private func infoRow(icon: String, label: String, value: String) -> some View {
        HStack(alignment: .top, spacing: PazSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(PazColors.accent)
                .frame(width: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text(label).font(PazTypography.labelMedium).foregroundStyle(PazColors.slate)
                Text(value).font(PazTypography.bodyMedium).foregroundStyle(PazColors.ink)
            }
        }
    }

    private func declinedState(reassigned: Bool) -> some View {
        VStack(spacing: PazSpacing.md) {
            Spacer()
            Text("Tarefa devolvida").font(PazTypography.titleMedium)
            Text(
                reassigned
                    ? "Tudo certo! Passamos a tarefa para outra pessoa do grupo e avisamos a liderança."
                    : "Tudo certo! A liderança foi avisada para encontrar outra pessoa."
            )
            .font(PazTypography.bodyMedium)
            .foregroundStyle(PazColors.slate)
            .multilineTextAlignment(.center)
            Button("Voltar") {
                dismiss()
            }
            .buttonStyle(.pazPillPrimary)
            Spacer()
        }
        .padding(PazSpacing.xl)
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: PazSpacing.lg) {
                SkeletonView().frame(height: 28).padding(.trailing, 120)
                SkeletonView().frame(height: 90)
                SkeletonView().frame(height: 160)
            }
            .padding(PazSpacing.lg)
        }
    }
}
