package ai.instapark.valet.ui.dashboard

import ai.instapark.valet.R
import ai.instapark.valet.data.remote.dto.DashboardResponse
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.AnimatedSegmented
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.components.SegmentOption
import ai.instapark.valet.ui.components.StatDashlet
import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.AddCircle
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.Coffee
import androidx.compose.material.icons.outlined.LocalParking
import androidx.compose.material.icons.outlined.PowerSettingsNew
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import ai.instapark.valet.util.Haptics
import androidx.lifecycle.viewmodel.compose.viewModel
import java.util.Calendar

@Composable
fun DashboardScreen(
    onGoToQueue: () -> Unit = {},
    onGoToVehicles: () -> Unit = {},
) {
    val container = appContainer()
    val viewModel: DashboardViewModel = viewModel(
        factory = DashboardViewModelFactory(container.dashboardRepository, container.tokenStore)
    )

    when (val state = viewModel.uiState) {
        is DashboardUiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        is DashboardUiState.Error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.message)
                Spacer(Modifier.height(8.dp))
                Button(onClick = { viewModel.load() }) { Text("Retry") }
            }
        }
        is DashboardUiState.Success -> DashboardContent(
            summary = state.summary,
            viewModel = viewModel,
            onGoToQueue = onGoToQueue,
            onGoToVehicles = onGoToVehicles,
        )
    }
}

private fun greetingPrefix(): String = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
    in 5..11 -> "Good morning"
    in 12..16 -> "Good afternoon"
    else -> "Good evening"
}

@Composable
private fun DashboardContent(
    summary: DashboardResponse,
    viewModel: DashboardViewModel,
    onGoToQueue: () -> Unit,
    onGoToVehicles: () -> Unit,
) {
    val colors = ValetTheme.colors

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        // Hero header: greeting over the valet-storefront art, blended into the bg
        Box(modifier = Modifier.fillMaxWidth()) {
            Image(
                painter = painterResource(R.drawable.img_hero_valet),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(190.dp),
                alignment = Alignment.TopEnd,
            )
            // Fade the art toward the background on the left + bottom so the text reads
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(190.dp)
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                MaterialTheme.colorScheme.background,
                                MaterialTheme.colorScheme.background.copy(alpha = 0.55f),
                                Color.Transparent,
                            )
                        )
                    )
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(190.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, MaterialTheme.colorScheme.background),
                            startY = 260f,
                        )
                    )
            )
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    "${greetingPrefix()},",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    viewModel.greetingName ?: "there",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        summary.siteName ?: "Your site",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.inkSecondary,
                    )
                    if (summary.valetParkingEnabled) {
                        Spacer(Modifier.width(8.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(colors.tintGreen)
                                .padding(horizontal = 10.dp, vertical = 4.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(colors.success)
                            )
                            Text(
                                "Valet enabled",
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.success,
                                modifier = Modifier.padding(start = 6.dp),
                            )
                        }
                    }
                }
            }
        }

        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
            // My Status card -- operators only (admins don't clock in/out)
            if (viewModel.role == "valet_operator") {
                MyStatusCard(viewModel)
                Spacer(Modifier.height(16.dp))
            }

            // Stats row (4 dashlets, matching the reference's accent mapping)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatDashlet(
                    icon = Icons.Outlined.DirectionsCar,
                    value = summary.kpis.activeVehicles.toString(),
                    label = "Active Vehicles",
                    accent = colors.primary,
                    modifier = Modifier.weight(1f),
                )
                StatDashlet(
                    icon = Icons.Outlined.LocalParking,
                    value = summary.kpis.arrived.toString(),
                    label = "Arrived",
                    accent = colors.accent,
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatDashlet(
                    icon = Icons.Outlined.CheckCircle,
                    value = summary.kpis.completedToday.toString(),
                    label = "Completed Today",
                    accent = colors.success,
                    modifier = Modifier.weight(1f),
                )
                StatDashlet(
                    icon = Icons.Outlined.Timer,
                    value = summary.kpis.avgTurnaroundMinutes?.let { "${it}m" } ?: "—",
                    label = "Avg Turnaround",
                    accent = colors.primary,
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(16.dp))

            // Queue preview + Quick actions
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                QueuePreviewCard(
                    activeCount = summary.kpis.activeVehicles,
                    onGoToQueue = onGoToQueue,
                    modifier = Modifier.weight(1f),
                )
                QuickActionsCard(
                    onGoToQueue = onGoToQueue,
                    onGoToVehicles = onGoToVehicles,
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(16.dp))

            // Today's Overview: Parking capacity donut (real slot data)
            val capacity = summary.capacity
            if (capacity != null && capacity.totalSlots > 0) {
                CapacityCard(total = capacity.totalSlots, occupied = capacity.occupiedSlots)
                Spacer(Modifier.height(16.dp))
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun MyStatusCard(viewModel: DashboardViewModel) {
    val colors = ValetTheme.colors
    val context = LocalContext.current
    val onLeave = viewModel.myStatus == "leave"

    LaunchedEffect(viewModel.statusHapticSignal) {
        if (viewModel.statusHapticSignal > 0) Haptics.tick(context)
    }

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("My Status", fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(
                                when (viewModel.myStatus) {
                                    "in" -> colors.success
                                    "break" -> colors.warning
                                    "leave" -> colors.primary
                                    else -> colors.inkSecondary
                                }
                            )
                    )
                    Text(
                        when (viewModel.myStatus) {
                            "in" -> "Clocked In"
                            "break" -> "On Break"
                            "out" -> "Clocked Out"
                            "leave" -> "On Leave"
                            else -> "Not marked in"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.inkSecondary,
                        modifier = Modifier.padding(start = 6.dp),
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            val statusOptions = remember {
                listOf(
                    SegmentOption("in", "IN", Icons.Outlined.Check),
                    SegmentOption("break", "BREAK", Icons.Outlined.Coffee),
                    SegmentOption("out", "OUT", Icons.Outlined.PowerSettingsNew),
                )
            }
            AnimatedSegmented(
                options = statusOptions,
                selected = viewModel.myStatus,
                enabled = !viewModel.statusPending && !onLeave,
                onSelect = { viewModel.setStatus(it) },
            )
            if (onLeave) {
                Text(
                    "You're marked on leave today — ask your Parking Admin to change it.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.inkSecondary,
                    modifier = Modifier.padding(top = 10.dp),
                )
            }
            val error = viewModel.statusError
            if (error != null) {
                Text(
                    error,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.danger,
                    modifier = Modifier.padding(top = 10.dp),
                )
            }
        }
    }
}

@Composable
private fun QueuePreviewCard(activeCount: Int, onGoToQueue: () -> Unit, modifier: Modifier = Modifier) {
    val colors = ValetTheme.colors
    GlassCard(modifier = modifier.height(210.dp)) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Queue ($activeCount)", fontWeight = FontWeight.SemiBold)
                Text(
                    "View all",
                    style = MaterialTheme.typography.labelMedium,
                    color = colors.primary,
                    modifier = Modifier.clickable { onGoToQueue() },
                )
            }
            Column(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Outlined.DirectionsCar,
                    contentDescription = null,
                    tint = colors.inkTertiary,
                    modifier = Modifier.size(44.dp),
                )
                Spacer(Modifier.height(8.dp))
                if (activeCount == 0) {
                    Text("No vehicles in queue", style = MaterialTheme.typography.bodySmall)
                    Text(
                        "New arrivals will appear here",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.inkSecondary,
                    )
                } else {
                    Text(
                        "$activeCount active vehicle(s)",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Text(
                        "Open the Queue tab to act",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.inkSecondary,
                    )
                }
            }
        }
    }
}

