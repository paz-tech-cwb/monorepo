package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.AcademyContent

interface AcademyRepository {
    @Throws(Exception::class)
    suspend fun getAcademyContent(): AcademyContent
}
