package br.church.paz.android.ui.features.lifegroupanalytics

import br.church.paz.shared.domain.model.LifeGroupAttendancePoint
import br.church.paz.shared.domain.model.LifeGroupDistributionBucket

enum class DistributionTab { DAY, HOUR, NEIGHBORHOOD, CITY }

data class LifeGroupAnalyticsUiState(
    val isLoading: Boolean = true,
    val year: Int,
    val month: Int? = null,
    val lifeGroupId: Int? = null,
    val lifeGroups: List<Pair<Int, String>> = emptyList(),
    val attendanceRows: List<LifeGroupAttendancePoint> = emptyList(),
    val distributionTab: DistributionTab = DistributionTab.DAY,
    val byDay: List<LifeGroupDistributionBucket> = emptyList(),
    val byHour: List<LifeGroupDistributionBucket> = emptyList(),
    val byNeighborhood: List<LifeGroupDistributionBucket> = emptyList(),
    val byCity: List<LifeGroupDistributionBucket> = emptyList(),
    val error: String? = null,
) {
    val distributionForSelectedTab: List<LifeGroupDistributionBucket>
        get() =
            when (distributionTab) {
                DistributionTab.DAY -> byDay
                DistributionTab.HOUR -> byHour
                DistributionTab.NEIGHBORHOOD -> byNeighborhood
                DistributionTab.CITY -> byCity
            }
}

sealed class LifeGroupAnalyticsEffect {
    data object NavigateBack : LifeGroupAnalyticsEffect()
}
