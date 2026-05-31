package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Church(
    val id: String,
    val name: String,
    val address: String? = null,
    val ministries: List<Ministry> = emptyList(),
)

@Serializable
data class Ministry(
    val id: String,
    val name: String,
    val description: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
)

@Serializable
data class LifeGroup(
    val id: String,
    val name: String,
    val leader: String? = null,
    val address: String? = null,
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
