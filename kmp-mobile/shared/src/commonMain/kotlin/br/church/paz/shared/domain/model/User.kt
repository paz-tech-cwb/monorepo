package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val name: String,
    val email: String,
    val picture: String? = null,
    val role: UserRole = UserRole.member,
    val phone: String? = null,
    @SerialName("birth_date") val birthDate: String? = null,
    @SerialName("address_details") val addressDetails: UserAddressDetails? = null,
)

/**
 * Mirrors the backend's `address_details` object returned by `GET /users/me`
 * (see `UsersService.toAddressResponse`). `null` on the parent [User] means the
 * member has no address on file yet — used by onboarding to determine
 * [OnboardingStep.Address] completion.
 */
@Serializable
data class UserAddressDetails(
    @SerialName("zip_code") val zipCode: String? = null,
    val country: String? = null,
    val state: String? = null,
    val city: String? = null,
    val neighborhood: String? = null,
    val street: String? = null,
    val number: String? = null,
    val complement: String? = null,
)

@Serializable
enum class UserRole {
    @SerialName("admin")          admin,
    @SerialName("pastor")         pastor,
    @SerialName("area_leader")    area_leader,
    @SerialName("sector_leader")  sector_leader,
    @SerialName("life_group_leader") life_group_leader,
    @SerialName("member")         member,
}

val UserRole.isLeader: Boolean
    get() = this != UserRole.member

val UserRole.displayName: String
    get() = when (this) {
        UserRole.admin              -> "Admin"
        UserRole.pastor             -> "Pastor"
        UserRole.area_leader        -> "Líder de Área"
        UserRole.sector_leader      -> "Líder de Setor"
        UserRole.life_group_leader  -> "Líder de Life Group"
        UserRole.member             -> "Membro"
    }
