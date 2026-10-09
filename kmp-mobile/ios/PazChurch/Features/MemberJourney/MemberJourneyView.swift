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
            } else if viewModel.shouldShowNoActiveTrackState {
                noActiveTrackState
            } else {
                contentState
            }
        }
        .background(PazColors.background.ignoresSafeArea())
        .navigationTitle("Minha Jornada")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
        .task { await viewModel.loadJourney() }
    }

    private func errorState(message: String) -> some View {
        ErrorStateView(message: message, onRetry: { viewModel.retry() })
    }

    private var noActiveTrackState: some View {
        VStack(spacing: PazSpacing.md) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 44, weight: .semibold))
                .foregroundStyle(PazColors.accent)
            Text("Você está em dia!")
                .font(PazTypography.titleMedium)
                .foregroundStyle(PazColors.ink)
            Text("Você já completou todas as etapas disponíveis para você no momento.")
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding(.horizontal, PazSpacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var contentState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                Spacer().frame(height: PazSpacing.lg)

                ForEach(viewModel.tracks, id: \.key) { track in
                    switch trackStatus(for: track) {
                    case .completed:
                        CollapsedTrackRow(track: track, isCompleted: true)
                    case .current:
                        JourneyTrackSection(track: track)
                            .overlay(
                                RoundedRectangle(cornerRadius: PazSpacing.cardRadiusCompact, style: .continuous)
                                    .strokeBorder(PazColors.accent, lineWidth: 2)
                            )
                    case .available:
                        CollapsedTrackRow(track: track, isCompleted: false)
                    }
                }

                Spacer().frame(height: PazSpacing.xl)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazMeshBackground())
        .refreshable { await viewModel.loadJourney() }
    }

    private enum TrackStatus { case completed, current, available }

    /// Status is derived purely from each track's own completion state, never from its
    /// position in the list (the tracks are not a linear progression — some, like
    /// baptism/member, run in parallel to the role chain).
    private func trackStatus(for track: JourneyTrack) -> TrackStatus {
        if track.progressPercentage >= 100 { return .completed }
        if track.key == viewModel.currentTrackKey { return .current }
        return .available
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
        .background(PazMeshBackground())
    }
}

private struct JourneyTrackSection: View {
    let track: JourneyTrack

    private var trackedSteps: [JourneyTrackStep] {
        track.steps.filter { $0.type != .informational }
    }

    private var completedTrackedSteps: Int {
        trackedSteps.filter { $0.completed }.count
    }

    var body: some View {
        GlassCard(radius: PazSpacing.cardRadiusCompact) {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(track.title)
                            .font(PazTypography.titleMedium)
                            .foregroundStyle(PazColors.ink)
                        if !trackedSteps.isEmpty {
                            Text("\(completedTrackedSteps)/\(trackedSteps.count) concluído")
                                .font(PazTypography.labelSmall)
                                .foregroundStyle(PazColors.slate)
                        }
                    }

                    if let description = track.description_, !description.isEmpty {
                        Text(description)
                            .font(PazTypography.bodySmall)
                            .foregroundStyle(PazColors.slate)
                    }

                    if !trackedSteps.isEmpty {
                        ProgressView(value: Double(track.progressPercentage) / 100)
                            .tint(PazColors.accent)
                    }
                }
                .padding(PazSpacing.lg)

                VStack(alignment: .leading, spacing: PazSpacing.md) {
                    ForEach(Array(track.steps.enumerated()), id: \.offset) { _, step in
                        JourneyStepRow(step: step)
                    }
                }
                .padding(.horizontal, PazSpacing.lg)
                .padding(.bottom, PazSpacing.lg)
            }
        }
    }
}

private struct CollapsedTrackRow: View {
    let track: JourneyTrack
    let isCompleted: Bool

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(isCompleted ? PazColors.accent : PazColors.slateLight)
            Text(track.title)
                .font(PazTypography.titleSmall)
                .foregroundStyle(isCompleted ? PazColors.ink : PazColors.slate)
            Spacer()
        }
        .padding(PazSpacing.lg)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}

private struct JourneyStepRow: View {
    let step: JourneyTrackStep

    var body: some View {
        HStack(alignment: .top, spacing: PazSpacing.md) {
            ZStack {
                Circle()
                    .fill(iconBackground.opacity(0.15))
                    .frame(width: 32, height: 32)

                Image(systemName: iconName)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(iconBackground)
            }

            VStack(alignment: .leading, spacing: PazSpacing.xs) {
                Text(step.title)
                    .font(PazTypography.bodyMedium)
                    .foregroundStyle(PazColors.ink)

                if let description = step.description_, !description.isEmpty {
                    Text(description)
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)
                }

                if !statusLabel.isEmpty {
                    Text(statusLabel)
                        .font(PazTypography.labelSmall)
                        .foregroundStyle(statusColor)
                }

                if step.type == .informational, let urlString = step.externalUrl, let url = URL(string: urlString) {
                    Link(destination: url) {
                        HStack(spacing: PazSpacing.xs) {
                            Text("Saiba mais")
                            Image(systemName: "arrow.up.right.square")
                        }
                        .font(PazTypography.labelMedium)
                        .foregroundStyle(PazColors.accent)
                    }
                }
            }

            Spacer()
        }
    }

    private var iconName: String {
        if step.type == .informational { return "info.circle.fill" }
        if step.completed { return "checkmark.circle.fill" }
        if step.type == .manualapproval { return "hourglass" }
        return "circle"
    }

    private var iconBackground: Color {
        if step.type == .informational { return PazColors.slate }
        if step.completed { return PazColors.accent }
        if step.type == .manualapproval { return PazColors.pazGold }
        return PazColors.slateLight
    }

    private var statusColor: Color {
        if step.completed { return PazColors.accent }
        if step.type == .manualapproval { return PazColors.pazGold }
        return PazColors.slate
    }

    private var statusLabel: String {
        if step.completed {
            if step.source == .manualapproval, let name = step.completedByName, !name.isEmpty {
                return "Concluído por \(name)"
            }
            return "Concluído"
        }
        if step.type == .manualapproval { return "Aguardando aprovação de um líder" }
        if step.type == .coursecompletion { return "Ainda não concluído" }
        return ""
    }
}

@MainActor
@Observable
class MemberJourneyViewModel {
    var tracks: [JourneyTrack] = []
    var currentTrackKey: String?
    var currentTrackComplete = false
    var isLoading = true
    var error: String?

    /// Show the "Você está em dia!" empty state when there's no track to focus on and
    /// nothing is actually in progress for this user — not just whenever `tracks` is
    /// non-empty, since the backend now returns all active tracks for everyone.
    var shouldShowNoActiveTrackState: Bool {
        tracks.isEmpty || (currentTrackKey == nil && tracks.allSatisfy { $0.progressPercentage >= 100 })
    }

    private let repository: MemberJourneyRepository

    init(repository: MemberJourneyRepository) {
        self.repository = repository
    }

    func loadJourney() async {
        do {
            let journey = try await repository.getMemberJourney()
            self.tracks = journey.tracks
            self.currentTrackKey = journey.currentTrackKey
            self.currentTrackComplete = journey.currentTrackComplete
            self.isLoading = false
        } catch {
            self.error = "Erro ao carregar jornada"
            self.isLoading = false
        }
    }

    func retry() {
        isLoading = true
        error = nil
        Task { await loadJourney() }
    }
}

#Preview {
    MemberJourneyView(memberJourneyRepository: IosAppContainer.shared.memberJourneyRepository)
}
