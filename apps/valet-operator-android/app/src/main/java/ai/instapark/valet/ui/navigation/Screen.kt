package ai.instapark.valet.ui.navigation

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Dashboard : Screen("dashboard")
    data object Queue : Screen("queue")
    data object Vehicles : Screen("vehicles")
    data object Profile : Screen("profile")
}
