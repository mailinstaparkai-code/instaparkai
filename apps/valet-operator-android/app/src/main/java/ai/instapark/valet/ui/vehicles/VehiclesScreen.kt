package ai.instapark.valet.ui.vehicles

import ai.instapark.valet.data.remote.dto.Ticket
import ai.instapark.valet.data.remote.dto.VehiclesResponse
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.theme.StatusSuccess
import ai.instapark.valet.ui.theme.StatusWarning
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    Column(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Vehicles", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                "${response.totalCount} record(s)",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard(response.stats.completedCount.toString(), "Completed (last 500)", Modifier.weight(1f))
                StatCard("₹${response.stats.totalRevenue}", "Revenue", Modifier.weight(1f))
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
            items(response.tickets) { ticket -> VehicleTicketCard(ticket) }
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
private fun StatCard(value: String, label: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun VehicleTicketCard(ticket: Ticket) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text(ticket.vehicleNumber, fontWeight = FontWeight.Bold)
                    Text(
                        "${ticket.vehicleType} · ${ticket.mobileNumber}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                AssistChip(onClick = {}, label = { Text(statusLabel(ticket.status)) })
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "Slot: ${ticket.slotNumber ?: "—"}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (ticket.fareAmount != null) {
                Spacer(Modifier.height(4.dp))
                Text(
                    "₹${ticket.fareAmount} ${if (ticket.paymentCollected) "paid" else "pending"}",
                    color = if (ticket.paymentCollected) StatusSuccess else StatusWarning,
                )
            }
            val inOp = ticket.checkedInOperator?.let { it.fullName ?: it.username }
            val outOp = ticket.deliveredOperator?.let { it.fullName ?: it.username }
            if (inOp != null || outOp != null) {
                Spacer(Modifier.height(4.dp))
                Text(
                    listOfNotNull(inOp?.let { "In: $it" }, outOp?.let { "Out: $it" }).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
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
