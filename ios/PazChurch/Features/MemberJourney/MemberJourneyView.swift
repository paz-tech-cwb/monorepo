import Observation
import Shared
import SwiftUI

struct MemberJourneyView: View {
    @State private var viewModel: MemberJourneyViewModel
    @Environment(\.dismiss) var dismiss

    init(memberJourneyRepository: MemberJourneyRepository) {
        _viewModel = State(initialValue: MemberJourneyViewModel(repository: memberJourneyRepository))
    }

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
                            Text("Minha Jornada")
                                .font(PazTypography.headlineMedium)
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, PazSpacing.lg)
                        .padding(.vertical, PazSpacing.md)
                    }
                    .background(PazColors.heroGradient)

                    // Content
                    if viewModel.isLoading {
                        loadingState
                    } else {
                        contentState
                    }
                }
                .background(PazColors.background)
            }
        }
        .navigationBarBackButtonHidden()
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

    private let repository: MemberJourneyRepository

    init(repository: MemberJourneyRepository) {
        self.repository = repository
        loadJourney()
    }

    private func loadJourney() {
        Task {
            do {
                let journey = try await repository.getMemberJourney()
                self.steps = ((journey.steps as? [JourneyStep]) ?? []).sorted { $0.order < $1.order }
                self.isLoading = false
            } catch {
                self.isLoading = false
            }
        }
    }
}

#Preview {
    MemberJourneyView(memberJourneyRepository: IosAppContainer.shared.memberJourneyRepository)
}
