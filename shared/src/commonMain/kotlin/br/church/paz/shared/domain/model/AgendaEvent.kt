package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AgendaEvent(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("start_date") val startDate: String,
    @SerialName("end_date") val endDate: String? = null,
    val location: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("recurrence_type") val recurrenceType: String? = null,
)
