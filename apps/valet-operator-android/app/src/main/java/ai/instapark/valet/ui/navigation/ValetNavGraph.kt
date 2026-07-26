package ai.instapark.valet.ui.navigation

import ai.instapark.valet.R
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.BrandedSplash
import ai.instapark.valet.ui.dashboard.DashboardScreen
import ai.instapark.valet.ui.login.LoginScreen
import ai.instapark.valet.ui.notifications.NotificationsBell
import ai.instapark.valet.ui.profile.ProfileScreen
import ai.instapark.valet.ui.queue.QueueScreen
import ai.instapark.valet.ui.theme.ValetTheme
import ai.instapark.valet.ui.theme.ValetTokens
import ai.instapark.valet.ui.vehicles.VehiclesScreen
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.List
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController

private data class BottomTab(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val bottomTabs = listOf(
    BottomTab(Screen.Dashboard.route, "Home", Icons.Outlined.Home),
    BottomTab(Screen.Queue.route, "Queue", Icons.AutoMirrored.Outlined.List),
    BottomTab(Screen.Vehicles.route, "Vehicles", Icons.Outlined.DirectionsCar),
    BottomTab(Screen.Profile.route, "Profile", Icons.Outlined.Person),
)

private fun navigateToTab(navController: NavHostController, route: String) {
    navController.navigate(route) {
        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

/** design.md §5 "Top bar" -- the full InstaParkAi lockup on a white pill, shadowed. */
@Composable
private fun BrandTitle() {
    val colors = ValetTheme.colors
    Box(
        modifier = Modifier
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(999.dp),
                ambientColor = colors.primary.copy(alpha = 0.18f),
                spotColor = colors.primary.copy(alpha = 0.18f),
            )
            .clip(RoundedCornerShape(999.dp))
            .background(colors.surface)
            .padding(horizontal = 14.dp, vertical = 7.dp),
    ) {
        Image(
            painter = painterResource(R.drawable.img_logo_lockup_light),
            contentDescription = "InstaParkAi",
            modifier = Modifier.height(28.dp),
        )
    }
}

/** design.md §9 "Dock" -- floating frosted capsule replacing the plain NavigationBar. */
@Composable
private fun FloatingDock(
    currentRoute: String?,
    onTabSelected: (String) -> Unit,
) {
    val colors = ValetTheme.colors
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = ValetTokens.dockInset, vertical = 12.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(ValetTokens.dockHeight)
                .shadow(elevation = 20.dp, shape = RoundedCornerShape(26.dp))
                .clip(RoundedCornerShape(26.dp))
                .background(colors.surface.copy(alpha = 0.9f)),
        ) {
            bottomTabs.forEach { tab ->
                val selected = currentRoute == tab.route
                val pillColor by animateColorAsState(
                    targetValue = if (selected) colors.primary else androidx.compose.ui.graphics.Color.Transparent,
                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = 380f),
                    label = "dockPill",
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            enabled = !selected,
                        ) { onTabSelected(tab.route) },
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box(
                        modifier = Modifier
                            .size(width = 46.dp, height = 32.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(pillColor),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            tab.icon,
                            contentDescription = tab.label,
                            tint = if (selected) androidx.compose.ui.graphics.Color.White else colors.inkTertiary,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    Text(
                        tab.label,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                        color = if (selected) colors.primary else colors.inkTertiary,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
        }
    }
}

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
    val colors = ValetTheme.colors

    Scaffold(
        containerColor = colors.canvasBottom,
        topBar = {
            if (showBottomBar) {
                TopAppBar(
                    title = { BrandTitle() },
                    actions = { NotificationsBell() },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = androidx.compose.ui.graphics.Color.Transparent,
                    ),
                )
            }
        },
        bottomBar = {
            if (showBottomBar) {
                FloatingDock(currentRoute = currentRoute) { route ->
                    if (currentRoute != route) navigateToTab(navController, route)
                }
            }
        },
        contentWindowInsets = androidx.compose.foundation.layout.WindowInsets(0, 0, 0, 0),
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
            composable(Screen.Dashboard.route) {
                DashboardScreen(
                    onGoToQueue = { navigateToTab(navController, Screen.Queue.route) },
                    onGoToVehicles = { navigateToTab(navController, Screen.Vehicles.route) },
                )
            }
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
