package ai.instapark.valet.ui.configuration

import ai.instapark.valet.data.remote.dto.CreateTariffRuleRequest
import ai.instapark.valet.data.remote.dto.QrCodeItem
import ai.instapark.valet.data.remote.dto.TariffRuleItem
import ai.instapark.valet.data.remote.dto.VehicleTypeItem
import ai.instapark.valet.data.remote.dto.ZoneItem
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.DialogPrimaryButton
import ai.instapark.valet.ui.components.DialogSecondaryButton
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.components.PremiumDialog
import ai.instapark.valet.ui.components.SegmentOption
import ai.instapark.valet.ui.components.AnimatedSegmented
import ai.instapark.valet.ui.components.TappableRowPicker
import ai.instapark.valet.ui.theme.ValetTheme
import ai.instapark.valet.ui.theme.valetAppCanvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CurrencyRupee
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.LocalParking
import androidx.compose.material.icons.outlined.QrCode
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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

private val tabOptions = listOf(
    SegmentOption(ConfigTab.ZONES.name, "Zones", Icons.Outlined.LocalParking),
    SegmentOption(ConfigTab.VEHICLE_TYPES.name, "Vehicles", Icons.Outlined.DirectionsCar),
    SegmentOption(ConfigTab.TARIFFS.name, "Fares", Icons.Outlined.CurrencyRupee),
    SegmentOption(ConfigTab.GUEST_REQUESTS.name, "Requests", Icons.Outlined.QrCode),
)

@Composable
fun ConfigurationScreen() {
    val container = appContainer()
    val viewModel: ConfigurationViewModel = viewModel(
        factory = ConfigurationViewModelFactory(container.configurationRepository)
    )
    val colors = ValetTheme.colors

    Column(modifier = Modifier.fillMaxSize().valetAppCanvas(colors.isDark)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Configuration", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            AnimatedSegmented(
                options = tabOptions,
                selected = viewModel.selectedTab.name,
                onSelect = { viewModel.selectTab(ConfigTab.valueOf(it)) },
            )
        }

        when (val state = viewModel.loadState) {
            is ConfigLoadState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            is ConfigLoadState.Error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.message)
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = { viewModel.refreshCurrentTab() }) { Text("Retry") }
                }
            }
            is ConfigLoadState.Success -> when (viewModel.selectedTab) {
                ConfigTab.ZONES -> ZonesTab(viewModel)
                ConfigTab.VEHICLE_TYPES -> VehicleTypesTab(viewModel)
                ConfigTab.TARIFFS -> TariffsTab(viewModel)
                ConfigTab.GUEST_REQUESTS -> GuestRequestsTab(viewModel)
            }
        }
    }
}

@Composable
private fun fieldColors(colors: ai.instapark.valet.ui.theme.ValetColors) = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = colors.fieldFill,
    unfocusedContainerColor = colors.fieldFill,
    focusedBorderColor = colors.primary,
    unfocusedBorderColor = colors.fieldBorder,
)

// -- Zones & Slots ----------------------------------------------------------

