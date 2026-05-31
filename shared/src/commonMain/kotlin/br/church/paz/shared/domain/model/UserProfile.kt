package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UpdateProfileRequest(
    val name: String? = null,
    val picture: String? = null,
)

@Serializable
data class NotificationPreferences(
    @SerialName("events")         val events: Boolean = true,
    @SerialName("life_group")     val lifeGroup: Boolean = true,
    @SerialName("announcements")  val announcements: Boolean = true,
    @SerialName("reminders")      val reminders: Boolean = true,
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
