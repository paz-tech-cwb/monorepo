package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class FormCatalogItem(
    @SerialName("slug") val id: String,
    @SerialName("name") val title: String,
    val description: String? = null,
    @SerialName("can_write") val canWrite: Boolean = false,
    @SerialName("can_read") val canRead: Boolean = false,
) {
    val type: FormType
        get() = try {
            // This is a bit of a hack since we don't have easy access to SerialName at runtime
            // but we can map the string ID back to the enum.
            when (id) {
                "member-registrations" -> FormType.member_registration
                "form-conversions" -> FormType.conversion
                "life-group-reports" -> FormType.life_group_report
                "sector-supervisor-reports" -> FormType.sector_supervisor_report
                "area-supervisor-reports" -> FormType.area_supervisor_report
                "multiplications" -> FormType.multiplication
                "service-reports" -> FormType.service_report
                "form-guests" -> FormType.guest
                else -> FormType.course
            }
        } catch (e: Exception) {
            FormType.course
        }
}

@Serializable
enum class FormType {
    @SerialName("member-registrations")         member_registration,
    @SerialName("form-conversions")             conversion,
    @SerialName("life-group-reports")           life_group_report,
    @SerialName("sector-supervisor-reports")    sector_supervisor_report,
    @SerialName("area-supervisor-reports")      area_supervisor_report,
    @SerialName("multiplications")              multiplication,
    @SerialName("service-reports")              service_report,
    @SerialName("form-guests")                  guest,
    @SerialName("course")                       course,
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
    @SerialName("report_type") val reportType: String,
    val period: String,
    @SerialName("atmosphere_team_id") val atmosphereTeamId: Int? = null,
    @SerialName("atmosphere_team_other") val atmosphereTeamOther: String? = null,
    @SerialName("atmosphere_responsible") val atmosphereResponsible: String,
    @SerialName("tadel_adults") val tadelAdults: Int = 0,
    @SerialName("tadel_kids") val tadelKids: Int = 0,
    @SerialName("vehicles_cars") val vehiclesCars: Int = 0,
    @SerialName("vehicles_motos") val vehiclesMotos: Int = 0,
    @SerialName("vehicles_bikes") val vehiclesBikes: Int = 0,
    @SerialName("vehicles_others") val vehiclesOthers: String? = null,
    @SerialName("volunteers_atmosfera") val volunteersAtmosfera: Int = 0,
    @SerialName("volunteers_louvor") val volunteersLouvor: Int = 0,
    @SerialName("volunteers_midia") val volunteersMiddia: Int = 0,
    @SerialName("volunteers_danca") val volunteersDanca: Int = 0,
    val notes: String? = null,
)

@Serializable
data class CourseForm(
    @SerialName("course_name") val courseName: String,
    @SerialName("member_id") val memberId: String,
    @SerialName("enrolled_at") val enrolledAt: String,
)

@Serializable
data class LifeGroupReportForm(
    @SerialName("life_group_id") val lifeGroupId: String,
    val date: String,
    val attendees: Int,
    val visitors: Int,
    val offerings: Double? = null,
    val observations: String? = null,
)
