package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Address(
    val street: String? = null,
    val number: String? = null,
    val complement: String? = null,
    val neighborhood: String? = null,
    val city: String,
    val state: String,
    @SerialName("zip_code") val zipCode: String? = null,
) {
    val fullAddress: String
        get() = buildString {
            street?.let { append(it) }
            number?.let { if (it.isNotBlank()) append(", $it") }
            neighborhood?.let { if (it.isNotBlank()) append(" - $it") }
            if (isNotBlank() && (city.isNotBlank() || state.isNotBlank())) append(". ")
            if (city.isNotBlank()) append(city)
            if (city.isNotBlank() && state.isNotBlank()) append(", ")
            if (state.isNotBlank()) append(state)
        }

    private fun isNotBlank(): Boolean =
        !street.isNullOrBlank() || !number.isNullOrBlank() || !neighborhood.isNullOrBlank()
}

@Serializable
data class Church(
    val id: String,
    val name: String,
    val description: String? = null,
    val address: Address? = null,
    val contact: ChurchContact? = null,
    val schedule: ChurchSchedule? = null,
    @SerialName("social_media") val socialMedia: ChurchSocialMedia? = null,
)

@Serializable
data class ChurchContact(
    val email: String? = null,
    val phone: String? = null,
    val website: String? = null,
)

@Serializable
data class ChurchSchedule(
    val sunday: ChurchScheduleSlot? = null,
    val wednesday: ChurchScheduleSlot? = null,
    val friday: ChurchScheduleSlot? = null,
    val saturday: ChurchScheduleSlot? = null,
)

@Serializable
data class ChurchScheduleSlot(
    val label: String? = null,
    val time: String? = null,
)

@Serializable
data class ChurchSocialMedia(
    val instagram: String? = null,
    val facebook: String? = null,
    val youtube: String? = null,
)

@Serializable
data class MinistryUser(
    val id: Int,
    val name: String,
)

@Serializable
data class MinistryTeam(
    val id: Int,
    val name: String,
    @SerialName("ministry_id") val ministryId: Int,
    val leader: MinistryUser? = null,
    @SerialName("co_leader") val coLeader: MinistryUser? = null,
    val members: List<MinistryUser> = emptyList(),
)

@Serializable
data class Ministry(
    val id: Int,
    val name: String,
    val slug: String? = null,
    @SerialName("is_permanent") val isPermanent: Boolean = false,
    val description: String? = null,
    @SerialName("membership_mode") val membershipMode: String = "teams",
    val leader: MinistryUser? = null,
    @SerialName("co_leader") val coLeader: MinistryUser? = null,
    val teams: List<MinistryTeam> = emptyList(),
    val members: List<MinistryUser> = emptyList(),
)

@Serializable
data class LifeGroupMember(
    val id: Int,
    val name: String,
    val email: String = "",
)

@Serializable
data class LifeGroup(
    val id: Int,
    val name: String,
    @SerialName("leader_id") val leaderId: Int? = null,
    @SerialName("leader_name") val leader: String? = null,
    @SerialName("leader_phone") val leaderPhone: String? = null,
    @SerialName("co_leader_id") val coLeaderId: Int? = null,
    @SerialName("co_leader_name") val coLeaderName: String? = null,
    @SerialName("co_leader_phone") val coLeaderPhone: String? = null,
    @SerialName("sector_id") val sectorId: Int? = null,
    val location: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    @SerialName("meeting_day") val meetingDay: String? = null,
    @SerialName("meeting_time") val meetingTime: String? = null,
    @SerialName("member_count") val membersCount: Int = 0,
    @SerialName("kids_count") val kidsCount: Int = 0,
    // null = viewer isn't allowed to see the roster (not this group's
    // member/leader/admin); empty list = visible and genuinely has no members.
    val members: List<LifeGroupMember>? = null,
)

@Serializable
data class Area(
    val id: String,
    val name: String,
    @SerialName("leader_name") val leaderName: String? = null,
)

@Serializable
data class Sector(
    val id: String,
    val name: String,
    @SerialName("area_id") val areaId: String,
    @SerialName("leader_name") val leaderName: String? = null,
)
