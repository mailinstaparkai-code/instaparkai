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
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Coffee
import androidx.compose.material.icons.filled.LocalParking
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.Canvas
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
                    "${viewModel.greetingName ?: "there"} 👋",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        summary.siteName ?: "Your site",
                        style = MaterialTheme.typography.bodyMedium,
                        color = colors.textSecondary,
                    )
                    if (summary.valetParkingEnabled) {
                        Spacer(Modifier.width(8.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(colors.green.copy(alpha = 0.15f))
                                .padding(horizontal = 10.dp, vertical = 4.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(colors.successGlow)
                            )
                            Text(
                                "Valet enabled",
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.successGlow,
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
                    icon = Icons.Filled.DirectionsCar,
                    value = summary.kpis.activeVehicles.toString(),
                    label = "Active Vehicles",
                    accent = colors.blue,
                    modifier = Modifier.weight(1f),
                )
                StatDashlet(
                    icon = Icons.Filled.LocalParking,
                    value = summary.kpis.arrived.toString(),
                    label = "Arrived",
                    accent = colors.orange,
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatDashlet(
                    icon = Icons.Filled.CheckCircle,
                    value = summary.kpis.completedToday.toString(),
                    label = "Completed Today",
                    accent = colors.green,
                    modifier = Modifier.weight(1f),
                )
                StatDashlet(
                    icon = Icons.Filled.Timer,
                    value = summary.kpis.avgTurnaroundMinutes?.let { "${it}m" } ?: "—",
                    label = "Avg Turnaround",
                    accent = colors.purple,
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
    val onLeave = viewModel.myStatus == "leave"
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
                                    "in" -> colors.successGlow
                                    "break" -> colors.warning
                                    "leave" -> colors.purple
                                    else -> colors.textSecondary
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
                        color = colors.textSecondary,
                        modifier = Modifier.padding(start = 6.dp),
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            AnimatedSegmented(
                options = listOf(
                    SegmentOption("in", "IN", Icons.Filled.Check),
                    SegmentOption("break", "BREAK", Icons.Filled.Coffee),
                    SegmentOption("out", "OUT", Icons.Filled.PowerSettingsNew),
                ),
                selected = viewModel.myStatus,
                enabled = !viewModel.statusPending && !onLeave,
                onSelect = { viewModel.setStatus(it) },
            )
            if (onLeave) {
                Text(
                    "You're marked on leave today — ask your Parking Admin to change it.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.textSecondary,
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
                    color = colors.blue,
                    modifier = Modifier.clickable { onGoToQueue() },
                )
            }
            Column(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Filled.DirectionsCar,
                    contentDescription = null,
                    tint = colors.textSecondary.copy(alpha = 0.45f),
                    modifier = Modifier.size(44.dp),
                )
                Spacer(Modifier.height(8.dp))
                if (activeCount == 0) {
                    Text("No vehicles in queue", style = MaterialTheme.typography.bodySmall)
                    Text(
                        "New arrivals will appear here",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.textSecondary,
                    )
                } else {
                    Text(
                        "$activeCount active vehicle(s)",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Text(
                        "Open the Queue tab to act",
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.textSecondary,
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
                icon = Icons.Filled.AddCircle,
                accent = colors.orange,
                label = "Check-in Vehicle",
                onClick = onGoToQueue,
            )
            Spacer(Modifier.height(8.dp))
            QuickActionRow(
                icon = Icons.Filled.Search,
                accent = colors.blue,
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
            .background(colors.backgroundDeep)
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(accent.copy(alpha = 0.20f)),
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
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = colors.textSecondary,
            modifier = Modifier.size(18.dp),
        )
    }
}

@Composable
private fun CapacityCard(total: Int, occupied: Int) {
    val colors = ValetTheme.colors
    val fraction = if (total > 0) occupied.toFloat() / total else 0f
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text("Today's Overview", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(contentAlignment = Alignment.Center) {
                    Canvas(modifier = Modifier.size(96.dp)) {
                        val stroke = Stroke(width = 10.dp.toPx(), cap = StrokeCap.Round)
                        val inset = 10.dp.toPx() / 2
                        val arcSize = Size(size.width - inset * 2, size.height - inset * 2)
                        drawArc(
                            color = colors.cardBorder,
                            startAngle = -90f,
                            sweepAngle = 360f,
                            useCenter = false,
                            style = stroke,
                            topLeft = Offset(inset, inset),
                            size = arcSize,
                        )
                        if (fraction > 0f) {
                            drawArc(
                                brush = Brush.sweepGradient(
                                    listOf(colors.orange, colors.orange.copy(alpha = 0.6f), colors.orange)
                                ),
                                startAngle = -90f,
                                sweepAngle = 360f * fraction,
                                useCenter = false,
                                style = stroke,
                                topLeft = Offset(inset, inset),
                                size = arcSize,
                            )
                        }
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "${(fraction * 100).toInt()}%",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                        Text("Occupied", style = MaterialTheme.typography.labelSmall, color = colors.textSecondary)
                    }
                }
                Spacer(Modifier.width(20.dp))
                Column {
                    Text("Parking Capacity", fontWeight = FontWeight.Medium)
                    Spacer(Modifier.height(4.dp))
                    Row {
                        Text(
                            "$occupied",
                            color = colors.orange,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(" / $total Slots", color = colors.textSecondary)
                    }
                }
            }
        }
    }
}
