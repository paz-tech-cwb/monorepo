import Shared
import SwiftUI

struct CourseDetailView: View {
    let courseId: String
    @State private var viewModel: CourseDetailViewModel
    @Environment(\.dismiss) var dismiss

    init(courseId: String, courseRepository: CourseRepository) {
        self.courseId = courseId
        _viewModel = State(initialValue: CourseDetailViewModel(courseId: courseId, courseRepository: courseRepository))
    }

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading {
                loadingState
            } else if let error = viewModel.error {
                ErrorStateView(message: error, onRetry: { Task { await viewModel.load() } })
            } else if let course = viewModel.course {
                content(course: course)
            } else {
                ErrorStateView(message: "Curso não encontrado", onRetry: { Task { await viewModel.load() } })
            }
        }
        .background(PazMeshBackground().ignoresSafeArea())
        .navigationTitle(viewModel.course?.title ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .task { await viewModel.load() }
    }

    private func content(course: CourseDetail) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ZStack {
                    Color.black
                    if let lesson = viewModel.selectedLesson {
                        GatedYouTubePlayerView(
                            youtubeVideoId: lesson.youtubeVideoId,
                            onTick: { pct, seconds in
                                viewModel.onPlaybackTick(percentage: pct, positionSeconds: seconds)
                            },
                            onPause: { pct, seconds in viewModel.onPlaybackPaused(
                                percentage: pct,
                                positionSeconds: seconds
                            ) }
                        )
                    }
                }
                .aspectRatio(16 / 9, contentMode: .fit)
                .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: PazSpacing.sm) {
                    Text(viewModel.selectedLesson?.title ?? course.title)
                        .font(PazTypography.titleMedium)
                    if let description = course.description_, !description.isEmpty {
                        Text(description)
                            .font(PazTypography.bodySmall)
                            .foregroundStyle(PazColors.slate)
                    }
                }
                .padding(PazSpacing.lg)

                Text("Aulas")
                    .font(PazTypography.titleSmall)
                    .padding(.horizontal, PazSpacing.lg)
                    .padding(.bottom, PazSpacing.sm)

                VStack(spacing: PazSpacing.sm) {
                    ForEach(course.lessons, id: \.id) { lesson in
                        LessonRow(
                            lesson: lesson,
                            selected: lesson.id == viewModel.selectedLesson?.id,
                            onTap: { viewModel.onSelectLesson(lesson.id) }
                        )
                    }
                }
                .padding(.horizontal, PazSpacing.lg)

                QuestionnaireCta(course: course)
                    .padding(PazSpacing.lg)
            }
        }
    }

    private var loadingState: some View {
        VStack(spacing: PazSpacing.lg) {
            SkeletonView().frame(height: 200)
            SkeletonView().frame(width: 200, height: 24)
            ForEach(0..<3, id: \.self) { _ in SkeletonView().frame(height: 56) }
        }
        .padding(PazSpacing.lg)
    }
}

private struct LessonRow: View {
    let lesson: Lesson
    let selected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: PazSpacing.md) {
                ZStack {
                    Circle().fill(PazColors.accent.opacity(0.1))
                    Image(systemName: lesson.myProgress.completed ? "checkmark.circle.fill" : "play.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(lesson.myProgress.completed ? PazColors.success : PazColors.accent)
                }
                .frame(width: 28, height: 28)

                VStack(alignment: .leading, spacing: 4) {
                    Text(lesson.title)
                        .font(PazTypography.bodyMedium)
                        .foregroundStyle(PazColors.ink)
                        .lineLimit(2)
                    ProgressView(value: Double(lesson.myProgress.maxWatchedPercentage) / 100)
                        .tint(PazColors.accent)
                }
            }
            .padding(PazSpacing.md)
            .background(selected ? PazColors.accent.opacity(0.08) : PazColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: PazSpacing.cardRadiusCompact))
        }
        .buttonStyle(.plain)
    }
}

private struct QuestionnaireCta: View {
    let course: CourseDetail

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            NavigationLink {
                QuestionnaireView(courseId: course.id, courseRepository: IosAppContainer.shared.courseRepository)
            } label: {
                Text(course.certificate != nil ? "Ver certificado" : "Fazer questionário")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.pazPillPrimary)
            .disabled(!course.questionnaireUnlocked || course.questionnaire == nil)

            if !course.questionnaireUnlocked, course.questionnaire != nil {
                HStack(spacing: PazSpacing.xs) {
                    Image(systemName: "lock.fill").font(.system(size: 12))
                    Text("Assista pelo menos 90% de cada aula para liberar o questionário")
                        .font(PazTypography.labelSmall)
                }
                .foregroundStyle(PazColors.slate)
            }
        }
    }
}
