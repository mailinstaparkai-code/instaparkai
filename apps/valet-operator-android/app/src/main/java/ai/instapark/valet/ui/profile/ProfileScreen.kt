package ai.instapark.valet.ui.profile

import ai.instapark.valet.BuildConfig
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.components.ThemeTogglePill
import ai.instapark.valet.ui.theme.PrimaryBlue
import ai.instapark.valet.ui.theme.PrimaryBlueLight
import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch

/**
 * design.md §6 "Profile" -- blue gradient header carrying the brand tile, then
 * Apple-Settings-style groups: identity card, Appearance segmented pill, a grouped
 * rows card (role, app version), and a destructive outlined Sign out.
 */
@Composable
fun ProfileScreen(onSignedOut: () -> Unit) {
    val container = appContainer()
    val viewModel: ProfileViewModel = viewModel(
        factory = ProfileViewModelFactory(container.sessionRepository, container.tokenStore)
    )
    val colors = ValetTheme.colors
    val scope = rememberCoroutineScope()
    val darkTheme by container.themeStore.darkThemeFlow.collectAsState(initial = false)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .background(
                        Brush.linearGradient(listOf(PrimaryBlueLight, PrimaryBlue)),
                        shape = RoundedCornerShape(bottomStart = 34.dp, bottomEnd = 34.dp),
                    ),
            ) {
                Text(
                    "Profile",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier.padding(20.dp),
                )
            }
            Column(modifier = Modifier.padding(top = 110.dp, start = 20.dp, end = 20.dp)) {
                GlassIdentityCard(
                    initial = (viewModel.fullName ?: viewModel.username ?: "?").take(1).uppercase(),
                    name = viewModel.fullName ?: viewModel.username ?: "",
                    role = roleLabel(viewModel.role),
                )
            }
        }

        Column(modifier = Modifier.padding(20.dp)) {
            Spacer(Modifier.height(8.dp))
            Text("Appearance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(10.dp))
            ThemeTogglePill(
                darkTheme = darkTheme,
                onToggle = { dark -> scope.launch { container.themeStore.setDarkTheme(dark) } },
            )
            Spacer(Modifier.height(20.dp))
            GroupedRow(label = "Role", value = roleLabel(viewModel.role))
            GroupedRow(label = "App version", value = BuildConfig.VERSION_NAME)
            Spacer(Modifier.height(20.dp))
            OutlinedButton(
                onClick = { viewModel.signOut(onSignedOut) },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFFBD5D5)),
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = colors.danger),
            ) {
                Text("Sign out", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun GlassIdentityCard(initial: String, name: String, role: String) {
    val colors = ValetTheme.colors
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 22.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(Brush.linearGradient(listOf(PrimaryBlueLight, PrimaryBlue))),
                contentAlignment = Alignment.Center,
            ) {
                Text(initial, color = Color.White, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
            }
            Spacer(Modifier.width(14.dp))
            Column {
                Text(name, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                Text(role, style = MaterialTheme.typography.bodySmall, color = colors.inkSecondary)
            }
        }
    }
}

@Composable
private fun GroupedRow(label: String, value: String) {
    val colors = ValetTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = colors.ink)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = colors.inkSecondary)
    }
}

private fun roleLabel(role: String?): String = when (role) {
    "parking_admin" -> "Parking Admin"
    "valet_operator" -> "Valet Operator"
    else -> role ?: ""
}
