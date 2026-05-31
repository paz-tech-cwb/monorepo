package br.church.paz.android.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import br.church.paz.android.ui.features.agenda.AgendaDetailScreen
import br.church.paz.android.ui.features.auth.LoginScreen
import br.church.paz.android.ui.features.profile.EditProfileScreen
import br.church.paz.android.ui.features.profile.ProfileScreen
import br.church.paz.android.ui.features.splash.SplashScreen

@Composable
fun PazNavGraph() {
    val navController = rememberNavController()

    NavHost(
        navController  = navController,
        startDestination = Screen.Splash.route,
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToLogin = { navController.navigate(Screen.Login.route) { popUpTo(Screen.Splash.route) { inclusive = true } } },
                onNavigateToHome  = { navController.navigate(Screen.Shell.route)  { popUpTo(Screen.Splash.route) { inclusive = true } } },
            )
        }
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = { navController.navigate(Screen.Shell.route) { popUpTo(Screen.Login.route) { inclusive = true } } },
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
    }
}
