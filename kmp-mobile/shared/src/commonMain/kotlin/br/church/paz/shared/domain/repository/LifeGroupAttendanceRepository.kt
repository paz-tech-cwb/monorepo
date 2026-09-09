package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.LifeGroupAttendance
import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry

interface LifeGroupAttendanceRepository {
    @Throws(Exception::class)
    suspend fun getHistory(lifeGroupId: Int): List<LifeGroupAttendance>

    @Throws(Exception::class)
    suspend fun getByDate(lifeGroupId: Int, date: String): LifeGroupAttendance

    // Takes the same entry model used for reads (only userId/present are sent
    // to the backend) — avoids bridging a generic Kotlin Pair<Int, Boolean>
    // across to Swift, which has awkward interop.
    @Throws(Exception::class)
    suspend fun save(
        lifeGroupId: Int,
        date: String,
        entries: List<LifeGroupAttendanceEntry>,
    ): LifeGroupAttendance
}
