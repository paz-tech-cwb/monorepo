package br.church.paz.shared.data.repository

import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.BankInfo
import br.church.paz.shared.domain.model.Banner
import br.church.paz.shared.domain.model.ContributionSection
import br.church.paz.shared.domain.model.HomeContent
import br.church.paz.shared.domain.repository.HomeRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class HomeRepositoryImpl(private val client: HttpClient) : HomeRepository {

    @Throws(Exception::class)
    override suspend fun getHomeContent(): HomeContent {
        val response: HomeResponse = client.get("api/home").body()
        return response.toDomain()
    }

    private fun mockHomeContent() = HomeContent(
        banners = listOf(
            // imageUrl reused as subtitle for mock; badge text in actionUrl
            Banner(id = "1", title = "Culto da Família",  imageUrl = "Auditório Principal", actionUrl = "DOMINGO · 10H"),
            Banner(id = "2", title = "Escola de Líderes", imageUrl = "Inscrições abertas",  actionUrl = "ACADEMIA"),
            Banner(id = "3", title = "Culto de Oração",   imageUrl = "Templo Sede",         actionUrl = "QUARTA · 20H"),
        ),
        contribution = ContributionSection(
            bank = BankInfo(name = "Paz Church", pixKey = "pix@pazchurch.com.br"),
        ),
        agenda = listOf(
            AgendaEvent(id = "1", title = "Culto da Família", startDate = "2026-06-08T10:00", location = "Auditório Principal"),
            AgendaEvent(id = "2", title = "Grupo de Vida",    startDate = "2026-06-04T19:30", location = "Sala 3 — Bloco B"),
            AgendaEvent(id = "3", title = "Ensaio do Louvor", startDate = "2026-06-04T20:00", location = "Sala de Música"),
        ),
        sectionOrder = listOf("agenda", "announcements", "contribution"),
    )
}

// ── Wire DTOs kept for when the real API is restored ─────────────────────────

@Serializable
private data class HomeResponse(val sections: List<SectionDto> = emptyList()) {
    fun toDomain(): HomeContent {
        var banners = emptyList<Banner>()
        var agenda = emptyList<AgendaEvent>()
        var contribution: ContributionSection? = null
        val sorted = sections.sortedBy { it.order }
        for (section in sorted) {
            when (section.type) {
                "announcements" -> banners = section.items.mapNotNull { it.toBanner() }
                "contribution"  -> contribution = section.items.firstOrNull()?.toContribution()
                "agenda"        -> agenda = section.items.mapNotNull { it.toEvent() }
            }
        }
        return HomeContent(
            banners = banners,
            agenda = agenda,
            contribution = contribution,
            sectionOrder = sorted.map { it.type },
        )
    }
}

@Serializable
private data class SectionDto(val type: String, val items: List<ItemDto> = emptyList(), val order: Int = 0)

@Serializable
private data class ItemDto(
    val id: Int? = null,
    val title: String? = null,
    val imageUrl: String? = null,
    val actionUrl: String? = null,
    @SerialName("bank_name")      val bankName:      String? = null,
    @SerialName("branch_number")  val branchNumber:  String? = null,
    @SerialName("account_number") val accountNumber: String? = null,
    @SerialName("pix_key")        val pixKey:        String? = null,
    val date: String? = null,
) {
    fun toBanner(): Banner? {
        val id    = id    ?: return null
        val title = title ?: return null
        val img   = imageUrl ?: return null
        return Banner(id.toString(), title, img, actionUrl)
    }
    fun toContribution(): ContributionSection? {
        val name = bankName ?: return null
        return ContributionSection(BankInfo(name, pixKey, branchNumber, accountNumber))
    }
    fun toEvent(): AgendaEvent? {
        val id    = id    ?: return null
        val title = title ?: return null
        val date  = date  ?: return null
        return AgendaEvent(id.toString(), title, null, date, null, null, imageUrl)
    }
}
