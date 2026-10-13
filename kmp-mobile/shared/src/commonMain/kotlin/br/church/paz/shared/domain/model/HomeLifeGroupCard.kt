package br.church.paz.shared.domain.model

/** One life group card on the home screen: the group plus its upcoming tasks (folded in). */
data class HomeLifeGroupCard(
    val group: LifeGroup,
    // True when the viewer is this group's leader or co-leader.
    val isLeadership: Boolean,
    // Upcoming assigned tasks of the viewer in this group; empty hides the tasks section.
    val tasks: List<LifeGroupTask>,
)

data class HomeLifeGroupCards(
    val cards: List<HomeLifeGroupCard>,
    // Groups beyond `maxCards` that are not rendered ("Ver todos (N)" shows cards + hidden).
    val hiddenCount: Int,
)

/**
 * The viewer's next assigned tasks: status ASSIGNED, meetingDate (ISO `yyyy-MM-dd`, so string
 * order == date order) on or after [today], soonest first, at most [limit].
 */
fun selectUpcomingLifeGroupTasks(
    tasks: List<LifeGroupTask>,
    today: String,
    limit: Int,
): List<LifeGroupTask> =
    tasks
        .filter { it.status == LifeGroupTaskStatus.ASSIGNED && it.meetingDate >= today }
        .sortedBy { it.meetingDate }
        .take(limit)

/**
 * Builds the home life group cards (one per group, tasks folded in by `lifeGroupId`).
 *
 * Order: groups the viewer leads or co-leads first, then by name (case-insensitive); stable, so
 * the backend's order breaks remaining ties. At most [maxCards] cards are returned and the rest
 * are counted in `hiddenCount`. Tasks whose group is not in [groups] are dropped.
 * Shared so Android and iOS cannot drift.
 */
fun buildHomeLifeGroupCards(
    currentUserId: Int?,
    groups: List<LifeGroup>,
    tasks: List<LifeGroupTask>,
    today: String,
    maxCards: Int,
    maxTasks: Int,
): HomeLifeGroupCards {
    val ordered =
        groups
            .map { group ->
                val leadership =
                    currentUserId != null && (group.leaderId == currentUserId || group.coLeaderId == currentUserId)
                group to leadership
            }.sortedWith(
                compareByDescending<Pair<LifeGroup, Boolean>> { it.second }
                    .thenBy { it.first.name.lowercase() },
            )
    val cards =
        ordered.take(maxCards).map { (group, leadership) ->
            HomeLifeGroupCard(
                group = group,
                isLeadership = leadership,
                tasks = selectUpcomingLifeGroupTasks(tasks.filter { it.lifeGroupId == group.id }, today, maxTasks),
            )
        }
    return HomeLifeGroupCards(cards = cards, hiddenCount = (ordered.size - cards.size).coerceAtLeast(0))
}

/** Titles of the home life group section ("Meus grupos"), shared so Android and iOS cannot drift. */
object HomeLifeGroupsSection {
    const val HEADER_SEVERAL = "MEUS GRUPOS"
    const val KICKER_SINGLE = "LIFE GROUP"
}

/**
 * How the home life groups render: ONE card for any number of groups. A single group keeps its
 * "LIFE GROUP" kicker and no section header (the original look); several groups get the
 * "MEUS GRUPOS" header and a divider between consecutive rows.
 */
data class HomeLifeGroupsLayout(
    val showsSectionHeader: Boolean,
    val showsRowKicker: Boolean,
    val dividerCount: Int,
)

fun homeLifeGroupsLayout(groupCount: Int): HomeLifeGroupsLayout =
    HomeLifeGroupsLayout(
        showsSectionHeader = groupCount > 1,
        showsRowKicker = groupCount == 1,
        dividerCount = (groupCount - 1).coerceAtLeast(0),
    )
