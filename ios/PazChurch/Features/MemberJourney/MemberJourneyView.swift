import Observation
import Shared
import SwiftUI

struct MemberJourneyView: View {
    @State private var viewModel: MemberJourneyViewModel

    init(memberJourneyRepository: MemberJourneyRepository) {
        _viewModel = State(initialValue: MemberJourneyViewModel(repository: memberJourneyRepository))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                loadingState
            } else if let errorMessage = viewModel.error {
                errorState(message: errorMessage)
            } else if viewModel.steps.isEmpty {
                emptyState
            } else {
                contentState
            }
        }
        .background(PazColors.background.ignoresSafeArea())
        .navigationTitle("Minha Jornada")
        .navigationBarTitleDisplayMode(.large)
    }

    private func errorState(message: String) -> some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer()
            Text(message)
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)
                .multilineTextAlignment(.center)
            Button("Tentar Novamente") { viewModel.retry() }
                .font(PazTypography.titleSmall)
                .foregroundStyle(PazColors.pazPrimary)
            Spacer()
        }
        .padding(.horizontal, PazSpacing.lg)
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhuma etapa encontrada")
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)
            Spacer()
        }
    }

    private var contentState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                Spacer().frame(height: PazSpacing.lg)

                ForEach(viewModel.steps, id: \.id) { step in
                    JourneyStepRow(step: step)
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazColors.background)
    }

    private var loadingState: some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer().frame(height: PazSpacing.lg)
            ForEach(0..<4, id: \.self) { _ in
                HStack(spacing: PazSpacing.md) {
                    SkeletonView().frame(width: 40, height: 40).clipShape(Circle())
                    VStack(alignment: .leading, spacing: PazSpacing.sm) {
                        SkeletonView().frame(width: 100, height: 16)
                        SkeletonView().frame(height: 12)
                    }
                }
            }
            Spacer()
        }
        .padding(PazSpacing.lg)
        .background(PazColors.background)
    }
}

private struct JourneyStepRow: View {
    let step: JourneyStep

    var body: some View {
        HStack(alignment: .top, spacing: PazSpacing.md) {
            // Status indicator
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.12))
                    .frame(width: 40, height: 40)

                if step.status == .completed {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(PazColors.primary)
                } else if step.status == .inProgress {
                    Circle()
                        .fill(PazColors.primary)
                        .frame(width: 20, height: 20)
                } else {
                    Image(systemName: "circle")
                        .font(.system(size: 24))
                        .foregroundColor(.gray.opacity(0.5))
                }
            }

            // Content
            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                HStack {
                    Text(step.title)
                        .font(PazTypography.titleSmall)
                    Spacer()
                    Text(statusLabel)
                        .font(PazTypography.labelSmall)
                        .foregroundColor(statusLabelColor)
                }

                if let description = step.description_ {
                    Text(description)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(.gray)
                }

                if let completedAt = step.completedAt {
                    Text("Concluído em \(completedAt)")
                        .font(PazTypography.labelSmall)
                        .foregroundColor(.gray.opacity(0.7))
                }
            }

            Spacer()
        }
        .padding(PazSpacing.lg)
        .background(PazColors.surface)
        .cornerRadius(16)
    }

    private var statusColor: Color {
        step.status == .pending ? .gray : PazColors.primary
    }

    private var statusLabel: String {
        if step.status == .completed { return "Concluído" }
        if step.status == .inProgress { return "Em andamento" }
        return "Pendente"
    }

    private var statusLabelColor: Color {
        step.status == .pending ? .gray.opacity(0.5) : PazColors.primary
    }
}

@MainActor
@Observable
class MemberJourneyViewModel {
    var steps: [JourneyStep] = []
    var isLoading = true
    var error: String? = nil

    private let repository: MemberJourneyRepository

    init(repository: MemberJourneyRepository) {
        self.repository = repository
        loadJourney()
    }

    private func loadJourney() {
        Task {
            do {
                let journey = try await repository.getMemberJourney()
                self.steps = journey.steps.compactMap { $0 as? JourneyStep }
                    .sorted { $0.order < $1.order }
                self.isLoading = false
            } catch {
                self.error = "Erro ao carregar jornada"
                self.isLoading = false
            }
        }
    }

    func retry() {
        isLoading = true
        error = nil
        loadJourney()
    }
}

#Preview {
    MemberJourneyView(memberJourneyRepository: IosAppContainer.shared.memberJourneyRepository)
}
