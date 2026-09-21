import Observation
import Shared
import SwiftUI

private let progressCheckpointIntervalSeconds = 10

@MainActor
@Observable
class CourseDetailViewModel {
    var isLoading = true
    var course: CourseDetail?
    var error: String?
    var selectedLessonId: String?

    private let courseId: String
    private let courseRepository: CourseRepository
    private var lastReportedAtSeconds = 0

    var selectedLesson: Lesson? {
        course?.lessons.first { $0.id == selectedLessonId } ?? course?.lessons.first
    }

    init(courseId: String, courseRepository: CourseRepository) {
        self.courseId = courseId
        self.courseRepository = courseRepository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let detail = try await courseRepository.getCourseDetail(courseId: courseId)
            course = detail
            if selectedLessonId == nil {
                selectedLessonId = detail.lessons.first?.id
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func onSelectLesson(_ lessonId: String) {
        lastReportedAtSeconds = 0
        selectedLessonId = lessonId
    }

    /// Called roughly every second by `GatedYouTubePlayerView`; only actually posts every ~10s.
    func onPlaybackTick(percentage: Int, positionSeconds: Int) {
        guard positionSeconds - lastReportedAtSeconds >= progressCheckpointIntervalSeconds else { return }
        lastReportedAtSeconds = positionSeconds
        reportProgress(percentage: percentage, positionSeconds: positionSeconds)
    }

    /// Called on pause/dispose — always flushes the latest position regardless of interval.
    func onPlaybackPaused(percentage: Int, positionSeconds: Int) {
        lastReportedAtSeconds = positionSeconds
        reportProgress(percentage: percentage, positionSeconds: positionSeconds)
    }

    private func reportProgress(percentage: Int, positionSeconds: Int) {
        guard let lessonId = selectedLessonId else { return }
        Task {
            do {
                try await courseRepository.reportLessonProgress(
                    lessonId: lessonId,
                    watchedPercentage: Int32(percentage),
                    positionSeconds: Int32(positionSeconds)
                )
                await load()
            } catch {
                // Best-effort checkpoint — a transient failure here shouldn't interrupt playback.
            }
        }
    }
}
