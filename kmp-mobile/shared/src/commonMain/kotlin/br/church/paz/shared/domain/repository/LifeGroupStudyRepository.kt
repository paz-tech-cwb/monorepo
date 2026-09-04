package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.LifeGroupStudy
import br.church.paz.shared.domain.model.LifeGroupStudyPage

interface LifeGroupStudyRepository {
    @Throws(Exception::class)
    suspend fun getStudies(page: Int = 1, limit: Int = 20): LifeGroupStudyPage

    @Throws(Exception::class)
    suspend fun getStudy(id: String): LifeGroupStudy

    @Throws(Exception::class)
    suspend fun createStudy(
        title: String,
        author: String,
        bodyMarkdown: String,
        imageUrl: String?,
    ): LifeGroupStudy

    @Throws(Exception::class)
    suspend fun updateStudy(
        id: String,
        title: String,
        author: String,
        bodyMarkdown: String,
        imageUrl: String?,
    ): LifeGroupStudy

    @Throws(Exception::class)
    suspend fun deleteStudy(id: String)
}
