package ai.instapark.valet.ui.search

import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.theme.ValetTheme
import ai.instapark.valet.ui.util.vehicleImageRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

/**
 * HANDOFF 28-Jul §10, screen 5c "Search -- recents & quick actions". New feature
 * (confirmed with product owner): live results across active queue + vehicle history,
 * a persisted recent-searches list with Clear, and quick actions. "Scan plate" routes
 * to the existing check-in flow (manual entry/photo capture) -- no OCR, per decision.
 */
// Statuses QueueScreen's own "All" filter chip covers -- anything else (completed,
// voided, etc.) only ever shows up in Vehicles' history list. Reused here to decide
// which tab a tapped result should open.
private val ACTIVE_STATUSES = setOf("checked_in", "parked", "requested", "in_transit", "arrived")

@Composable
fun SearchOverlay(
    onDismiss: () -> Unit,
    onGoToQueue: () -> Unit,
    onGoToVehicles: () -> Unit,
) {
    val container = appContainer()
    val viewModel: SearchViewModel = viewModel(
        factory = SearchViewModelFactory(container.queueRepository, container.vehiclesRepository, container.searchStore)
    )
    val colors = ValetTheme.colors
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        keyboardController?.show()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            // High-opacity, theme-independent (a dark tint at low alpha barely dims an
            // already-dark background in dark theme, which was letting the Home screen's own
            // search field render through crisply behind this overlay's search field).
            .background(Color.Black.copy(alpha = 0.75f))
            .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) { onDismiss() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 60.dp, start = 16.dp, end = 16.dp)
                .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) { /* absorb clicks */ },
        ) {
            // Search input pill
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(colors.surface)
                    .border(BorderStroke(1.5.dp, colors.primary), RoundedCornerShape(18.dp))
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Search, contentDescription = null, tint = colors.primary, modifier = Modifier.size(19.dp))
                Box(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
                    if (viewModel.query.isEmpty()) {
                        Text("Search plate, guest or slot…", color = colors.inkTertiary, style = MaterialTheme.typography.bodyMedium)
                    }
                    BasicTextField(
                        value = viewModel.query,
                        onValueChange = viewModel::onQueryChange,
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = colors.ink),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        modifier = Modifier.fillMaxWidth().focusRequester(focusRequester),
                    )
                }
                Text(
                    "Cancel",
                    color = colors.inkTertiary,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.clickable { onDismiss() },
                )
            }
            Spacer(Modifier.height(12.dp))

            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = 0.dp) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    if (viewModel.results.isNotEmpty()) {
                        SectionLabel("Results")
                        viewModel.results.forEach { result ->
                            ResultRow(result) {
                                viewModel.commitSearch(result.plate)
                                container.pendingHighlightTicketId = result.id
                                onDismiss()
                                if (result.status in ACTIVE_STATUSES) onGoToQueue() else onGoToVehicles()
                            }
                        }
                        Divider()
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 14.dp, start = 18.dp, end = 18.dp, bottom = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        SectionLabelText("Recent searches")
                        Text(
                            "Clear",
                            style = MaterialTheme.typography.labelMedium,
                            color = colors.primary,
                            modifier = Modifier.clickable { viewModel.clearRecents() },
                        )
                    }
                    if (viewModel.recentSearches.isEmpty()) {
                        Text(
                            "No recent searches yet.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.inkTertiary,
                            modifier = Modifier.padding(horizontal = 18.dp, vertical = 8.dp),
                        )
                    } else {
                        viewModel.recentSearches.forEach { entry ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.onQueryChange(entry.query) }
                                    .padding(horizontal = 18.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Box(
                                    modifier = Modifier.size(34.dp).clip(CircleShape).background(colors.hairlineSoft),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(Icons.Outlined.History, contentDescription = null, tint = colors.inkTertiary, modifier = Modifier.size(17.dp))
                                }
                                Column(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
                                    Text(entry.query, style = MaterialTheme.typography.bodyMedium, color = colors.ink)
                                    Text(entry.kind, style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
                                }
                            }
                        }
                    }
                    Divider()

                    SectionLabel("Quick actions", paddingBottom = 8.dp)
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        QuickActionChip(
                            icon = Icons.Outlined.Add,
                            label = "New check-in",
                            bg = colors.tintOrange,
                            fg = colors.accent,
                            modifier = Modifier.weight(1f),
                            onClick = { onDismiss(); onGoToQueue() },
                        )
                        QuickActionChip(
                            icon = Icons.Outlined.CameraAlt,
                            label = "Scan plate",
                            bg = colors.tintBlue,
                            fg = colors.primary,
                            modifier = Modifier.weight(1f),
                            onClick = { onDismiss(); onGoToQueue() },
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String, paddingBottom: androidx.compose.ui.unit.Dp = 4.dp) {
    val colors = ValetTheme.colors
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = colors.inkTertiary,
        modifier = Modifier.padding(start = 18.dp, top = 14.dp, bottom = paddingBottom),
    )
}

@Composable
private fun SectionLabelText(text: String) {
    val colors = ValetTheme.colors
    Text(text.uppercase(), style = MaterialTheme.typography.labelSmall, color = colors.inkTertiary)
}

@Composable
private fun Divider() {
    val colors = ValetTheme.colors
    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(colors.hairlineSoft))
}

@Composable
private fun ResultRow(result: SearchResult, onClick: () -> Unit) {
    val colors = ValetTheme.colors
    val (chipBg, chipFg) = statusChip(result.status, colors)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 18.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            painter = painterResource(vehicleImageRes(result.vehicleType)),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(40.dp).clip(RoundedCornerShape(14.dp)).background(colors.hairlineSoft),
        )
        Column(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
            Text(result.plate, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(
                result.meta,
                style = MaterialTheme.typography.labelMedium,
                color = colors.inkSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Box(
            modifier = Modifier.clip(RoundedCornerShape(50)).background(chipBg).padding(horizontal = 10.dp, vertical = 5.dp),
        ) {
            Text(result.status.uppercase(), style = MaterialTheme.typography.labelSmall, color = chipFg, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun statusChip(status: String, colors: ai.instapark.valet.ui.theme.ValetColors): Pair<Color, Color> = when (status) {
    "checked_in" -> colors.statusCheckedInBg to colors.statusCheckedIn
    "parked" -> colors.statusParkedBg to colors.statusParked
    "requested" -> colors.statusRequestedBg to colors.statusRequested
    "in_transit" -> colors.statusInTransitBg to colors.statusInTransit
    "arrived", "completed" -> colors.statusDoneBg to colors.statusDone
    "voided" -> colors.statusVoidedBg to colors.statusVoided
    else -> colors.hairlineSoft to colors.inkSecondary
}

@Composable
private fun QuickActionChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    bg: Color,
    fg: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(bg)
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(18.dp))
        Text(label, color = fg, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(start = 8.dp))
    }
}
