package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.AcademyContent

interface AcademyRepository {
    suspend fun getAcademyContent(): Result<AcademyContent>
}
