package br.church.paz.android.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.School
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import br.church.paz.android.ui.components.PazBottomNavBar
import br.church.paz.android.ui.components.PazNavItem
import br.church.paz.android.ui.features.academy.AcademyScreen
import br.church.paz.android.ui.features.account.AccountScreen
import br.church.paz.android.ui.features.home.HomeScreen

private val TAB_ITEMS = listOf(
    PazNavItem(icon = Icons.Outlined.Home,   label = "Início"),
    PazNavItem(icon = Icons.Outlined.School, label = "Academia"),
    PazNavItem(icon = Icons.Outlined.Person, label = "Conta"),
)

private val TAB_ROUTES = listOf(Screen.Home.route, Screen.Academy.route, Screen.Account.route)

@Composable
fun AppShell(rootNavController: NavController) {
    val tabNavController = rememberNavController()
    val backStack by tabNavController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    Scaffold(
        bottomBar = {
            val selectedIndex = TAB_ROUTES.indexOf(currentRoute).coerceAtLeast(0)
            PazBottomNavBar(
                items           = TAB_ITEMS,
                selectedIndex   = selectedIndex,
                onItemSelected  = { i ->
                    tabNavController.navigate(TAB_ROUTES[i]) {
                        popUpTo(tabNavController.graph.startDestinationId) { saveState = true }
                        launchSingleTop = true
                        restoreState    = true
                    }
                },
            )
        },
    ) { innerPadding ->
        NavHost(
            navController    = tabNavController,
            startDestination = Screen.Home.route,
            modifier         = Modifier,
        ) {
            composable(Screen.Home.route)    { HomeScreen(rootNavController, contentPadding = innerPadding) }
            composable(Screen.Academy.route) { AcademyScreen(contentPadding = innerPadding) }
            composable(Screen.Account.route) { AccountScreen(rootNavController, contentPadding = innerPadding) }
        }
    }
}
