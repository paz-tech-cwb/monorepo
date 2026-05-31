package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AcademyContent(
    val videos: List<AcademyVideo> = emptyList(),
)

@Serializable
data class AcademyVideo(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("youtube_id") val youtubeId: String,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    @SerialName("view_count") val viewCount: Int? = null,
    val category: String? = null,
    val author: String? = null,
    @SerialName("published_at") val publishedAt: String? = null,
) {
    val youtubeUrl: String get() = "https://www.youtube.com/watch?v=$youtubeId"
    val durationFormatted: String? get() = durationSeconds?.let {
        val m = it / 60; val s = it % 60
        "${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}"
    }
}
