package br.church.paz.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CasaDePazLesson(
    val week: Int,
    val title: String,
    val summary: String,
    val guidelines: String,
    val questions: List<String> = emptyList(),
    @SerialName("youtube_url") val youtubeUrl: String? = null,
)

// Parses a YouTube video id out of the common URL forms this codebase
// accepts from leaders ("watch?v=", "youtu.be/", "/embed/"). Returns null
// for anything else/malformed so the UI can fall back to an external-link
// button instead. Mirrors the inverse of AcademyVideo.youtubeUrl, which
// derives a "watch?v=" URL from a known-good id.
val CasaDePazLesson.youtubeVideoId: String?
    get() {
        val url = youtubeUrl?.trim()
        if (url.isNullOrEmpty()) return null

        val watchMarker = "watch?v="
        val shortMarker = "youtu.be/"
        val embedMarker = "/embed/"

        val markerIndex =
            when {
                url.contains(watchMarker) -> url.indexOf(watchMarker) + watchMarker.length
                url.contains(shortMarker) -> url.indexOf(shortMarker) + shortMarker.length
                url.contains(embedMarker) -> url.indexOf(embedMarker) + embedMarker.length
                else -> return null
            }

        val remainder = url.substring(markerIndex)
        val id = remainder.takeWhile { it != '&' && it != '?' && it != '/' && it != '#' }

        return id.takeIf { it.isNotBlank() }
    }
