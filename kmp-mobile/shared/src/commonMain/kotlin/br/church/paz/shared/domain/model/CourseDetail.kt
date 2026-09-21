package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CourseDetail(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    val url: String? = null,
    val lessons: List<Lesson> = emptyList(),
    val questionnaire: QuestionnaireSummary? = null,
    @SerialName("questionnaire_unlocked") val questionnaireUnlocked: Boolean = false,
    val certificate: Certificate? = null,
)

@Serializable
data class Lesson(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("youtube_video_id") val youtubeVideoId: String,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("my_progress") val myProgress: LessonProgress = LessonProgress(),
)

@Serializable
data class LessonProgress(
    @SerialName("max_watched_percentage") val maxWatchedPercentage: Int = 0,
    @SerialName("last_position_seconds") val lastPositionSeconds: Int = 0,
    val completed: Boolean = false,
)

@Serializable
data class QuestionnaireSummary(
    val id: String,
    val title: String,
    @SerialName("question_count") val questionCount: Int = 0,
    @SerialName("passing_score_percentage") val passingScorePercentage: Int = 0,
    @SerialName("attempts_used") val attemptsUsed: Int = 0,
)

@Serializable
data class Questionnaire(
    val id: String,
    @SerialName("course_id") val courseId: String,
    val title: String,
    val description: String? = null,
    @SerialName("passing_score_percentage") val passingScorePercentage: Int = 0,
    @SerialName("max_attempts") val maxAttempts: Int? = null,
    val questions: List<Question> = emptyList(),
)

/**
 * Member-facing question — deliberately has no `is_correct` field anywhere in this model tree,
 * matching the backend's stripped member response (see `CourseQuestionnairesService.findForCourseMember`).
 */
@Serializable
data class Question(
    val id: String,
    val text: String,
    val type: String,
    @SerialName("sort_order") val sortOrder: Int = 0,
    val points: Int = 1,
    val options: List<QuestionOption> = emptyList(),
) {
    val isSingleChoice: Boolean get() = type == "single_choice"
    val isMultipleChoice: Boolean get() = type == "multiple_choice"
    val isFreeText: Boolean get() = type == "free_text"
}

@Serializable
data class QuestionOption(
    val id: String,
    val text: String,
    @SerialName("sort_order") val sortOrder: Int = 0,
)

@Serializable
data class QuestionnaireResult(
    @SerialName("score_percentage") val scorePercentage: Int,
    val passed: Boolean,
    @SerialName("passing_score_percentage") val passingScorePercentage: Int,
    @SerialName("attempt_number") val attemptNumber: Int,
    val certificate: Certificate? = null,
)

@Serializable
data class Certificate(
    val id: String,
    @SerialName("certificate_code") val certificateCode: String,
    @SerialName("issued_at") val issuedAt: String,
    @SerialName("score_percentage") val scorePercentage: Int,
)
