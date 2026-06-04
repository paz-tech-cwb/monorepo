package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class HomeContent(
    val banners: List<Banner> = emptyList(),
    val agenda: List<AgendaEvent> = emptyList(),
    val contribution: ContributionSection? = null,
    val sectionOrder: List<String> = listOf("announcements", "contribution", "agenda"),
)

@Serializable
data class Banner(
    val id: String,
    val title: String,
    @SerialName("image_url") val imageUrl: String,
    @SerialName("action_url") val actionUrl: String? = null,
)

@Serializable
data class ContributionSection(
    val bank: BankInfo,
)

@Serializable
data class BankInfo(
    val name: String,
    @SerialName("pix_key") val pixKey: String? = null,
    val agency: String? = null,
    val account: String? = null,
    val cnpj: String? = null,
)
