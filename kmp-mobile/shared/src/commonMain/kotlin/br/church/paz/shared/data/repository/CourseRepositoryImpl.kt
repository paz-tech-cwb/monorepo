package br.church.paz.shared.data.repository

import br.church.paz.shared.data.remote.throwOnClientOrServerError
import br.church.paz.shared.domain.model.Certificate
import br.church.paz.shared.domain.model.CourseDetail
import br.church.paz.shared.domain.model.Lesson
import br.church.paz.shared.domain.model.LessonProgress
import br.church.paz.shared.domain.model.Question
import br.church.paz.shared.domain.model.QuestionOption
import br.church.paz.shared.domain.model.Questionnaire
import br.church.paz.shared.domain.model.QuestionnaireResult
import br.church.paz.shared.domain.model.QuestionnaireSummary
import br.church.paz.shared.domain.repository.CourseCertificateEntry
import br.church.paz.shared.domain.repository.CourseRepository
import br.church.paz.shared.domain.repository.QuestionnaireAnswerInput
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class CourseRepositoryImpl(private val client: HttpClient) : CourseRepository {

    @Throws(Exception::class)
    override suspend fun getCourseDetail(courseId: String): CourseDetail {
        val response = client.get("api/academy/courses/$courseId")
        response.throwOnClientOrServerError()
        val dto: CourseDetailDto = response.body()
        return dto.toDomain()
    }

    @Throws(Exception::class)
    override suspend fun reportLessonProgress(
        lessonId: String,
        watchedPercentage: Int,
        positionSeconds: Int,
    ) {
        val response = client.post("api/academy/lessons/$lessonId/progress") {
            contentType(ContentType.Application.Json)
            setBody(ReportLessonProgressRequest(watchedPercentage, positionSeconds))
        }
        response.throwOnClientOrServerError()
    }

    @Throws(Exception::class)
    override suspend fun getQuestionnaire(courseId: String): Questionnaire {
        val response = client.get("api/academy/courses/$courseId/questionnaire")
        response.throwOnClientOrServerError()
        val dto: QuestionnaireDto = response.body()
        return dto.toDomain()
    }

    @Throws(Exception::class)
    override suspend fun submitQuestionnaire(
        courseId: String,
        answers: List<QuestionnaireAnswerInput>,
    ): QuestionnaireResult {
        val response = client.post("api/academy/courses/$courseId/questionnaire/submit") {
            contentType(ContentType.Application.Json)
            setBody(
                SubmitQuestionnaireRequest(
                    answers = answers.map {
                        QuestionnaireAnswerRequest(
                            questionId = it.questionId,
                            optionIds = it.optionIds.ifEmpty { null },
                            text = it.text,
                        )
                    },
                ),
            )
        }
        response.throwOnClientOrServerError()
        val dto: QuestionnaireResultDto = response.body()
        return dto.toDomain()
    }

    @Throws(Exception::class)
    override suspend fun listCertificates(): List<CourseCertificateEntry> {
        val academyResponse = client.get("api/academy")
        academyResponse.throwOnClientOrServerError()
        val academy: AcademyForCertificatesDto = academyResponse.body()

        val certifiedCourses = academy.tracks
            .flatMap { it.courses }
            .filter { it.hasCertificate }

        return certifiedCourses.mapNotNull { course ->
            val detail = runCatching { getCourseDetail(course.id) }.getOrNull()
            val certificate = detail?.certificate ?: return@mapNotNull null
            CourseCertificateEntry(
                courseId = course.id,
                courseTitle = course.title,
                certificate = certificate,
            )
        }
    }
}

@Serializable
private data class ReportLessonProgressRequest(
    @SerialName("watched_percentage") val watchedPercentage: Int,
    @SerialName("position_seconds") val positionSeconds: Int,
)

@Serializable
private data class QuestionnaireAnswerRequest(
    @SerialName("question_id") val questionId: String,
    @SerialName("option_ids") val optionIds: List<String>? = null,
    val text: String? = null,
)

@Serializable
private data class SubmitQuestionnaireRequest(
    val answers: List<QuestionnaireAnswerRequest>,
)

@Serializable
private data class CourseDetailDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    val url: String? = null,
    val lessons: List<LessonDto> = emptyList(),
    val questionnaire: QuestionnaireSummaryDto? = null,
    @SerialName("questionnaire_unlocked") val questionnaireUnlocked: Boolean = false,
    val certificate: CertificateDto? = null,
) {
    fun toDomain() = CourseDetail(
        id = id,
        title = title,
        description = description,
        thumbnailUrl = thumbnailUrl,
        url = url,
        lessons = lessons.map { it.toDomain() },
        questionnaire = questionnaire?.toDomain(),
        questionnaireUnlocked = questionnaireUnlocked,
        certificate = certificate?.toDomain(),
    )
}

