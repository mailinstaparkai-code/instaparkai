package ai.instapark.valet.ui.queue

import ai.instapark.valet.data.remote.dto.OperatorOption
import ai.instapark.valet.data.remote.dto.QueueResponse
import ai.instapark.valet.data.remote.dto.QueueTicket
import ai.instapark.valet.data.remote.dto.SlotOption
import ai.instapark.valet.ui.appContainer
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun QueueScreen() {
    val container = appContainer()
    val viewModel: QueueViewModel = viewModel(factory = QueueViewModelFactory(container.queueRepository))

    when (val state = viewModel.uiState) {
        is QueueUiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        is QueueUiState.Error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.message)
                Spacer(Modifier.height(8.dp))
                Button(onClick = { viewModel.load() }) { Text("Retry") }
            }
        }
        is QueueUiState.Success -> QueueContent(state.response, viewModel)
    }
}

@Composable
private fun QueueContent(response: QueueResponse, viewModel: QueueViewModel) {
    var showCheckIn by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Live Queue", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(
                        "${response.tickets.size} active vehicle(s)",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Button(onClick = { showCheckIn = true }) { Text("+ Check-in") }
            }

            if (response.canToggleAutoAllocate) {
                Spacer(Modifier.height(12.dp))
                Card {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text("Auto-allocate operators", fontWeight = FontWeight.Medium)
                            Text(
                                "Round-robin dispatch to the next available operator.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Switch(
                            checked = response.autoAllocateEnabled,
                            onCheckedChange = { viewModel.setAutoAllocate(it) },
                        )
                    }
                }
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
                TicketCard(ticket, viewModel, response.availableSlots, response.operatorOptions)
            }
            if (response.tickets.isEmpty()) {
                item {
                    Text(
                        "No active vehicles. Check one in to get started.",
                        modifier = Modifier.padding(24.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }

    if (showCheckIn) {
        CheckInDialog(
            vehicleTypeOptions = response.filters.vehicleTypeOptions,
            pending = viewModel.mutationPending,
            onDismiss = { showCheckIn = false },
            onSubmit = { vehicleNumber, vehicleType, mobileNumber, onError ->
                viewModel.checkIn(vehicleNumber, vehicleType, mobileNumber) { error ->
                    if (error == null) showCheckIn = false else onError(error)
                }
            },
        )
    }
}

@Composable
private fun TicketCard(
    ticket: QueueTicket,
    viewModel: QueueViewModel,
    availableSlots: List<SlotOption>,
    operatorOptions: List<OperatorOption>,
) {
    var showMarkParked by remember { mutableStateOf(false) }
    var showDispatch by remember { mutableStateOf(false) }
    var showHandover by remember { mutableStateOf(false) }
    var showEdit by remember { mutableStateOf(false) }
    var showVoid by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }

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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AssistChip(onClick = {}, label = { Text(statusLabel(ticket.status)) })
                    Box {
                        IconButton(onClick = { menuOpen = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "More actions")
                        }
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(text = { Text("Edit details") }, onClick = { menuOpen = false; showEdit = true })
                            DropdownMenuItem(text = { Text("Void ticket") }, onClick = { menuOpen = false; showVoid = true })
                        }
                    }
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(
                "Slot: ${ticket.slotNumber ?: "—"}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))

            when (ticket.status) {
                "checked_in" -> OutlinedButton(
                    onClick = { showMarkParked = true },
                    enabled = availableSlots.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(if (availableSlots.isEmpty()) "No available slots" else "Mark as parked") }
                "parked" -> OutlinedButton(
                    onClick = { viewModel.requestVehicle(ticket.id) {} },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Guest requested") }
                "requested" -> OutlinedButton(
                    onClick = { showDispatch = true },
                    enabled = operatorOptions.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(if (operatorOptions.isEmpty()) "No operators available" else "Dispatch operator") }
                "in_transit" -> OutlinedButton(
                    onClick = { viewModel.markArrived(ticket.id) {} },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Mark arrived") }
                "arrived" -> Button(
                    onClick = { showHandover = true },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Complete handover") }
            }
        }
    }

    if (showMarkParked) {
        MarkParkedDialog(
            slots = availableSlots,
            pending = viewModel.mutationPending,
            onDismiss = { showMarkParked = false },
            onConfirm = { slotId, onError ->
                viewModel.markParked(ticket.id, slotId) { error ->
                    if (error == null) showMarkParked = false else onError(error)
                }
            },
        )
    }
    if (showDispatch) {
        DispatchDialog(
            operators = operatorOptions,
            pending = viewModel.mutationPending,
            onDismiss = { showDispatch = false },
            onConfirm = { operatorId, onError ->
                viewModel.dispatch(ticket.id, operatorId) { error ->
                    if (error == null) showDispatch = false else onError(error)
                }
            },
        )
    }
    if (showHandover) {
        HandoverDialog(
            pending = viewModel.mutationPending,
            onDismiss = { showHandover = false },
            onConfirm = { otp, fare, paid, onError ->
                viewModel.completeHandover(ticket.id, otp, fare, paid) { error ->
                    if (error == null) showHandover = false else onError(error)
                }
            },
        )
    }
    if (showEdit) {
        EditTicketDialog(
            vehicleNumber = ticket.vehicleNumber,
            mobileNumber = ticket.mobileNumber,
            pending = viewModel.mutationPending,
            onDismiss = { showEdit = false },
            onConfirm = { vehicleNumber, mobileNumber, onError ->
                viewModel.updateTicket(ticket.id, vehicleNumber, mobileNumber) { error ->
                    if (error == null) showEdit = false else onError(error)
                }
            },
        )
    }
    if (showVoid) {
        VoidTicketDialog(
            pending = viewModel.mutationPending,
            onDismiss = { showVoid = false },
            onConfirm = { reason, onError ->
                viewModel.voidTicket(ticket.id, reason) { error ->
                    if (error == null) showVoid = false else onError(error)
                }
            },
        )
    }
}

@Composable
private fun CheckInDialog(
    vehicleTypeOptions: List<ai.instapark.valet.data.remote.dto.FilterOption>,
    pending: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (String, String, String, (String) -> Unit) -> Unit,
) {
    var vehicleNumber by remember { mutableStateOf("") }
    var vehicleType by remember { mutableStateOf(vehicleTypeOptions.firstOrNull()?.value ?: "car") }
    var mobileNumber by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Check-in vehicle") },
        text = {
            Column {
                OutlinedTextField(
                    value = vehicleNumber,
                    onValueChange = { vehicleNumber = it },
                    label = { Text("Vehicle number") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                SelectField(
                    label = "Vehicle type",
                    valueLabel = vehicleTypeOptions.firstOrNull { it.value == vehicleType }?.label ?: vehicleType,
                    options = vehicleTypeOptions.map { it.value to it.label },
                    onSelect = { vehicleType = it },
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = mobileNumber,
                    onValueChange = { mobileNumber = it },
                    label = { Text("Mobile number") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSubmit(vehicleNumber, vehicleType, mobileNumber) { message -> error = message } },
                enabled = !pending && vehicleNumber.isNotBlank() && mobileNumber.isNotBlank(),
            ) { Text(if (pending) "Checking in…" else "Check in") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun MarkParkedDialog(
    slots: List<SlotOption>,
    pending: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, (String) -> Unit) -> Unit,
) {
    var selected by remember { mutableStateOf(slots.firstOrNull()?.id ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    val selectedLabel = slots.firstOrNull { it.id == selected }?.label ?: ""

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Mark as parked") },
        text = {
            Column {
                SelectField(
                    label = "Slot",
                    valueLabel = selectedLabel,
                    options = slots.map { it.id to it.label },
                    onSelect = { selected = it },
                )
                error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(selected) { message -> error = message } },
                enabled = !pending && selected.isNotBlank(),
            ) { Text(if (pending) "Saving…" else "Confirm parked") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun DispatchDialog(
    operators: List<OperatorOption>,
    pending: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, (String) -> Unit) -> Unit,
) {
    var selected by remember { mutableStateOf(operators.firstOrNull()?.id ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    val selectedLabel = operators.firstOrNull { it.id == selected }?.label ?: ""

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Dispatch operator") },
        text = {
            Column {
                SelectField(
                    label = "Available operators",
                    valueLabel = selectedLabel,
                    options = operators.map { it.id to it.label },
                    onSelect = { selected = it },
                )
                error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(selected) { message -> error = message } },
                enabled = !pending && selected.isNotBlank(),
            ) { Text(if (pending) "Dispatching…" else "Dispatch") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun HandoverDialog(
    pending: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, String?, Boolean, (String) -> Unit) -> Unit,
) {
    var otp by remember { mutableStateOf("") }
    var fare by remember { mutableStateOf("") }
    var paid by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Complete handover") },
        text = {
            Column {
                Text(
                    "Ask the guest for the OTP sent to their phone and enter it below to confirm the handover.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = otp,
                    onValueChange = { otp = it },
                    label = { Text("Enter OTP to confirm") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = fare,
                    onValueChange = { fare = it },
                    label = { Text("Fare amount (₹)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Switch(checked = paid, onCheckedChange = { paid = it })
                    Spacer(Modifier.width(8.dp))
                    Text("Payment collected", style = MaterialTheme.typography.bodySmall)
                }
                error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(otp, fare.ifBlank { null }, paid) { message -> error = message } },
                enabled = !pending && otp.isNotBlank(),
            ) { Text(if (pending) "Completing…" else "Complete handover") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun EditTicketDialog(
    vehicleNumber: String,
    mobileNumber: String,
    pending: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, String, (String) -> Unit) -> Unit,
) {
    var vehicle by remember { mutableStateOf(vehicleNumber) }
    var mobile by remember { mutableStateOf(mobileNumber) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit vehicle details") },
        text = {
            Column {
                OutlinedTextField(
                    value = vehicle,
                    onValueChange = { vehicle = it },
                    label = { Text("Vehicle number") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = mobile,
                    onValueChange = { mobile = it },
                    label = { Text("Mobile number") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(vehicle, mobile) { message -> error = message } },
                enabled = !pending && vehicle.isNotBlank() && mobile.isNotBlank(),
            ) { Text(if (pending) "Saving…" else "Save") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun VoidTicketDialog(
    pending: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String?, (String) -> Unit) -> Unit,
) {
    var reason by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Void ticket") },
        text = {
            Column {
                Text(
                    "Frees the assigned slot, if one is parked, and removes this ticket from the Live Queue.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Reason (optional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(reason.ifBlank { null }) { message -> error = message } },
                enabled = !pending,
            ) { Text(if (pending) "Voiding…" else "Void") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun SelectField(
    label: String,
    valueLabel: String,
    options: List<Pair<String, String>>,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(4.dp))
        Box {
            OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
                Text(valueLabel.ifBlank { "Select…" }, modifier = Modifier.weight(1f))
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { (value, optLabel) ->
                    DropdownMenuItem(text = { Text(optLabel) }, onClick = { onSelect(value); expanded = false })
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
    else -> status
}
