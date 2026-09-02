package ai.instapark.valet.ui.dashboard

import ai.instapark.valet.R
import ai.instapark.valet.data.remote.dto.DashboardResponse
import ai.instapark.valet.data.remote.dto.QueueTicket
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.AnimatedSegmented
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.components.SegmentOption
import ai.instapark.valet.ui.components.StatDashlet
import ai.instapark.valet.ui.search.SearchOverlay
import ai.instapark.valet.ui.theme.ValetTheme
import ai.instapark.valet.ui.theme.ValetTokens
import ai.instapark.valet.ui.util.vehicleImageRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Coffee
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.LocalParking
import androidx.compose.material.icons.outlined.Add
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
        factory = DashboardViewModelFactory(
            container.dashboardRepository,
            container.tokenStore,
            container.queueRepository,
        )
    )
    var searchOpen by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
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
                onOpenSearch = { searchOpen = true },
            )
        }

        if (searchOpen) {
            SearchOverlay(
                onDismiss = { searchOpen = false },
                onGoToQueue = { searchOpen = false; onGoToQueue() },
                onGoToVehicles = { searchOpen = false; onGoToVehicles() },
            )
        }
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
    onOpenSearch: () -> Unit,
) {
    val colors = ValetTheme.colors

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(ValetTokens.screenPadding),
    ) {
        Text(
            "${greetingPrefix()},",
            style = MaterialTheme.typography.bodyMedium,
            color = colors.inkSecondary,
        )
        Text(
            viewModel.greetingName ?: "there",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        if (summary.valetParkingEnabled) {
            Spacer(Modifier.height(8.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(colors.tintGreen)
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            ) {
                Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(colors.success))
                Text(
                    "Valet enabled",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.success,
                    modifier = Modifier.padding(start = 6.dp),
                )
            }
        }
        Spacer(Modifier.height(14.dp))

        SearchEntryField(onClick = onOpenSearch)
        Spacer(Modifier.height(12.dp))

        if (viewModel.role == "valet_operator") {
            MyStatusCard(viewModel)
            Spacer(Modifier.height(12.dp))
        }

        NextUpCard(
            nextTicket = viewModel.nextTicket,
            capacityTotal = summary.capacity?.totalSlots ?: 0,
            capacityOccupied = summary.capacity?.occupiedSlots ?: 0,
            onGoToQueue = onGoToQueue,
        )
        Spacer(Modifier.height(12.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatDashlet(
                icon = Icons.Outlined.DirectionsCar,
                value = summary.kpis.activeVehicles.toString(),
                label = "Active vehicles",
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
                label = "Completed today",
                accent = colors.success,
                modifier = Modifier.weight(1f),
            )
            StatDashlet(
                icon = Icons.Outlined.Timer,
                value = summary.kpis.avgTurnaroundMinutes?.let { "${it}m" } ?: "—",
                label = "Avg turnaround",
                accent = colors.primary,
                modifier = Modifier.weight(1f),
            )
        }
        Spacer(Modifier.height(12.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                modifier = Modifier
                    .weight(1.4f)
                    .height(54.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Brush.linearGradient(listOf(colors.accentLight, colors.accent)))
                    .clickable { onGoToQueue() },
                contentAlignment = Alignment.Center,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Text("Check-in", color = Color.White, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
                }
            }
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(54.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(colors.tintBlue)
                    .border(BorderStroke(1.5.dp, colors.findButtonBorder), RoundedCornerShape(18.dp))
                    .clickable { onOpenSearch() },
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Search, contentDescription = null, tint = colors.primary, modifier = Modifier.size(18.dp))
                Text("Find", color = colors.primary, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun SearchEntryField(onClick: () -> Unit) {
    val colors = ValetTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(colors.surface)
            .border(BorderStroke(1.dp, colors.searchFieldBorder), RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Search, contentDescription = null, tint = colors.inkTertiary, modifier = Modifier.size(19.dp))
        Text(
            "Search plate, guest or slot…",
            style = MaterialTheme.typography.bodyMedium,
            color = colors.inkTertiary,
            modifier = Modifier.padding(start = 11.dp),
        )
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
                Text("My status", fontWeight = FontWeight.SemiBold)
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

/** design.md §10 5b "Next up" -- header + next vehicle row + capacity meter, one card. */
@Composable
private fun NextUpCard(
    nextTicket: QueueTicket?,
    capacityTotal: Int,
    capacityOccupied: Int,
    onGoToQueue: () -> Unit,
) {
    val colors = ValetTheme.colors
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Next up", fontWeight = FontWeight.SemiBold)
                    if (nextTicket != null) {
                        Box(
                            modifier = Modifier
                                .padding(start = 8.dp)
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(colors.success),
                        )
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onGoToQueue() },
                ) {
                    Text("View all", style = MaterialTheme.typography.labelMedium, color = colors.primary)
                    Icon(
                        Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            if (nextTicket == null) {
                Text(
                    "No vehicles in queue",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.inkSecondary,
                )
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val thumbRes = vehicleImageRes(nextTicket.vehicleType)
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .clip(RoundedCornerShape(18.dp))
                            .background(colors.surface)
                            .border(BorderStroke(1.dp, colors.cardHairline), RoundedCornerShape(18.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Image(
                            painter = painterResource(thumbRes),
                            contentDescription = null,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.size(48.dp),
                        )
                    }
                    Column(modifier = Modifier.padding(start = 13.dp).weight(1f)) {
                        Text(nextTicket.vehicleNumber, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(
                            listOfNotNull(nextTicket.vehicleType, nextTicket.slotNumber?.let { "Slot $it" }).joinToString(" · "),
                            style = MaterialTheme.typography.labelMedium,
                            color = colors.inkSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    val (statusColor, statusBg, statusLabel) = statusChipStyle(nextTicket.status, colors)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(statusBg)
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                    ) {
                        Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(statusColor))
                        Text(
                            statusLabel,
                            style = MaterialTheme.typography.labelSmall,
                            color = statusColor,
                            modifier = Modifier.padding(start = 6.dp),
                        )
                    }
                }
            }
            if (capacityTotal > 0) {
                Spacer(Modifier.height(15.dp))
                val fraction = (capacityOccupied.toFloat() / capacityTotal).coerceIn(0f, 1f)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Capacity", style = MaterialTheme.typography.labelMedium, color = colors.inkSecondary)
                    Text(
                        "$capacityOccupied of $capacityTotal occupied",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.primary,
                    )
                }
                Spacer(Modifier.height(9.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
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
            }
        }
    }
}

private data class StatusChipStyle(val color: Color, val bg: Color, val label: String)

private fun statusChipStyle(status: String, colors: ai.instapark.valet.ui.theme.ValetColors): StatusChipStyle = when (status) {
    "checked_in" -> StatusChipStyle(colors.statusCheckedIn, colors.statusCheckedInBg, "CHECKED IN")
    "parked" -> StatusChipStyle(colors.statusParked, colors.statusParkedBg, "PARKED")
    "requested" -> StatusChipStyle(colors.statusRequested, colors.statusRequestedBg, "REQUESTED")
    "in_transit" -> StatusChipStyle(colors.statusInTransit, colors.statusInTransitBg, "IN TRANSIT")
    "arrived" -> StatusChipStyle(colors.statusDone, colors.statusDoneBg, "ARRIVED")
    else -> StatusChipStyle(colors.inkSecondary, colors.hairlineSoft, status.uppercase())
}
