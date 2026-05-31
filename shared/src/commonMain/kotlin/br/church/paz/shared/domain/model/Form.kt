package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class FormCatalogItem(
    val id: String,
    val title: String,
    val description: String? = null,
    val type: FormType,
)

@Serializable
enum class FormType {
    @SerialName("member_registration")         member_registration,
    @SerialName("conversion")                  conversion,
    @SerialName("life_group_report")           life_group_report,
    @SerialName("sector_supervisor_report")    sector_supervisor_report,
    @SerialName("area_supervisor_report")      area_supervisor_report,
    @SerialName("multiplication")              multiplication,
    @SerialName("service_report")              service_report,
    @SerialName("guest")                       guest,
    @SerialName("course")                      course,
}

// ── Submission payloads ──────────────────────────────────────────────────────

@Serializable
data class MemberRegistrationForm(
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    @SerialName("life_group_id") val lifeGroupId: String? = null,
    @SerialName("sector_id") val sectorId: String? = null,
    @SerialName("area_id") val areaId: String? = null,
    @SerialName("leader_id") val leaderId: String? = null,
)

@Serializable
data class ConversionForm(
    val name: String,
    val phone: String? = null,
    val date: String,
    @SerialName("life_group_id") val lifeGroupId: String? = null,
    val observations: String? = null,
)

@Serializable
data class GuestForm(
    val name: String,
    val phone: String? = null,
    @SerialName("invited_by") val invitedBy: String? = null,
    val date: String,
)

@Serializable
data class MultiplicationForm(
    @SerialName("original_life_group_id") val originalLifeGroupId: String,
    @SerialName("new_life_group_name") val newLifeGroupName: String,
    @SerialName("new_leader_id") val newLeaderId: String,
    val date: String,
)

@Serializable
data class ServiceReportForm(
    val date: String,
    val attendees: Int,
    val visitors: Int,
    val offerings: Double? = null,
    val observations: String? = null,
)

@Serializable
data class CourseForm(
    @SerialName("course_name") val courseName: String,
    @SerialName("member_id") val memberId: String,
    @SerialName("enrolled_at") val enrolledAt: String,
)
