package br.church.paz.android.navigation

sealed class Screen(
    val route: String,
) {
    data object Splash : Screen("splash")

    data object Shell : Screen("shell")

    data object Home : Screen("home")

    data object Search : Screen("search")

    data object VideoPlayer : Screen("video_player/{videoId}") {
        fun createRoute(videoId: String) = "video_player/$videoId"
    }

    data object Academy : Screen("academy")

    data object Account : Screen("account")

    data object Profile : Screen("profile")

    data object EditProfile : Screen("edit_profile")

    data object Agenda : Screen("agenda")

    data object AgendaDetail : Screen("agenda_detail/{eventId}") {
        fun createRoute(eventId: String) = "agenda_detail/$eventId"
    }

    data object MemberJourney : Screen("member_journey")

    data object Ministries : Screen("ministries")

    data object MinistryDetail : Screen("ministry_detail/{ministryId}") {
        fun createRoute(ministryId: String) = "ministry_detail/$ministryId"
    }

    data object LifeGroupDetail : Screen("life_group_detail/{lifeGroupId}") {
        fun createRoute(lifeGroupId: String) = "life_group_detail/$lifeGroupId"
    }

    data object FormulariosList : Screen("formularios")

    data object FormDetail : Screen("form_detail/{formId}") {
        fun createRoute(formId: String) = "form_detail/$formId"
    }

    data object FormSubmissionsList : Screen("form_submissions_list")

    data object FormSubmissionDetail : Screen("form_submission_detail/{submissionId}") {
        fun createRoute(submissionId: String) = "form_submission_detail/$submissionId"
    }

    data object NotificationPrefs : Screen("notification_prefs")

    data object AgendaList : Screen("agenda_list")

    data object LifeGroupStudyList : Screen("life_group_study_list")

    data object LifeGroupStudyDetail : Screen("life_group_study_detail/{studyId}") {
        fun createRoute(studyId: String) = "life_group_study_detail/$studyId"
    }

    data object LifeGroupStudyCreate : Screen("life_group_study_create")

    data object LifeGroupStudyEdit : Screen("life_group_study_edit/{studyId}") {
        fun createRoute(studyId: String) = "life_group_study_edit/$studyId"
    }
}
