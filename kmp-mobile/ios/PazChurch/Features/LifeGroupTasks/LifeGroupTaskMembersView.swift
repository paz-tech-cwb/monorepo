import Shared
import SwiftUI

/// Leader/co-leader screen: who takes part in the life group task rotation.
struct LifeGroupTaskMembersView: View {
    @State private var viewModel: LifeGroupTaskMembersViewModel
    @State private var expandedUserIds: Set<Int32> = []

    init(lifeGroupId: Int32, repository: LifeGroupTaskRepository) {
        _viewModel = State(
            initialValue: LifeGroupTaskMembersViewModel(lifeGroupId: lifeGroupId, repository: repository)
        )
    }

    var body: some View {
        screenContent
            .pazScreenBackground()
            .navigationTitle("Elegibilidade para tarefas")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            ScrollView { ErrorStateView(message: error) { Task { await viewModel.load() } } }
        } else {
            contentState
        }
    }

    private var contentState: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: PazSpacing.lg) {
                    Text("Defina quem participa do rodízio de tarefas das reuniões. A observação é visível apenas para a liderança.")
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)

                    settingsCard

                    if viewModel.drafts.isEmpty {
                        Text("Este grupo ainda não tem membros.")
                            .font(PazTypography.bodyMedium)
                            .foregroundStyle(PazColors.slate)
                            .frame(maxWidth: .infinity)
                            .padding(.top, PazSpacing.lg)
                    } else {
                        ForEach(viewModel.drafts) { draft in
                            memberCard(draft)
                        }
                    }
                }
                .padding(PazSpacing.lg)
            }
            .refreshable { await viewModel.load(showSkeleton: false) }

            saveBar
        }
    }

    private var settingsCard: some View {
        GlassCard(radius: PazSpacing.cardRadiusCompact) {
            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                Text("Presenças mínimas").font(PazTypography.titleSmall)
                Text("Membros novos entram no rodízio automaticamente após esse número de presenças neste grupo.")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)
                Stepper(
                    value: Binding(
                        get: { Int(viewModel.minPresentMeetings) },
                        set: { viewModel.setMinPresentMeetings(Int32($0)) }
                    ),
                    in: 0...Int(taskMinPresentMeetingsMax)
                ) {
                    Text("\(viewModel.minPresentMeetings)").font(PazTypography.titleMedium)
                }
            }
            .padding(PazSpacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func memberCard(_ draft: LifeGroupTaskMemberDraft) -> some View {
        let userId = draft.member.userId
        let isExpanded = expandedUserIds.contains(userId)
        return GlassCard(radius: PazSpacing.cardRadiusCompact) {
            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                HStack(spacing: PazSpacing.md) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(draft.member.name).font(PazTypography.titleSmall)
                        if let role = roleLabel(draft.member) {
                            Text(role).font(PazTypography.labelMedium).foregroundStyle(PazColors.slate)
                        }
                    }
                    Spacer()
                    Toggle(
                        "Elegível",
                        isOn: Binding(
                            get: { draft.eligible },
                            set: { viewModel.setEligible(userId: userId, $0) }
                        )
                    )
                    .labelsHidden()
                }

                Text(draft.sourceBadgeLabel)
                    .font(PazTypography.labelMedium)
                    .foregroundStyle(PazColors.accent)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(PazColors.accent.opacity(0.12))
                    .clipShape(Capsule())

                HStack(spacing: PazSpacing.md) {
                    Button(isExpanded ? "Ocultar detalhes" : "Detalhes") {
                        if isExpanded { expandedUserIds.remove(userId) } else { expandedUserIds.insert(userId) }
                    }
                    if draft.isManual, !draft.resetToAutomatic {
                        Button("Voltar ao automático") { viewModel.resetToAutomatic(userId: userId) }
                    }
                    if draft.resetToAutomatic {
                        Button("Desfazer") { viewModel.undoResetToAutomatic(userId: userId) }
                    }
                }
                .font(PazTypography.labelLarge)
                .foregroundStyle(PazColors.accent)
                .buttonStyle(.plain)

                if isExpanded { details(draft) }
            }
            .padding(PazSpacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private func details(_ draft: LifeGroupTaskMemberDraft) -> some View {
        let userId = draft.member.userId
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            Text("Observação (só a liderança vê)")
                .font(PazTypography.labelMedium)
                .foregroundStyle(PazColors.slate)
            TextField(
                "Observação",
                text: Binding(get: { draft.note }, set: { viewModel.setNote(userId: userId, $0) }),
                axis: .vertical
            )
            .lineLimit(2...4)
            .textFieldStyle(.roundedBorder)

            if !viewModel.templates.isEmpty {
                Text("Não pode receber estas tarefas").font(PazTypography.labelLarge)
                ForEach(viewModel.templates, id: \.templateId) { template in
                    Button {
                        viewModel.toggleExclusion(userId: userId, templateId: template.templateId)
                    } label: {
                        HStack(spacing: PazSpacing.sm) {
                            Image(
                                systemName: draft.excludedTemplateIds.contains(template.templateId)
                                    ? "checkmark.square.fill" : "square"
                            )
                            .foregroundStyle(PazColors.accent)
                            Text(template.name)
                                .font(PazTypography.bodyMedium)
                                .foregroundStyle(PazColors.ink)
                            Spacer()
                        }
                    }
                    .buttonStyle(.plain)
                }
            }

            if draft.noteChanged || draft.exclusionsChanged {
                Text("Ao salvar, a elegibilidade deste membro passa a ser uma decisão manual.")
                    .font(PazTypography.labelMedium)
                    .foregroundStyle(PazColors.slate)
            }
        }
    }

    private func roleLabel(_ member: LifeGroupTaskMember) -> String? {
        if member.isLeader { return "Líder" }
        if member.isCoLeader { return "Co-líder" }
        return nil
    }

    private var saveBar: some View {
        VStack(spacing: 8) {
            if let saveError = viewModel.saveError {
                Text(saveError).font(PazTypography.bodySmall).foregroundStyle(PazColors.error)
            }
            if let savedMessage = viewModel.savedMessage {
                Text(savedMessage).font(PazTypography.bodySmall).foregroundStyle(PazColors.success)
            }
            Button {
                Task { await viewModel.save() }
            } label: {
                Text(viewModel.isSaving ? "Salvando..." : "Salvar")
                    .font(PazTypography.titleSmall)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(PazColors.accent.opacity(viewModel.hasChanges ? 1 : 0.4))
                    .foregroundColor(.white)
                    .cornerRadius(14)
            }
            .disabled(viewModel.isSaving || !viewModel.hasChanges)
        }
        .padding(16)
    }

    private var loadingState: some View {
        ScrollView {
            VStack(spacing: 16) {
                ForEach(0..<5, id: \.self) { _ in SkeletonView().frame(height: 80) }
            }
            .padding(PazSpacing.lg)
        }
    }
}
