import Observation
import Shared
import SwiftUI

private let progressCheckpointIntervalSeconds = 10

/// YouTube IFrame API error codes: `100`/`101`/`150` mean the video is genuinely unavailable
/// (not found, private, or embedding disabled by the owner) — only those justify falling back to
/// an external "Abrir no YouTube" link. Everything else (`2`, `5`, unknown codes) is treated as
/// transient/retryable, since the IFrame API can surface those for non-fatal reasons.
enum VideoPlaybackError: Equatable {
    case retryable
    case unavailable

    init(code: Int) {
        switch code {
        case 100, 101, 150:
            self = .unavailable
        default:
            self = .retryable
        }
    }
}

@MainActor
@Observable
class CourseDetailViewModel {
    var isLoading = true
    var course: CourseDetail?
    var error: String?
    var selectedLessonId: String?
    var playerError: VideoPlaybackError?

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

    func load(showLoading: Bool = true) async {
        if showLoading {
            isLoading = true
            error = nil
        }
        do {
            let detail = try await courseRepository.getCourseDetail(courseId: courseId)
            course = detail
            if selectedLessonId == nil {
                selectedLessonId = detail.lessons.first?.id
            }
        } catch {
            if showLoading {
                self.error = error.localizedDescription
            }
        }
        isLoading = false
    }

    func onSelectLesson(_ lessonId: String) {
        lastReportedAtSeconds = 0
        playerError = nil
        selectedLessonId = lessonId
    }

    func onPlayerError(code: Int) {
        playerError = VideoPlaybackError(code: code)
    }

    /// Clears the error state so the player view is recreated and retries loading.
    func onRetryPlayback() {
        playerError = nil
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
                await load(showLoading: false)
            } catch {
                // Best-effort checkpoint — a transient failure here shouldn't interrupt playback.
            }
        }
    }
}