@Composable
private fun ZonesTab(viewModel: ConfigurationViewModel) {
    val colors = ValetTheme.colors
    var addZoneOpen by remember { mutableStateOf(false) }
    var addSlotForZone by remember { mutableStateOf<ZoneItem?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.End) {
            DialogSecondaryButton(text = "+ Zone", onClick = { addZoneOpen = true })
        }
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(viewModel.zones, key = { it.id }) { zone ->
                GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(zone.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                            Row {
                                IconButton(onClick = { addSlotForZone = zone }) {
                                    Icon(Icons.Outlined.Add, contentDescription = "Add slot", tint = colors.primary)
                                }
                                IconButton(onClick = { viewModel.deleteZone(zone.id) }) {
                                    Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete zone", tint = colors.danger)
                                }
                            }
                        }
                        if (zone.slots.isNotEmpty()) {
                            Spacer(Modifier.height(8.dp))
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                zone.slots.forEach { slot ->
                                    Box(
                                        modifier = Modifier
                                            .background(colors.tintBlue, RoundedCornerShape(10.dp))
                                            .padding(horizontal = 10.dp, vertical = 6.dp),
                                    ) {
                                        Text(slot.slotNumber, style = MaterialTheme.typography.labelMedium, color = colors.primary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (viewModel.zones.isEmpty()) {
                item { Text("No zones yet.", modifier = Modifier.padding(24.dp)) }
            }
        }
    }

    if (addZoneOpen) {
        SingleTextFieldDialog(
            icon = Icons.Outlined.LocalParking,
            title = "New zone",
            label = "Name",
            onDismiss = { addZoneOpen = false },
            onSubmit = { name -> viewModel.createZone(name); addZoneOpen = false },
        )
    }

    addSlotForZone?.let { zone ->
        SingleTextFieldDialog(
            icon = Icons.Outlined.LocalParking,
            title = "New slot in ${zone.name}",
            label = "Slot number",
            onDismiss = { addSlotForZone = null },
            onSubmit = { slotNumber -> viewModel.createSlot(zone.id, slotNumber, isEv = false, isDisabledSlot = false); addSlotForZone = null },
        )
    }
}

// -- Vehicle types ------------------------------------------------------

@Composable
private fun VehicleTypesTab(viewModel: ConfigurationViewModel) {
    val colors = ValetTheme.colors
    var addOpen by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.End) {
            DialogSecondaryButton(text = "+ Vehicle type", onClick = { addOpen = true })
        }
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(viewModel.vehicleTypes, key = { it.id }) { vt: VehicleTypeItem ->
                GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 14.dp) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(vt.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                        IconButton(onClick = { viewModel.deleteVehicleType(vt.id) }) {
                            Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete", tint = colors.danger)
                        }
                    }
                }
            }
            if (viewModel.vehicleTypes.isEmpty()) {
                item { Text("No vehicle types yet.", modifier = Modifier.padding(24.dp)) }
            }
        }
    }

    if (addOpen) {
        SingleTextFieldDialog(
            icon = Icons.Outlined.DirectionsCar,
            title = "New vehicle type",
            label = "Name",
            onDismiss = { addOpen = false },
            onSubmit = { name -> viewModel.createVehicleType(name); addOpen = false },
        )
    }
}

// -- Tariffs --------------------------------------------------------------

private val pricingTypeOptions = listOf("flat" to "Flat", "hourly" to "Hourly", "surge" to "Surge")

@Composable
private fun TariffsTab(viewModel: ConfigurationViewModel) {
    val colors = ValetTheme.colors
    var addOpen by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.End) {
            DialogSecondaryButton(text = "+ Fare rule", onClick = { addOpen = true })
        }
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(viewModel.tariffRules, key = { it.id }) { rule: TariffRuleItem ->
                GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 14.dp) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text(rule.vehicleCategory, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                            Text(
                                "${rule.pricingType} · ₹${rule.rate}" + (rule.surgeMultiplier?.let { " × $it" } ?: ""),
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.inkSecondary,
                            )
                        }
                        IconButton(onClick = { viewModel.deleteTariffRule(rule.id) }) {
                            Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete", tint = colors.danger)
                        }
                    }
                }
            }
            if (viewModel.tariffRules.isEmpty()) {
                item { Text("No fare rules yet.", modifier = Modifier.padding(24.dp)) }
            }
        }
    }

    if (addOpen) {
        AddTariffRuleDialog(
            onDismiss = { addOpen = false },
            onSubmit = { request -> viewModel.createTariffRule(request); addOpen = false },
        )
    }
}

