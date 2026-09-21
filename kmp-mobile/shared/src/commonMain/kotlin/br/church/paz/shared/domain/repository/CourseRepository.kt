package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.Certificate
import br.church.paz.shared.domain.model.CourseDetail
import br.church.paz.shared.domain.model.Questionnaire
import br.church.paz.shared.domain.model.QuestionnaireResult

/** A single member's answer to one questionnaire question, ready to submit to the backend. */
data class QuestionnaireAnswerInput(
    val questionId: String,
    val optionIds: List<String> = emptyList(),
    val text: String? = null,
)

interface CourseRepository {
    @Throws(Exception::class)
    suspend fun getCourseDetail(courseId: String): CourseDetail

    @Throws(Exception::class)
    suspend fun reportLessonProgress(
        lessonId: String,
        watchedPercentage: Int,
        positionSeconds: Int,
    )

    @Throws(Exception::class)
    suspend fun getQuestionnaire(courseId: String): Questionnaire

    @Throws(Exception::class)
    suspend fun submitQuestionnaire(
        courseId: String,
        answers: List<QuestionnaireAnswerInput>,
    ): QuestionnaireResult

    /**
     * There is no dedicated "list my certificates" backend endpoint (only a per-course
     * certificate on [getCourseDetail] and a `has_certificate` flag on `/api/academy`) — this
     * derives the list from those two existing endpoints instead of adding a new backend route.
     */
    @Throws(Exception::class)
    suspend fun listCertificates(): List<CourseCertificateEntry>
}

data class CourseCertificateEntry(
    val courseId: String,
    val courseTitle: String,
    val certificate: Certificate,
)
