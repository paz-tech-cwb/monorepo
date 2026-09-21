package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.AddressRequest
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.CepLookupResult
import br.church.paz.shared.domain.model.OnboardingStep
import br.church.paz.shared.domain.repository.OnboardingRepository
import br.church.paz.shared.domain.repository.UserRepository
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
    private val userRepository: UserRepository,
) : OnboardingRepository {

    /**
     * Belt-and-braces guard against a just-submitted step being re-asked. [missingSteps]
     * re-reads the server, so this is normally redundant — it only matters if a
     * `GET /users/me` races ahead of a write the server hasn't committed to its read
     * path yet.
     */
    private val locallyConfirmedSteps = mutableSetOf<OnboardingStep>()

    /**
     * Sources truth from `GET /users/me`, NOT from the cached login user: the
     * `/auth/social-login` response body only carries `id/name/email/picture/role`,
     * so `phone`, `birth_date` and `address_details` are always absent from it and
     * every step would be reported missing forever.
     *
     * Throws on network/auth failure rather than returning an empty list — callers
     * must surface a retryable error instead of silently skipping onboarding for a
     * member who still has missing fields.
     */
    @Throws(Exception::class)
    override suspend fun missingSteps(): List<OnboardingStep> {
        val user = userRepository.getProfile()
        return buildList {
            if (user.birthDate.isNullOrBlank() && OnboardingStep.Birthday !in locallyConfirmedSteps) {
                add(OnboardingStep.Birthday)
            }
            if (user.phone.isNullOrBlank() && OnboardingStep.Whatsapp !in locallyConfirmedSteps) {
                add(OnboardingStep.Whatsapp)
            }
            if (user.addressDetails == null && OnboardingStep.Address !in locallyConfirmedSteps) {
                add(OnboardingStep.Address)
            }
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
    ).onSuccess { locallyConfirmedSteps.add(OnboardingStep.Birthday) }

    override suspend fun submitWhatsapp(phone: String): Result<Unit> = updateProfile(
        UpdateMeRequest(phone = phone),
    ).onSuccess { locallyConfirmedSteps.add(OnboardingStep.Whatsapp) }

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
    ).onSuccess { locallyConfirmedSteps.add(OnboardingStep.Address) }

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
private data class ViaCepResponse(
    val logradouro: String? = null,
    val bairro: String? = null,
    val localidade: String? = null,
    val uf: String? = null,
    val erro: Boolean? = null,
)
