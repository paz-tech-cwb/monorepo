package br.church.paz.shared.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class LifeGroupAttendanceEntry(
    val userId: Int,
    val name: String,
    val present: Boolean,
)

@Serializable
data class LifeGroupAttendance(
    val id: String?,
    val lifeGroupId: Int,
    val meetingDate: String,
    val presentCount: Int,
    val membersCount: Int,
    val entries: List<LifeGroupAttendanceEntry>,
    val isDraft: Boolean,
)
