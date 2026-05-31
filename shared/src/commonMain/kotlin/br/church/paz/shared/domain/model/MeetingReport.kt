package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Submitted by a life-group leader after each meeting. */
@Serializable
data class MeetingReportRequest(
    @SerialName("life_group_id")  val lifeGroupId: String,
    val date: String,
    val attendees: Int,
    val visitors: Int,
    val offerings: Double? = null,
    val observations: String? = null,
)
