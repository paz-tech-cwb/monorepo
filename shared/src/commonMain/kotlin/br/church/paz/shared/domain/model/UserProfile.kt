package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UpdateProfileRequest(
    val name: String? = null,
    val picture: String? = null,
    val phone: String? = null,
    @SerialName("birth_date") val birthDate: String? = null,
)

@Serializable
data class NotificationPreferences(
    @SerialName("events_enabled")         val eventsEnabled: Boolean = true,
    @SerialName("announcements_enabled")  val announcementsEnabled: Boolean = true,
    @SerialName("life_group_enabled")     val lifeGroupEnabled: Boolean = true,
    @SerialName("academy_enabled")        val academyEnabled: Boolean = true,
    @SerialName("member_journey_enabled") val memberJourneyEnabled: Boolean = true,
    @SerialName("contributions_enabled")  val contributionsEnabled: Boolean = true,
    @SerialName("os_permission_status")   val osPermissionStatus: String = "not_determined",
)

@Serializable
data class UpdateNotificationPrefsDto(
    @SerialName("events_enabled")         val eventsEnabled: Boolean? = null,
    @SerialName("announcements_enabled")  val announcementsEnabled: Boolean? = null,
    @SerialName("life_group_enabled")     val lifeGroupEnabled: Boolean? = null,
    @SerialName("academy_enabled")        val academyEnabled: Boolean? = null,
    @SerialName("member_journey_enabled") val memberJourneyEnabled: Boolean? = null,
    @SerialName("contributions_enabled")  val contributionsEnabled: Boolean? = null,
    @SerialName("os_permission_status")   val osPermissionStatus: String? = null,
)

@Serializable
data class DeviceToken(
    val token: String,
    val platform: DevicePlatform,
)

@Serializable
enum class DevicePlatform {
    @SerialName("android") android,
    @SerialName("ios")     ios,
}
