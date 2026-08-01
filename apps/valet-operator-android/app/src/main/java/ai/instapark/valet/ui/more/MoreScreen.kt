package ai.instapark.valet.ui.more

import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.components.TappableRowPicker
import ai.instapark.valet.ui.components.PremiumDialog
import ai.instapark.valet.ui.components.DialogSecondaryButton
import ai.instapark.valet.ui.theme.ValetTheme
import ai.instapark.valet.ui.theme.valetAppCanvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

/**
 * parking_admin-only hub for the sections that don't fit in the 4-tab dock:
 * Reports, Configuration, Operators, plus the site switcher when the account
 * manages more than one location.
 */
@Composable
fun MoreScreen(
    onGoToReports: () -> Unit,
    onGoToConfiguration: () -> Unit,
    onGoToOperators: () -> Unit,
) {
    val container = appContainer()
    val viewModel: MoreViewModel = viewModel(
        factory = MoreViewModelFactory(container.sessionRepository, container.tokenStore)
    )
    val colors = ValetTheme.colors

    Column(
        modifier = Modifier
            .fillMaxSize()
            .valetAppCanvas(colors.isDark)
            .padding(20.dp),
    ) {
        Text("More", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(16.dp))

        if (viewModel.accessibleSites.size > 1) {
            val currentSiteName = viewModel.accessibleSites.find { it.id == viewModel.currentSiteId }?.name
            MoreRow(
                icon = Icons.Outlined.LocationOn,
                title = "Current site",
                subtitle = currentSiteName ?: "Select a site",
                onClick = viewModel::openSiteSwitcher,
            )
            Spacer(Modifier.height(12.dp))
        }

        MoreRow(icon = Icons.Outlined.Assessment, title = "Reports", subtitle = "Vehicle transaction history", onClick = onGoToReports)
        Spacer(Modifier.height(12.dp))
        MoreRow(icon = Icons.Outlined.Settings, title = "Configuration", subtitle = "Zones, vehicle types, fares, requests", onClick = onGoToConfiguration)
        Spacer(Modifier.height(12.dp))
        MoreRow(icon = Icons.Outlined.Badge, title = "Valet Operators", subtitle = "Manage operator accounts", onClick = onGoToOperators)
    }

    if (viewModel.siteSwitcherOpen) {
        PremiumDialog(
            icon = Icons.Outlined.LocationOn,
            title = "Switch site",
            subtitle = "Data shown across the app will scope to the selected site.",
            onDismissRequest = viewModel::closeSiteSwitcher,
            footer = {
                DialogSecondaryButton(text = "Cancel", onClick = viewModel::closeSiteSwitcher, modifier = Modifier.fillMaxWidth())
            },
        ) {
            TappableRowPicker(
                label = "Sites",
                options = viewModel.accessibleSites.map { it.id to it.name },
                selected = viewModel.currentSiteId ?: "",
                onSelect = viewModel::switchSite,
            )
        }
    }
}

@Composable
private fun MoreRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    val colors = ValetTheme.colors
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick), cornerRadius = 18.dp) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(colors.tintBlue),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = colors.primary, modifier = Modifier.size(20.dp))
            }
            Column(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
                Text(title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = colors.inkSecondary)
            }
            Icon(
                Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint = colors.inkTertiary,
            )
        }
    }
}