@Composable
private fun QuickActionsCard(
    onGoToQueue: () -> Unit,
    onGoToVehicles: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = ValetTheme.colors
    GlassCard(modifier = modifier.height(210.dp)) {
        Column(modifier = Modifier.fillMaxSize()) {
            Text("Quick Actions", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(10.dp))
            QuickActionRow(
                icon = Icons.Outlined.AddCircle,
                accent = colors.accent,
                label = "Check-in Vehicle",
                onClick = onGoToQueue,
            )
            Spacer(Modifier.height(8.dp))
            QuickActionRow(
                icon = Icons.Outlined.Search,
                accent = colors.primary,
                label = "Find Vehicle",
                onClick = onGoToVehicles,
            )
        }
    }
}

@Composable
private fun QuickActionRow(
    icon: ImageVector,
    accent: Color,
    label: String,
    onClick: () -> Unit,
) {
    val colors = ValetTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.hairlineSoft)
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(accent.copy(alpha = 0.16f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(16.dp))
        }
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(start = 10.dp).weight(1f),
        )
        Icon(
            Icons.AutoMirrored.Outlined.KeyboardArrowRight,
            contentDescription = null,
            tint = colors.inkSecondary,
            modifier = Modifier.size(18.dp),
        )
    }
}

/** design.md §6 -- capacity as a slim labelled meter bar (the donut was retired: "it cost 100px for one number"). */
@Composable
private fun CapacityCard(total: Int, occupied: Int) {
    val colors = ValetTheme.colors
    val fraction = if (total > 0) (occupied.toFloat() / total).coerceIn(0f, 1f) else 0f
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Parking Capacity", fontWeight = FontWeight.SemiBold)
                Row {
                    Text("$occupied", color = colors.accent, fontWeight = FontWeight.Bold)
                    Text(" / $total slots", color = colors.inkSecondary)
                }
            }
            Spacer(Modifier.height(12.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp)
                    .clip(RoundedCornerShape(50))
                    .background(colors.hairlineSoft),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(fraction)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(50))
                        .background(Brush.horizontalGradient(listOf(colors.primaryLight, colors.primary))),
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "${(fraction * 100).toInt()}% occupied",
                style = MaterialTheme.typography.labelSmall,
                color = colors.inkSecondary,
            )
        }
    }
}
