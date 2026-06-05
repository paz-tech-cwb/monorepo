package br.church.paz.android.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import br.church.paz.android.ui.features.academy.VideoPlayerScreen
import br.church.paz.android.ui.features.agenda.AgendaDetailScreen
import br.church.paz.android.ui.features.agenda.AgendaListScreen
import br.church.paz.android.ui.features.auth.LoginScreen
import br.church.paz.android.ui.features.formularios.FormDetailScreen
import br.church.paz.android.ui.features.formularios.FormulariosScreen
import br.church.paz.android.ui.features.meetingreport.MeetingReportScreen
import br.church.paz.android.ui.features.memberjourney.MemberJourneyScreen
import br.church.paz.android.ui.features.ministries.LifeGroupDetailScreen
import br.church.paz.android.ui.features.ministries.MinistriesScreen
import br.church.paz.android.ui.features.ministries.MinistryDetailScreen
import br.church.paz.android.ui.features.notifications.NotificationPrefsScreen
import br.church.paz.android.ui.features.profile.EditProfileScreen
import br.church.paz.android.ui.features.profile.ProfileScreen
import br.church.paz.android.ui.features.splash.SplashScreen

@Composable
fun PazNavGraph(startDeepLinkRoute: String? = null) {
    val navController = rememberNavController()

    // When the app is opened from a notification tap, navigate to the target
    // screen after the graph is ready. We still start at Splash so auth state
    // is checked first; the navigation only fires after the graph is composed.
    LaunchedEffect(startDeepLinkRoute) {
        if (startDeepLinkRoute != null) {
            navController.navigate(startDeepLinkRoute)
        }
    }

    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route,
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToHome = { navController.navigate(Screen.Shell.route) { popUpTo(Screen.Splash.route) { inclusive = true } } },
            )
        }
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = { navController.popBackStack() },
            )
        }
        composable(Screen.Shell.route) {
            AppShell(rootNavController = navController)
        }
        composable(Screen.Profile.route) {
            ProfileScreen(navController = navController)
        }
        composable(Screen.EditProfile.route) {
            EditProfileScreen(navController = navController)
        }
        composable(
            route = Screen.AgendaDetail.route,
            arguments = listOf(androidx.navigation.navArgument("eventId") { type = androidx.navigation.NavType.StringType }),
        ) { backStackEntry ->
            val eventId = backStackEntry.arguments?.getString("eventId") ?: return@composable
            AgendaDetailScreen(navController = navController, eventId = eventId)
        }
        composable(
            route = Screen.VideoPlayer.route,
            arguments = listOf(androidx.navigation.navArgument("videoId") { type = androidx.navigation.NavType.StringType }),
        ) { backStackEntry ->
            val videoId = backStackEntry.arguments?.getString("videoId") ?: return@composable
            VideoPlayerScreen(navController = navController, videoId = videoId)
        }
        composable(Screen.FormulariosList.route) {
            FormulariosScreen(navController = navController)
        }
        composable(
            route = Screen.FormDetail.route,
            arguments = listOf(androidx.navigation.navArgument("formId") { type = androidx.navigation.NavType.StringType }),
        ) { backStackEntry ->
            val formId = backStackEntry.arguments?.getString("formId") ?: return@composable
            FormDetailScreen(navController = navController, formId = formId)
        }
        composable(Screen.AgendaList.route) {
            AgendaListScreen(navController = navController)
        }
        composable(Screen.MemberJourney.route) {
            MemberJourneyScreen(navController = navController)
        }
        composable(Screen.MeetingReport.route) {
            MeetingReportScreen(navController = navController)
        }
        composable(Screen.NotificationPrefs.route) {
            NotificationPrefsScreen(navController = navController)
        }
        composable(Screen.Ministries.route) {
            MinistriesScreen(navController = navController)
        }
        composable(
            route = Screen.MinistryDetail.route,
            arguments = listOf(androidx.navigation.navArgument("ministryId") { type = androidx.navigation.NavType.StringType }),
        ) { backStackEntry ->
            val ministryId = backStackEntry.arguments?.getString("ministryId") ?: return@composable
            MinistryDetailScreen(navController = navController, ministryId = ministryId)
        }
        composable(
            route = Screen.LifeGroupDetail.route,
            arguments = listOf(androidx.navigation.navArgument("lifeGroupId") { type = androidx.navigation.NavType.StringType }),
        ) { backStackEntry ->
            val lifeGroupId = backStackEntry.arguments?.getString("lifeGroupId") ?: return@composable
            LifeGroupDetailScreen(navController = navController, lifeGroupId = lifeGroupId)
        }
    }
}
