package br.church.paz.android.navigation

sealed class Screen(val route: String) {
    data object Splash   : Screen("splash")
    data object Login    : Screen("login")
    data object Shell    : Screen("shell")
    data object Home     : Screen("home")
    data object Academy  : Screen("academy")
    data object Account  : Screen("account")
    data object Profile  : Screen("profile")
    data object EditProfile      : Screen("edit_profile")
    data object Agenda   : Screen("agenda")
    data object AgendaDetail : Screen("agenda_detail/{eventId}") {
        fun createRoute(eventId: String) = "agenda_detail/$eventId"
    }
    data object MemberJourney    : Screen("member_journey")
    data object MeetingReport    : Screen("meeting_report")
    data object Ministries       : Screen("ministries")
    data object FormulariosList  : Screen("formularios")
    data object FormDetail : Screen("form_detail/{formId}") {
        fun createRoute(formId: String) = "form_detail/$formId"
    }
    data object NotificationPrefs: Screen("notification_prefs")
}
