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
    val ministries: List<Ministry> = emptyList(),
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
data class Ministry(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val leader: String? = null,
    @SerialName("co_leader") val coLeader: String? = null,
)

@Serializable
data class LifeGroup(
    val id: String,
    val name: String,
    val leader: String? = null,
    val address: Address? = null,
    @SerialName("meeting_day") val meetingDay: String? = null,
    @SerialName("meeting_time") val meetingTime: String? = null,
    @SerialName("members_count") val membersCount: Int = 0,
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
