package ai.instapark.valet.ui.queue

import ai.instapark.valet.R
import ai.instapark.valet.data.remote.dto.OperatorOption
import ai.instapark.valet.data.remote.dto.QueueResponse
import ai.instapark.valet.data.remote.dto.QueueTicket
import ai.instapark.valet.data.remote.dto.SlotOption
import ai.instapark.valet.data.remote.dto.TicketPhoto
import ai.instapark.valet.data.repository.CheckInPhotos
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.DialogPrimaryButton
import ai.instapark.valet.ui.components.DialogSecondaryButton
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.components.ValetFilterChip
import ai.instapark.valet.ui.components.OtpBoxInput
import ai.instapark.valet.ui.components.PhotoCaptureField
import ai.instapark.valet.ui.components.PremiumDialog
import ai.instapark.valet.ui.components.StatusPill
import ai.instapark.valet.ui.components.TappableRowPicker
import ai.instapark.valet.ui.components.VehicleTypeSelector
import ai.instapark.valet.ui.components.statusAccent
import ai.instapark.valet.ui.theme.ValetTheme
import ai.instapark.valet.ui.theme.valetAppCanvas
import ai.instapark.valet.ui.util.vehicleImageRes
import coil.compose.AsyncImage
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import java.time.OffsetDateTime
import java.time.Duration
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.LocalParking
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.QrCode
import androidx.compose.material.icons.outlined.VpnKey
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
    val colors = ValetTheme.colors
    val container = appContainer()
    val role by container.tokenStore.roleFlow.collectAsState(initial = null)
    val isAdmin = role == "parking_admin"

    Column(modifier = Modifier.fillMaxSize().valetAppCanvas(colors.isDark)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Live Queue", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(colors.success)
                        )
                        Text(
                            "${response.tickets.size} active vehicle(s)",
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.inkSecondary,
                            modifier = Modifier.padding(start = 6.dp),
                        )
                    }
                }
                Button(
                    onClick = { showCheckIn = true },
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = colors.accent,
                        contentColor = Color.White,
                    ),
                    shape = RoundedCornerShape(50),
                ) { Text("+ Check-in", fontWeight = FontWeight.SemiBold) }
            }

            if (response.canToggleAutoAllocate) {
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(colors.tintBlue, colors.surface),
                            )
                        )
                        .border(1.dp, colors.primary.copy(alpha = 0.15f), RoundedCornerShape(18.dp))
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f).padding(end = 12.dp)) {
                        Text("Auto-allocate operators", fontWeight = FontWeight.Medium)
                        Text(
                            "Round-robin dispatch to the next available operator.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.inkSecondary,
                        )
                    }
                    Switch(
                        checked = response.autoAllocateEnabled,
                        onCheckedChange = { viewModel.setAutoAllocate(it) },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = colors.primary,
                            checkedBorderColor = Color.Transparent,
                            uncheckedThumbColor = colors.surface,
                            uncheckedTrackColor = colors.hairlineSoft,
                            uncheckedBorderColor = Color.Transparent,
                        ),
                    )
                }
            }

            Spacer(Modifier.height(12.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    ValetFilterChip(
                        selected = viewModel.statusFilter == null,
                        label = "All",
                        onClick = { viewModel.applyStatusFilter(null) },
                    )
                }
                items(response.filters.statusOptions) { option ->
                    ValetFilterChip(
                        selected = viewModel.statusFilter == option.value,
                        label = option.label,
                        onClick = { viewModel.applyStatusFilter(option.value) },
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
                TicketCard(
                    ticket = ticket,
                    viewModel = viewModel,
                    availableSlots = response.availableSlots,
                    operatorOptions = response.operatorOptions,
                    canMarkParked = isAdmin || ticket.checkedInBy == response.myAccountId,
                    canRequest = response.canRequest,
                    canDispatch = response.canDispatch,
                    modifier = Modifier.animateItem(),
                )
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
            item { TodaysSummaryStrip(response.tickets) }
        }
    }

    if (showCheckIn) {
        CheckInDialog(
            vehicleTypeOptions = response.filters.vehicleTypeOptions,
            qrCodeModeEnabled = response.guestRequestMode == "qr",
            pending = viewModel.mutationPending,
            onDismiss = { showCheckIn = false },
            onSubmit = { vehicleNumber, vehicleType, mobileNumber, qrCode, photos, onError ->
                viewModel.checkIn(vehicleNumber, vehicleType, mobileNumber, qrCode, photos) { error ->
                    if (error == null) showCheckIn = false else onError(error)
                }
            },
        )
    }
}

