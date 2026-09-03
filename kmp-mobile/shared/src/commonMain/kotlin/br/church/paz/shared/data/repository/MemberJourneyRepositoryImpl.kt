package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.JourneyStep
import br.church.paz.shared.domain.model.JourneyStepStatus
import br.church.paz.shared.domain.model.MemberJourney
import br.church.paz.shared.domain.repository.MemberJourneyRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class MemberJourneyRepositoryImpl(private val client: HttpClient) : MemberJourneyRepository {

    @Throws(Exception::class)
    override suspend fun getMemberJourney(): MemberJourney {
        val dto: MemberJourneyResponseDto = client.get("api/member-journey/me").body()
        return MemberJourney(
            steps = dto.stages.mapIndexed { index, stage ->
                JourneyStep(
                    id = stage.stageKey,
                    title = stageKeyTitle(stage.stageKey),
                    description = stage.note,
                    order = index,
                    status = if (stage.completed) JourneyStepStatus.completed else JourneyStepStatus.pending,
                    completedAt = stage.completedAt,
                )
            },
        )
    }

    private fun stageKeyTitle(key: String): String = when (key) {
        "salvation" -> "Salvação"
        "registration" -> "Cadastro"
        "first_courses" -> "Primeiros Cursos"
        "discovery" -> "Evento de Descoberta"
        "life_group" -> "Life Group"
        "discipleship" -> "Discipulado"
        "water_baptism" -> "Batismo nas Águas"
        "disciple_maker" -> "Fazedor de Discípulos"
        else -> key
    }
}

@Serializable
private data class MemberJourneyResponseDto(
    @SerialName("member_id") val memberId: Int,
    @SerialName("member_name") val memberName: String,
    val stages: List<JourneyStageDto>,
)

@Serializable
private data class JourneyStageDto(
    @SerialName("stage_id") val stageId: Int,
    @SerialName("stage_key") val stageKey: String,
    val completed: Boolean,
    @SerialName("completed_at") val completedAt: String? = null,
    val note: String? = null,
)
