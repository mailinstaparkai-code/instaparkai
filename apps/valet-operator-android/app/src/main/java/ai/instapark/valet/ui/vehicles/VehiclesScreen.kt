package ai.instapark.valet.ui.vehicles

import ai.instapark.valet.R
import ai.instapark.valet.data.remote.dto.Ticket
import ai.instapark.valet.data.remote.dto.VehiclesResponse
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.components.StatusPill
import ai.instapark.valet.ui.components.statusAccent
import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CurrencyRupee
import androidx.compose.material.icons.automirrored.outlined.FactCheck
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun VehiclesScreen() {
    val container = appContainer()
    val viewModel: VehiclesViewModel = viewModel(factory = VehiclesViewModelFactory(container.vehiclesRepository))

    when (val state = viewModel.uiState) {
        is VehiclesUiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        is VehiclesUiState.Error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.message)
                Spacer(Modifier.height(8.dp))
                Button(onClick = { viewModel.load() }) { Text("Retry") }
            }
        }
        is VehiclesUiState.Success -> VehiclesContent(state.response, viewModel)
    }
}

@Composable
private fun VehiclesContent(response: VehiclesResponse, viewModel: VehiclesViewModel) {
    val colors = ValetTheme.colors
    Column(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Vehicles", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                "${response.totalCount} record(s)",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.inkSecondary,
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard(
                    icon = Icons.AutoMirrored.Outlined.FactCheck,
                    value = response.stats.completedCount.toString(),
                    label = "Completed (last 500)",
                    accent = colors.primary,
                    modifier = Modifier.weight(1f),
                )
                StatCard(
                    icon = Icons.Outlined.CurrencyRupee,
                    value = "₹${response.stats.totalRevenue}",
                    label = "Revenue",
                    accent = colors.success,
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(12.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    FilterChip(
                        selected = viewModel.statusFilter == null,
                        onClick = { viewModel.applyStatusFilter(null) },
                        label = { Text("All") },
                    )
                }
                items(response.filters.statusOptions) { option ->
                    FilterChip(
                        selected = viewModel.statusFilter == option.value,
                        onClick = { viewModel.applyStatusFilter(option.value) },
                        label = { Text(option.label) },
                    )
                }
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(response.tickets, key = { it.id }) { ticket ->
                VehicleTicketCard(ticket, modifier = Modifier.animateItem())
            }
            if (response.tickets.isEmpty()) {
                item { Text("No records for this filter.", modifier = Modifier.padding(24.dp)) }
            }
        }

        if (response.totalPages > 1) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Page ${response.page} of ${response.totalPages}", style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { viewModel.prevPage() }, enabled = response.page > 1) { Text("Prev") }
                    OutlinedButton(onClick = { viewModel.nextPage() }, enabled = response.page < response.totalPages) { Text("Next") }
                }
            }
        }
    }
}

@Composable
private fun StatCard(
    icon: ImageVector,
    value: String,
    label: String,
    accent: Color,
    modifier: Modifier = Modifier,
) {
    val colors = ValetTheme.colors
    GlassCard(modifier = modifier, cornerRadius = 18.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(accent.copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(22.dp))
            }
            Column(modifier = Modifier.padding(start = 12.dp)) {
                Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = colors.ink)
                Text(label, style = MaterialTheme.typography.labelSmall, color = colors.inkSecondary)
            }
        }
    }
}

private fun vehicleImageRes(vehicleType: String): Int {
    val t = vehicleType.lowercase()
    return when {
        "bike" in t || "motor" in t -> R.drawable.img_vehicle_bike
        "scoot" in t -> R.drawable.img_vehicle_scooter
        "sedan" in t || "4" in t -> R.drawable.img_vehicle_sedan
        else -> R.drawable.img_vehicle_car
    }
}

@Composable
private fun VehicleTicketCard(ticket: Ticket, modifier: Modifier = Modifier) {
    val colors = ValetTheme.colors
    val accent = statusAccent(ticket.status)
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Row {
            Image(
                painter = painterResource(vehicleImageRes(ticket.vehicleType)),
                contentDescription = ticket.vehicleType,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(84.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .border(1.dp, accent.copy(alpha = 0.35f), RoundedCornerShape(14.dp)),
            )
            Column(modifier = Modifier.padding(start = 14.dp).weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        ticket.vehicleNumber,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    StatusPill(status = ticket.status, label = statusLabel(ticket.status))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        ticket.vehicleType.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.inkSecondary,
                    )
                    Text(" • ", color = accent)
                    Text(
                        ticket.mobileNumber,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.inkSecondary,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    "Slot: ${ticket.slotNumber ?: "—"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.inkSecondary,
                )
                if (ticket.fareAmount != null) {
                    Text(
                        "₹${ticket.fareAmount} ${if (ticket.paymentCollected) "paid" else "pending"}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = if (ticket.paymentCollected) colors.success else colors.warning,
                    )
                }
                val inOp = ticket.checkedInOperator?.let { it.fullName ?: it.username }
                val outOp = ticket.deliveredOperator?.let { it.fullName ?: it.username }
                if (inOp != null || outOp != null) {
                    Row {
                        Text(
                            "In: ",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.inkSecondary,
                        )
                        Text(
                            listOfNotNull(inOp, outOp?.let { "Out: $it" }).joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.primary,
                        )
                    }
                }
            }
        }
    }
}

private fun statusLabel(status: String): String = when (status) {
    "checked_in" -> "Checked in"
    "parked" -> "Parked"
    "requested" -> "Requested"
    "in_transit" -> "In transit"
    "arrived" -> "Arrived"
    "completed" -> "Completed"
    "voided" -> "Voided"
    else -> status
}