private fun timeAgo(iso: String): String = try {
    val minutes = Duration.between(OffsetDateTime.parse(iso), OffsetDateTime.now()).toMinutes()
    when {
        minutes < 1 -> "just now"
        minutes < 60 -> "${minutes}m ago"
        minutes < 60 * 24 -> "${minutes / 60}h ago"
        else -> "${minutes / (60 * 24)}d ago"
    }
} catch (e: Exception) {
    ""
}

@Composable
private fun TodaysSummaryStrip(tickets: List<QueueTicket>) {
    val colors = ValetTheme.colors
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text("Today's Summary", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                val summary = remember(tickets, colors) {
                    listOf(
                        Triple("Active", tickets.size, colors.primary),
                        Triple("Checked In", tickets.count { it.status == "checked_in" }, colors.statusCheckedIn),
                        Triple("Parked", tickets.count { it.status == "parked" }, colors.statusParked),
                        Triple("Requested", tickets.count { it.status == "requested" }, colors.statusRequested),
                    )
                }
                summary.forEach { (label, count, accent) ->
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(accent.copy(alpha = 0.10f))
                            .padding(vertical = 10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text("$count", fontWeight = FontWeight.Bold, color = accent)
                        Text(
                            label,
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.inkSecondary,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TicketCard(
    ticket: QueueTicket,
    viewModel: QueueViewModel,
    availableSlots: List<SlotOption>,
    operatorOptions: List<OperatorOption>,
    canMarkParked: Boolean,
    canRequest: Boolean,
    canDispatch: Boolean,
    modifier: Modifier = Modifier,
) {
    var showMarkParked by remember { mutableStateOf(false) }
    var showDispatch by remember { mutableStateOf(false) }
    var showHandover by remember { mutableStateOf(false) }
    var showEdit by remember { mutableStateOf(false) }
    var showVoid by remember { mutableStateOf(false) }
    var showPhotos by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }

    val colors = ValetTheme.colors
    val accent = statusAccent(ticket.status)

    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column {
            // Top row: status ribbon + time-ago + kebab
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                StatusPill(status = ticket.status, label = statusLabel(ticket.status))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        timeAgo(ticket.checkedInAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = colors.inkSecondary,
                    )
                    Box {
                        IconButton(onClick = { menuOpen = true }) {
                            Icon(Icons.Outlined.MoreVert, contentDescription = "More actions", tint = colors.inkSecondary)
                        }
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(text = { Text("Edit details") }, onClick = { menuOpen = false; showEdit = true })
                            DropdownMenuItem(text = { Text("Void ticket") }, onClick = { menuOpen = false; showVoid = true })
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))

            // Vehicle image + details
            Row {
                Image(
                    painter = painterResource(vehicleImageRes(ticket.vehicleType)),
                    contentDescription = ticket.vehicleType,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(88.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .border(1.dp, accent.copy(alpha = 0.4f), RoundedCornerShape(14.dp)),
                )
                Column(modifier = Modifier.padding(start = 14.dp)) {
                    Text(
                        ticket.vehicleNumber,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
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
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Slot: ${ticket.slotNumber ?: "—"}",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.inkSecondary,
                    )
                    if (ticket.qrCode != null) {
                        Text(
                            "QR: ${ticket.qrCode}",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.inkSecondary,
                        )
                    }
                    if (ticket.photoCount > 0) {
                        Text(
                            "${ticket.photoCount} photo(s)",
                            style = MaterialTheme.typography.bodySmall,
                            color = accent,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.clickable { showPhotos = true }.padding(top = 2.dp),
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            // Role-aware primary action, full-width in the status accent
            val actionShape = RoundedCornerShape(14.dp)
            @Composable
            fun accentAction(label: String, enabled: Boolean = true, onClick: () -> Unit) {
                Button(
                    onClick = onClick,
                    enabled = enabled,
                    shape = actionShape,
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = accent.copy(alpha = 0.18f),
                        contentColor = accent,
                        disabledContainerColor = colors.hairlineSoft,
                        disabledContentColor = colors.inkSecondary,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(label, fontWeight = FontWeight.SemiBold) }
            }

            when (ticket.status) {
                "checked_in" -> if (canMarkParked) {
                    accentAction(
                        label = if (availableSlots.isEmpty()) "No available slots" else "Mark as parked",
                        enabled = availableSlots.isNotEmpty(),
                    ) { showMarkParked = true }
                } else {
                    Text(
                        "Waiting for the check-in operator to park",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.inkSecondary,
                    )
                }
                "parked" -> if (canRequest) {
                    accentAction("Guest requested") { viewModel.requestVehicle(ticket.id) {} }
                }
                "requested" -> if (canDispatch) {
                    accentAction(
                        label = if (operatorOptions.isEmpty()) "No operators available" else "Dispatch operator",
                        enabled = operatorOptions.isNotEmpty(),
                    ) { showDispatch = true }
                } else {
                    Text(
                        "Awaiting dispatch by the Parking Admin",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.inkSecondary,
                    )
                }
                "in_transit" -> accentAction("Mark arrived") { viewModel.markArrived(ticket.id) {} }
                "arrived" -> Button(
                    onClick = { showHandover = true },
                    shape = actionShape,
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = colors.accent,
                        contentColor = Color.White,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Complete handover", fontWeight = FontWeight.SemiBold) }
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
            onConfirm = { otp, fare, paid, photo, onError ->
                viewModel.completeHandover(ticket.id, otp, fare, paid, photo) { error ->
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
    if (showPhotos) {
        PhotosDialog(
            ticketId = ticket.id,
            viewModel = viewModel,
            onDismiss = { showPhotos = false },
        )
    }
}

@Composable
private fun PhotosDialog(ticketId: String, viewModel: QueueViewModel, onDismiss: () -> Unit) {
    var photos by remember { mutableStateOf<List<TicketPhoto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val colors = ValetTheme.colors

    LaunchedEffect(ticketId) {
        viewModel.loadPhotos(ticketId) { result, err -> photos = result; error = err }
    }

    PremiumDialog(
        icon = Icons.Outlined.PhotoLibrary,
        title = "Ticket photos",
        subtitle = "Check-in and handover photos for this vehicle",
        accent = colors.primary,
        onDismissRequest = onDismiss,
        footer = { DialogPrimaryButton("Close", onClick = onDismiss, modifier = Modifier.weight(1f)) },
    ) {
        when {
            error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
            photos == null -> Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            photos!!.isEmpty() -> Text("No photos yet.", color = colors.inkSecondary)
            else -> photos!!.forEach { photo ->
                Text(
                    "${photo.stage} · ${photo.label}",
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
                )
                AsyncImage(
                    model = photo.url,
                    contentDescription = "${photo.stage} ${photo.label}",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(4f / 3f)
                        .clip(RoundedCornerShape(12.dp)),
                )
            }
        }
    }
}

@Composable
private fun CheckInDialog(
    vehicleTypeOptions: List<ai.instapark.valet.data.remote.dto.FilterOption>,
    qrCodeModeEnabled: Boolean,
    pending: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (String, String, String, String?, CheckInPhotos, (String) -> Unit) -> Unit,
) {
    var vehicleNumber by remember { mutableStateOf("") }
    var vehicleType by remember { mutableStateOf(vehicleTypeOptions.firstOrNull()?.value ?: "car") }
    var mobileNumber by remember { mutableStateOf("") }
    var qrCode by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var frontPhoto by remember { mutableStateOf<java.io.File?>(null) }
    var backPhoto by remember { mutableStateOf<java.io.File?>(null) }
    var leftPhoto by remember { mutableStateOf<java.io.File?>(null) }
    var rightPhoto by remember { mutableStateOf<java.io.File?>(null) }
    var odometerPhoto by remember { mutableStateOf<java.io.File?>(null) }
    val colors = ValetTheme.colors

    PremiumDialog(
        icon = Icons.Outlined.DirectionsCar,
        title = "Check-in Vehicle",
        subtitle = "Enter vehicle details to check-in",
        onDismissRequest = onDismiss,
        footer = {
            DialogSecondaryButton("Cancel", onClick = onDismiss, modifier = Modifier.weight(1f))
            DialogPrimaryButton(
                text = if (pending) "Checking in…" else "Check in",
                icon = Icons.Outlined.CheckCircle,
                enabled = !pending && vehicleNumber.isNotBlank() && mobileNumber.isNotBlank() &&
                    (!qrCodeModeEnabled || qrCode.isNotBlank()),
                onClick = {
                    val photos = CheckInPhotos(frontPhoto, backPhoto, leftPhoto, rightPhoto, odometerPhoto)
                    val code = qrCode.trim().takeIf { it.isNotBlank() }
                    onSubmit(vehicleNumber, vehicleType, mobileNumber, code, photos) { message -> error = message }
                },
                modifier = Modifier.weight(1.4f),
            )
        },
    ) {
        Text("Vehicle number", style = MaterialTheme.typography.labelMedium, color = colors.inkSecondary)
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = vehicleNumber,
            onValueChange = { vehicleNumber = it.uppercase() },
            placeholder = { Text("KA01AB1234") },
            singleLine = true,
            leadingIcon = { CountryChip() },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(14.dp))
        Text("Vehicle type", style = MaterialTheme.typography.labelMedium, color = colors.inkSecondary)
        Spacer(Modifier.height(6.dp))
        VehicleTypeSelector(
            options = vehicleTypeOptions,
            selected = vehicleType,
            onSelect = { vehicleType = it },
        )
        Spacer(Modifier.height(14.dp))
        Text("Mobile number", style = MaterialTheme.typography.labelMedium, color = colors.inkSecondary)
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = mobileNumber,
            onValueChange = { mobileNumber = it },
            placeholder = { Text("Enter mobile number") },
            singleLine = true,
            leadingIcon = { Icon(Icons.Outlined.Phone, contentDescription = null, tint = colors.inkSecondary) },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        if (qrCodeModeEnabled) {
            Spacer(Modifier.height(14.dp))
            Text("QR code", style = MaterialTheme.typography.labelMedium, color = colors.inkSecondary)
            Spacer(Modifier.height(4.dp))
            OutlinedTextField(
                value = qrCode,
                onValueChange = { qrCode = it.uppercase() },
                placeholder = { Text("e.g. IPK-0001") },
                singleLine = true,
                leadingIcon = { Icon(Icons.Outlined.QrCode, contentDescription = null, tint = colors.inkSecondary) },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Spacer(Modifier.height(14.dp))
        Text("Check-in photos (optional)", style = MaterialTheme.typography.labelMedium, color = colors.inkSecondary)
        Text(
            "Add clear photos of the vehicle",
            style = MaterialTheme.typography.labelSmall,
            color = colors.inkSecondary,
        )
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PhotoCaptureField("Front", frontPhoto, { frontPhoto = it }, Modifier.weight(1f))
            PhotoCaptureField("Back", backPhoto, { backPhoto = it }, Modifier.weight(1f))
            PhotoCaptureField("Left", leftPhoto, { leftPhoto = it }, Modifier.weight(1f))
            PhotoCaptureField("Right", rightPhoto, { rightPhoto = it }, Modifier.weight(1f))
        }
        Spacer(Modifier.height(8.dp))
        PhotoCaptureField("Odometer", odometerPhoto, { odometerPhoto = it }, Modifier.fillMaxWidth(0.25f))
        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = colors.danger, style = MaterialTheme.typography.bodySmall)
        }
    }
}

/** Static "IND" flag chip on the vehicle-number field, matching the reference. */
@Composable
private fun CountryChip() {
    val colors = ValetTheme.colors
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(colors.tintBlue)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    ) {
        Text("IND", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
    }
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
    val colors = ValetTheme.colors

    PremiumDialog(
        icon = Icons.Outlined.LocalParking,
        title = "Mark as Parked",
        subtitle = "Choose the slot this vehicle is parked in",
        accent = colors.primary,
        onDismissRequest = onDismiss,
        footer = {
            DialogSecondaryButton("Cancel", onClick = onDismiss, modifier = Modifier.weight(1f))
            DialogPrimaryButton(
                text = if (pending) "Saving…" else "Confirm parked",
                icon = Icons.Outlined.CheckCircle,
                enabled = !pending && selected.isNotBlank(),
                onClick = { onConfirm(selected) { message -> error = message } },
                modifier = Modifier.weight(1.4f),
            )
        },
    ) {
        TappableRowPicker(
            label = "Slot",
            options = slots.map { it.id to it.label },
            selected = selected,
            onSelect = { selected = it },
        )
        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = colors.danger, style = MaterialTheme.typography.bodySmall)
        }
    }
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
    val colors = ValetTheme.colors

    PremiumDialog(
        icon = Icons.Outlined.Group,
        title = "Dispatch Operator",
        subtitle = "Send this vehicle's pickup to an available operator",
        accent = colors.accent,
        onDismissRequest = onDismiss,
        footer = {
            DialogSecondaryButton("Cancel", onClick = onDismiss, modifier = Modifier.weight(1f))
            DialogPrimaryButton(
                text = if (pending) "Dispatching…" else "Dispatch",
                icon = Icons.Outlined.Group,
                enabled = !pending && selected.isNotBlank(),
                onClick = { onConfirm(selected) { message -> error = message } },
                modifier = Modifier.weight(1.4f),
            )
        },
    ) {
        TappableRowPicker(
            label = "Available operators",
            options = operators.map { it.id to it.label },
            selected = selected,
            onSelect = { selected = it },
        )
        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = colors.danger, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun HandoverDialog(
    pending: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String, String?, Boolean, java.io.File?, (String) -> Unit) -> Unit,
) {
    var otp by remember { mutableStateOf("") }
    var fare by remember { mutableStateOf("") }
    var paid by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var handoverPhoto by remember { mutableStateOf<java.io.File?>(null) }
    val colors = ValetTheme.colors

    PremiumDialog(
        icon = Icons.Outlined.VpnKey,
        title = "Complete Handover",
        subtitle = "Confirm OTP and collect payment to release the vehicle",
        accent = colors.success,
        onDismissRequest = onDismiss,
        footer = {
            DialogSecondaryButton("Cancel", onClick = onDismiss, modifier = Modifier.weight(1f))
            DialogPrimaryButton(
                text = if (pending) "Completing…" else "Complete handover",
                icon = Icons.Outlined.CheckCircle,
                enabled = !pending && otp.isNotBlank(),
                onClick = { onConfirm(otp, fare.ifBlank { null }, paid, handoverPhoto) { message -> error = message } },
                modifier = Modifier.weight(1.6f),
            )
        },
    ) {
        Text(
            "Ask the guest for the OTP sent to their phone and enter it below to confirm the handover.",
            style = MaterialTheme.typography.bodySmall,
            color = colors.inkSecondary,
        )
        Spacer(Modifier.height(10.dp))
        OtpBoxInput(value = otp, onValueChange = { otp = it })
        HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = colors.hairlineSoft)
        OutlinedTextField(
            value = fare,
            onValueChange = { fare = it },
            label = { Text("Fare amount (₹)") },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Switch(checked = paid, onCheckedChange = { paid = it })
            Spacer(Modifier.width(8.dp))
            Text("Payment collected", style = MaterialTheme.typography.bodySmall)
        }
        HorizontalDivider(modifier = Modifier.padding(vertical = 14.dp), color = colors.hairlineSoft)
        Text("Handover photo (optional)", style = MaterialTheme.typography.labelMedium, color = colors.inkSecondary)
        Spacer(Modifier.height(6.dp))
        PhotoCaptureField("Photo", handoverPhoto, { handoverPhoto = it }, Modifier.fillMaxWidth(0.4f))
        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = colors.danger, style = MaterialTheme.typography.bodySmall)
        }
    }
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
    val colors = ValetTheme.colors

    PremiumDialog(
        icon = Icons.Outlined.Edit,
        title = "Edit Vehicle Details",
        subtitle = "Correct a mis-entered plate or mobile number",
        onDismissRequest = onDismiss,
        footer = {
            DialogSecondaryButton("Cancel", onClick = onDismiss, modifier = Modifier.weight(1f))
            DialogPrimaryButton(
                text = if (pending) "Saving…" else "Save",
                enabled = !pending && vehicle.isNotBlank() && mobile.isNotBlank(),
                onClick = { onConfirm(vehicle, mobile) { message -> error = message } },
                modifier = Modifier.weight(1f),
            )
        },
    ) {
        OutlinedTextField(
            value = vehicle,
            onValueChange = { vehicle = it.uppercase() },
            label = { Text("Vehicle number") },
            singleLine = true,
            leadingIcon = { CountryChip() },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = mobile,
            onValueChange = { mobile = it },
            label = { Text("Mobile number") },
            singleLine = true,
            leadingIcon = { Icon(Icons.Outlined.Phone, contentDescription = null, tint = colors.inkSecondary) },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = colors.danger, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun VoidTicketDialog(
    pending: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String?, (String) -> Unit) -> Unit,
) {
    var reason by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    val colors = ValetTheme.colors

    PremiumDialog(
        icon = Icons.Outlined.DeleteOutline,
        title = "Void Ticket",
        subtitle = "Frees the assigned slot and removes this ticket from the queue",
        accent = colors.danger,
        onDismissRequest = onDismiss,
        footer = {
            DialogSecondaryButton("Cancel", onClick = onDismiss, modifier = Modifier.weight(1f))
            DialogPrimaryButton(
                text = if (pending) "Voiding…" else "Void",
                icon = Icons.Outlined.DeleteOutline,
                enabled = !pending,
                containerColor = colors.danger,
                onClick = { onConfirm(reason.ifBlank { null }) { message -> error = message } },
                modifier = Modifier.weight(1f),
            )
        },
    ) {
        OutlinedTextField(
            value = reason,
            onValueChange = { reason = it },
            label = { Text("Reason (optional)") },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = colors.danger, style = MaterialTheme.typography.bodySmall)
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
