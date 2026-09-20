package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.CepLookupResult
import br.church.paz.shared.domain.model.OnboardingStep
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.OnboardingRepository
import br.church.paz.shared.util.safeRunCatching
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Brazil-only app: [submitAddress] always sends a hardcoded `country` since
 * ViaCEP never returns one and the backend's address DTO requires a
 * non-empty value. `zipCode` is normalized to 8 raw digits (no hyphen) to
 * match the backend's `varchar(8)` column.
 */
class OnboardingRepositoryImpl(
    private val httpClient: HttpClient,
    private val authRepository: AuthRepository,
) : OnboardingRepository {

    override suspend fun missingSteps(): List<OnboardingStep> {
        val user = authRepository.currentUser() ?: return emptyList()
        return buildList {
            if (user.birthDate.isNullOrBlank()) add(OnboardingStep.Birthday)
            if (user.phone.isNullOrBlank()) add(OnboardingStep.Whatsapp)
            if (user.addressDetails == null) add(OnboardingStep.Address)
        }
    }

    override suspend fun lookupCep(cep: String): CepLookupOutcome {
        val digits = cep.filter { it.isDigit() }
        return try {
            val response = httpClient.get("https://viacep.com.br/ws/$digits/json/")
            if (!response.status.isSuccess()) {
                return CepLookupOutcome.Error("HTTP ${response.status.value}")
            }
            val body: ViaCepResponse = response.body()
            if (body.erro == true) {
                CepLookupOutcome.NotFound
            } else {
                CepLookupOutcome.Found(
                    CepLookupResult(
                        street = body.logradouro.orEmpty(),
                        neighborhood = body.bairro.orEmpty(),
                        city = body.localidade.orEmpty(),
                        state = body.uf.orEmpty(),
                    ),
                )
            }
        } catch (e: Exception) {
            CepLookupOutcome.Error(e.message ?: "Unknown error")
        }
    }

    override suspend fun submitBirthday(birthDate: String): Result<Unit> = updateProfile(
        UpdateMeRequest(birthDate = birthDate),
    )

    override suspend fun submitWhatsapp(phone: String): Result<Unit> = updateProfile(
        UpdateMeRequest(phone = phone),
    )

    override suspend fun submitAddress(
        street: String,
        number: String,
        complement: String?,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
    ): Result<Unit> = updateProfile(
        UpdateMeRequest(
            address = AddressRequest(
                street = street,
                number = number,
                complement = complement,
                neighborhood = neighborhood,
                city = city,
                state = state,
                // Backend column is varchar(8); ViaCEP/user input may include a hyphen.
                zipCode = zipCode.filter { it.isDigit() },
                // ViaCEP never returns a country and the backend requires one —
                // this app only serves Brazilian churches, so it's always "Brasil".
                country = "Brasil",
            ),
        ),
    )

    private suspend fun updateProfile(request: UpdateMeRequest): Result<Unit> = safeRunCatching {
        val response = httpClient.put("api/users/me") {
            contentType(ContentType.Application.Json)
            setBody(request)
        }
        if (!response.status.isSuccess()) {
            throw IllegalStateException("HTTP ${response.status.value}")
        }
    }
}

@Serializable
private data class UpdateMeRequest(
    val phone: String? = null,
    @SerialName("birth_date") val birthDate: String? = null,
    val address: AddressRequest? = null,
)

@Serializable
private data class AddressRequest(
    val street: String,
    val number: String,
    val complement: String? = null,
    val neighborhood: String,
    val city: String,
    val state: String,
    @SerialName("zip_code") val zipCode: String,
    val country: String,
)

@Serializable
private data class ViaCepResponse(
    val logradouro: String? = null,
    val bairro: String? = null,
    val localidade: String? = null,
    val uf: String? = null,
    val erro: Boolean? = null,
)
