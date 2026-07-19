package ai.instapark.valet.ui.navigation

import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.BrandedSplash
import ai.instapark.valet.ui.dashboard.DashboardScreen
import ai.instapark.valet.ui.login.LoginScreen
import ai.instapark.valet.ui.notifications.NotificationsBell
import ai.instapark.valet.ui.profile.ProfileScreen
import ai.instapark.valet.ui.queue.QueueScreen
import ai.instapark.valet.ui.vehicles.VehiclesScreen
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController

private data class BottomTab(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val bottomTabs = listOf(
    BottomTab(Screen.Dashboard.route, "Home", Icons.Filled.Home),
    BottomTab(Screen.Queue.route, "Queue", Icons.Filled.List),
    BottomTab(Screen.Vehicles.route, "Vehicles", Icons.Filled.DirectionsCar),
    BottomTab(Screen.Profile.route, "Profile", Icons.Filled.Person),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ValetNavGraph() {
    val container = appContainer()
    val navController = rememberNavController()

    var sessionChecked by remember { mutableStateOf(false) }
    var startDestination by remember { mutableStateOf(Screen.Login.route) }

    LaunchedEffect(Unit) {
        val session = container.sessionRepository.restoreSession()
        startDestination = if (session != null) Screen.Dashboard.route else Screen.Login.route
        sessionChecked = true
    }

    if (!sessionChecked) {
        BrandedSplash()
        return
    }

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute != Screen.Login.route

    Scaffold(
        topBar = {
            if (showBottomBar) {
                TopAppBar(
                    title = { Text("InstaPark Valet") },
                    actions = { NotificationsBell() },
                )
            }
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomTabs.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                if (currentRoute != tab.route) {
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(padding),
        ) {
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }
            composable(Screen.Dashboard.route) { DashboardScreen() }
            composable(Screen.Queue.route) { QueueScreen() }
            composable(Screen.Vehicles.route) { VehiclesScreen() }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    onSignedOut = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
