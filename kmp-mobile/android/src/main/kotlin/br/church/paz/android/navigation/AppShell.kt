package br.church.paz.android.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.School
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
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
import br.church.paz.android.ui.features.relatorios.RelatoriosListScreen
import org.koin.androidx.compose.koinViewModel

@Composable
fun AppShell(
    rootNavController: NavController,
    appShellViewModel: AppShellViewModel = koinViewModel(),
) {
    val tabNavController = rememberNavController()
    val backStack by tabNavController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val showRelatorios by appShellViewModel.showRelatorios.collectAsStateWithLifecycle()

    val tabItems =
        buildList {
            add(PazNavItem(icon = Icons.Outlined.Home, label = "Início"))
            add(PazNavItem(icon = Icons.Outlined.School, label = "Academia"))
            if (showRelatorios) add(PazNavItem(icon = Icons.Outlined.BarChart, label = "Relatórios"))
            add(PazNavItem(icon = Icons.Outlined.Person, label = "Conta"))
        }
    val tabRoutes =
        buildList {
            add(Screen.Home.route)
            add(Screen.Academy.route)
            if (showRelatorios) add(Screen.Relatorios.route)
            add(Screen.Account.route)
        }

    Scaffold(
        bottomBar = {
            val selectedIndex = tabRoutes.indexOf(currentRoute).coerceAtLeast(0)
            PazBottomNavBar(
                items = tabItems,
                selectedIndex = selectedIndex,
                onItemSelected = { i ->
                    tabNavController.navigate(tabRoutes[i]) {
                        popUpTo(tabNavController.graph.startDestinationId) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
            )
        },
    ) { innerPadding ->
        NavHost(
            navController = tabNavController,
            startDestination = Screen.Home.route,
            modifier = Modifier,
        ) {
            composable(Screen.Home.route) { HomeScreen(rootNavController, contentPadding = innerPadding) }
            composable(Screen.Academy.route) { AcademyScreen(navController = rootNavController, contentPadding = innerPadding) }
            composable(Screen.Relatorios.route) {
                RelatoriosListScreen(navController = rootNavController, contentPadding = innerPadding)
            }
            composable(Screen.Account.route) { AccountScreen(rootNavController, contentPadding = innerPadding) }
        }
    }
}
