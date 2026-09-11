package br.church.paz.shared.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class LifeGroupStudy(
    val id: String,
    val imageUrl: String? = null,
    val title: String,
    val author: String,
    val bodyMarkdown: String,
    val publishedById: String,
    val createdAt: String,
    val updatedAt: String,
)

data class LifeGroupStudyPage(
    val items: List<LifeGroupStudy> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 20,
) {
    val hasMore: Boolean get() = (page * limit) < total
}
