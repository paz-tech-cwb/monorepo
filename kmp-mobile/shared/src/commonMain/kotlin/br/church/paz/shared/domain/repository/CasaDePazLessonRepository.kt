package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.CasaDePazLesson

// READ-ONLY on mobile — editing lesson content is admin-ui only.
interface CasaDePazLessonRepository {
    @Throws(Exception::class)
    suspend fun getLessons(): List<CasaDePazLesson>
}
