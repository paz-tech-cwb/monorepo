package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.OnboardingStep

interface OnboardingRepository {
    @Throws(Exception::class)
    suspend fun missingSteps(): List<OnboardingStep>
    suspend fun lookupCep(cep: String): CepLookupOutcome
    suspend fun submitBirthday(birthDate: String): Result<Unit>
    suspend fun submitWhatsapp(phone: String): Result<Unit>
    suspend fun submitAddress(
        street: String,
        number: String,
        complement: String?,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
    ): Result<Unit>
}