@Serializable
private data class LessonDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("youtube_video_id") val youtubeVideoId: String,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("my_progress") val myProgress: LessonProgressDto = LessonProgressDto(),
) {
    fun toDomain() = Lesson(
        id = id,
        title = title,
        description = description,
        youtubeVideoId = youtubeVideoId,
        durationSeconds = durationSeconds,
        sortOrder = sortOrder,
        myProgress = myProgress.toDomain(),
    )
}

@Serializable
private data class LessonProgressDto(
    @SerialName("max_watched_percentage") val maxWatchedPercentage: Int = 0,
    @SerialName("last_position_seconds") val lastPositionSeconds: Int = 0,
    val completed: Boolean = false,
) {
    fun toDomain() = LessonProgress(
        maxWatchedPercentage = maxWatchedPercentage,
        lastPositionSeconds = lastPositionSeconds,
        completed = completed,
    )
}

@Serializable
private data class QuestionnaireSummaryDto(
    val id: String,
    val title: String,
    @SerialName("question_count") val questionCount: Int = 0,
    @SerialName("passing_score_percentage") val passingScorePercentage: Int = 0,
    @SerialName("attempts_used") val attemptsUsed: Int = 0,
) {
    fun toDomain() = QuestionnaireSummary(
        id = id,
        title = title,
        questionCount = questionCount,
        passingScorePercentage = passingScorePercentage,
        attemptsUsed = attemptsUsed,
    )
}

@Serializable
private data class CertificateDto(
    val id: String,
    @SerialName("certificate_code") val certificateCode: String,
    @SerialName("issued_at") val issuedAt: String,
    @SerialName("score_percentage") val scorePercentage: Int,
) {
    fun toDomain() = Certificate(
        id = id,
        certificateCode = certificateCode,
        issuedAt = issuedAt,
        scorePercentage = scorePercentage,
    )
}

@Serializable
private data class QuestionnaireDto(
    val id: String,
    @SerialName("course_id") val courseId: String,
    val title: String,
    val description: String? = null,
    @SerialName("passing_score_percentage") val passingScorePercentage: Int = 0,
    @SerialName("max_attempts") val maxAttempts: Int? = null,
    val questions: List<QuestionDto> = emptyList(),
) {
    fun toDomain() = Questionnaire(
        id = id,
        courseId = courseId,
        title = title,
        description = description,
        passingScorePercentage = passingScorePercentage,
        maxAttempts = maxAttempts,
        questions = questions.map { it.toDomain() },
    )
}

@Serializable
private data class QuestionDto(
    val id: String,
    val text: String,
    val type: String,
    @SerialName("sort_order") val sortOrder: Int = 0,
    val points: Int = 1,
    val options: List<QuestionOptionDto> = emptyList(),
) {
    fun toDomain() = Question(
        id = id,
        text = text,
        type = type,
        sortOrder = sortOrder,
        points = points,
        options = options.map { it.toDomain() },
    )
}

@Serializable
private data class QuestionOptionDto(
    val id: String,
    val text: String,
    @SerialName("sort_order") val sortOrder: Int = 0,
) {
    fun toDomain() = QuestionOption(id = id, text = text, sortOrder = sortOrder)
}

@Serializable
private data class QuestionnaireResultDto(
    @SerialName("score_percentage") val scorePercentage: Int,
    val passed: Boolean,
    @SerialName("passing_score_percentage") val passingScorePercentage: Int,
    @SerialName("attempt_number") val attemptNumber: Int,
    val certificate: CertificateDto? = null,
) {
    fun toDomain() = QuestionnaireResult(
        scorePercentage = scorePercentage,
        passed = passed,
        passingScorePercentage = passingScorePercentage,
        attemptNumber = attemptNumber,
        certificate = certificate?.toDomain(),
    )
}

@Serializable
private data class AcademyForCertificatesDto(val tracks: List<AcademyTrackForCertificatesDto> = emptyList())

@Serializable
private data class AcademyTrackForCertificatesDto(val courses: List<AcademyCourseForCertificatesDto> = emptyList())

@Serializable
private data class AcademyCourseForCertificatesDto(
    val id: String,
    val title: String,
    @SerialName("has_certificate") val hasCertificate: Boolean = false,
)
