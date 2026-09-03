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
        UserRole.life_group_leader  -> "Líder de GV"
        UserRole.member             -> "Membro"
    }