@Composable
private fun AddTariffRuleDialog(onDismiss: () -> Unit, onSubmit: (CreateTariffRuleRequest) -> Unit) {
    val colors = ValetTheme.colors
    var vehicleCategory by remember { mutableStateOf("") }
    var pricingType by remember { mutableStateOf("flat") }
    var rate by remember { mutableStateOf("") }
    var surge by remember { mutableStateOf("") }

    PremiumDialog(
        icon = Icons.Outlined.CurrencyRupee,
        title = "New fare rule",
        onDismissRequest = onDismiss,
        footer = {
            DialogSecondaryButton(text = "Cancel", onClick = onDismiss, modifier = Modifier.weight(1f))
            DialogPrimaryButton(
                text = "Create",
                enabled = vehicleCategory.isNotBlank() && rate.toDoubleOrNull() != null,
                onClick = {
                    onSubmit(
                        CreateTariffRuleRequest(
                            vehicleCategory = vehicleCategory.trim(),
                            pricingType = pricingType,
                            rate = rate.toDoubleOrNull(),
                            surgeMultiplier = surge.toDoubleOrNull(),
                        )
                    )
                },
                modifier = Modifier.weight(1f),
            )
        },
    ) {
        OutlinedTextField(
            value = vehicleCategory,
            onValueChange = { vehicleCategory = it },
            label = { Text("Vehicle category") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors(colors),
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        )
        Spacer(Modifier.height(12.dp))
        TappableRowPicker(
            label = "Pricing type",
            options = pricingTypeOptions,
            selected = pricingType,
            onSelect = { pricingType = it },
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = rate,
            onValueChange = { rate = it },
            label = { Text(if (pricingType == "surge") "Base rate" else "Rate") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors(colors),
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        )
        if (pricingType == "surge") {
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = surge,
                onValueChange = { surge = it },
                label = { Text("Surge multiplier") },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = fieldColors(colors),
                modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
            )
        }
    }
}

// -- Guest requests / QR --------------------------------------------------

@Composable
private fun GuestRequestsTab(viewModel: ConfigurationViewModel) {
    val colors = ValetTheme.colors
    val data = viewModel.guestRequests ?: return
    var generateOpen by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Guest check-in mode", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        TappableRowPicker(
            label = "",
            options = listOf("link" to "Shareable link", "qr" to "QR code"),
            selected = data.guestRequestMode,
            onSelect = { viewModel.setGuestRequestMode(it) },
        )

        if (data.guestRequestMode == "qr") {
            Spacer(Modifier.height(20.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("QR codes", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                DialogSecondaryButton(text = "+ Generate", onClick = { generateOpen = true })
            }
            Spacer(Modifier.height(10.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(data.qrCodes, key = { it.id }) { code: QrCodeItem ->
                    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 12.dp) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(code.code, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                            Text(
                                if (code.inUse) "In use" else "Available",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (code.inUse) colors.warning else colors.success,
                            )
                        }
                    }
                }
                if (data.qrCodes.isEmpty()) {
                    item { Text("No QR codes yet.", modifier = Modifier.padding(vertical = 12.dp)) }
                }
            }
        }
    }

    if (generateOpen) {
        SingleTextFieldDialog(
            icon = Icons.Outlined.QrCode,
            title = "Generate QR codes",
            label = "Count",
            onDismiss = { generateOpen = false },
            onSubmit = { count -> count.toIntOrNull()?.let { viewModel.generateQrCodes(it) }; generateOpen = false },
        )
    }
}

// -- Shared: single-field dialog ---------------------------------------

@Composable
private fun SingleTextFieldDialog(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    label: String,
    onDismiss: () -> Unit,
    onSubmit: (String) -> Unit,
) {
    val colors = ValetTheme.colors
    var value by remember { mutableStateOf("") }

    PremiumDialog(
        icon = icon,
        title = title,
        onDismissRequest = onDismiss,
        footer = {
            DialogSecondaryButton(text = "Cancel", onClick = onDismiss, modifier = Modifier.weight(1f))
            DialogPrimaryButton(
                text = "Save",
                enabled = value.isNotBlank(),
                onClick = { onSubmit(value.trim()) },
                modifier = Modifier.weight(1f),
            )
        },
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = { value = it },
            label = { Text(label) },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors(colors),
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        )
    }
}
