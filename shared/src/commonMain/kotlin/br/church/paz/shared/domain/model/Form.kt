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
data class GuestForm(
    @SerialName("full_name") val fullName: String,
    val email: String? = null,
    val phone: String? = null,
    @SerialName("invited_by") val invitedBy: String? = null,
    @SerialName("via_casa_de_paz") val viaCasaDePaz: Boolean = false,
    @SerialName("how_met_church") val howMetChurch: String? = null,
    val address: String? = null,
    val date: String,
)

@Serializable
data class MemberRegistrationForm(
    @SerialName("full_name") val fullName: String,
    @SerialName("birth_date") val birthDate: String,
    val phone: String,
    val gender: String,
    @SerialName("civil_state") val civilState: String,
    @SerialName("sector_id") val sectorId: Int,
    val email: String? = null,
    @SerialName("life_group_id") val lifeGroupId: Int? = null,
    val cep: String? = null,
    val street: String? = null,
    @SerialName("address_number") val addressNumber: String? = null,
    val complement: String? = null,
    val neighborhood: String? = null,
    val city: String? = null,
    val state: String? = null,
    val address: String? = null,
)

@Serializable
data class ConversionForm(
    @SerialName("full_name") val fullName: String,
    val email: String,
    val phone: String,
    @SerialName("decision_type") val decisionType: String,
    @SerialName("how_met_church") val howMetChurch: String,
    val gender: String,
    @SerialName("birth_date") val birthDate: String,
    @SerialName("civil_state") val civilState: String,
    val address: String,
    @SerialName("attendance_count") val attendanceCount: String,
    @SerialName("life_group_status") val lifeGroupStatus: String,
    @SerialName("life_group_leader_or_name") val lifeGroupLeaderOrName: String? = null,
    @SerialName("invited_by") val invitedBy: String? = null,
    val notes: String? = null,
)

@Serializable
data class MultiplicationForm(
    val date: String,
    @SerialName("source_life_group_id") val sourceLifeGroupId: Int,
    val area: String? = null,
    val sector: String? = null,
    @SerialName("new_life_group_name") val newLifeGroupName: String,
    @SerialName("new_leader_id") val newLeaderId: Int,
    @SerialName("host_id") val hostId: Int,
    @SerialName("leader_phone") val leaderPhone: String,
    @SerialName("meeting_day_time") val meetingDayTime: String,
    val address: String,
    @SerialName("members_to_move") val membersToMove: List<Int> = emptyList(),
    @SerialName("new_members") val newMembers: List<Int> = emptyList(),
    @SerialName("completed_leadership_track") val completedLeadershipTrack: Boolean = false,
    @SerialName("legally_married") val legallyMarried: Boolean? = null,
    @SerialName("faithful_tither") val faithfulTither: Boolean = false,
    @SerialName("evangelizing_and_consolidating") val evangelizingAndConsolidating: Boolean = false,
    @SerialName("good_testimony") val goodTestimony: Boolean = false,
    @SerialName("single_living_in_purity") val singleLivingInPurity: Boolean? = null,
)

@Serializable
data class SectorSupervisorReportForm(
    val date: String,
    @SerialName("sector_id") val sectorId: Int,
    @SerialName("area_id") val areaId: Int? = null,
    @SerialName("life_groups_visited") val lifeGroupsVisited: List<Int> = emptyList(),
    @SerialName("leaders_pastored") val leadersPastored: List<Int> = emptyList(),
    @SerialName("multiplication_candidates") val multiplicationCandidates: List<Int> = emptyList(),
    @SerialName("life_groups_count") val lifeGroupsCount: Int = 0,
    @SerialName("life_groups_supervised") val lifeGroupsSupervised: Int = 0,
    @SerialName("life_group_observations") val lifeGroupObservations: List<String> = emptyList(),
    @SerialName("sector_multiplication_date") val sectorMultiplicationDate: String? = null,
    val notes: String? = null,
)

@Serializable
data class AreaSupervisorReportForm(
    val date: String,
    @SerialName("area_id") val areaId: Int,
    @SerialName("sectors_visited") val sectorsVisited: List<Int> = emptyList(),
    @SerialName("sector_leaders_pastored") val sectorLeadersPastored: List<Int> = emptyList(),
    @SerialName("multiplications_in_progress") val multiplicationsInProgress: Int? = null,
    @SerialName("life_groups_count") val lifeGroupsCount: Int = 0,
    @SerialName("life_groups_supervised") val lifeGroupsSupervised: Int = 0,
    @SerialName("life_group_observations") val lifeGroupObservations: List<String> = emptyList(),
    val notes: String? = null,
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
data class ServiceReportSubmission(
    val id: String,
    val date: String,
    @SerialName("report_type") val reportType: String,
    val period: String,
    @SerialName("atmosphere_team_id") val atmosphereTeamId: Int? = null,
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
    @SerialName("submitted_by") val submittedBy: User? = null,
    @SerialName("created_at") val createdAt: String,
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
