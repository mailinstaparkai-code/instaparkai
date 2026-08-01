package ai.instapark.valet.ui.navigation

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Dashboard : Screen("dashboard")
    data object Queue : Screen("queue")
    data object Vehicles : Screen("vehicles")
    data object Profile : Screen("profile")

    // parking_admin-only -- valet_operator never sees these routes (see
    // ValetNavGraph's role-conditional bottomTabs and the "More" hub screen).
    data object More : Screen("more")
    data object Reports : Screen("reports")
    data object Configuration : Screen("configuration")
    data object Operators : Screen("operators")
}
