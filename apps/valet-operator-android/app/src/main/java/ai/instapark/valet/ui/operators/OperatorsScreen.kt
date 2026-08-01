package ai.instapark.valet.ui.operators

import ai.instapark.valet.data.remote.dto.OperatorItem
import ai.instapark.valet.data.repository.OperatorFormInput
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.DialogPrimaryButton
import ai.instapark.valet.ui.components.DialogSecondaryButton
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.components.PremiumDialog
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
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun OperatorsScreen() {
    val container = appContainer()
    val viewModel: OperatorsViewModel = viewModel(factory = OperatorsViewModelFactory(container.operatorsRepository))
    val colors = ValetTheme.colors

    Scaffold(
        containerColor = Color.Transparent,
        floatingActionButton = {
            FloatingActionButton(onClick = viewModel::openCreateDialog, containerColor = colors.accent) {
                Icon(Icons.Outlined.Add, contentDescription = "New operator", tint = Color.White)
            }
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).valetAppCanvas(colors.isDark)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Valet Operators", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            }

            when (val state = viewModel.uiState) {
                is OperatorsUiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                is OperatorsUiState.Error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.message)
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = { viewModel.load() }) { Text("Retry") }
                    }
                }
                is OperatorsUiState.Success -> {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(state.operators, key = { it.id }) { op ->
                            OperatorCard(
                                operator = op,
                                onToggleActive = { viewModel.setActive(op.id, !op.isActive) },
                                onDelete = { viewModel.deleteOperator(op.id) },
                            )
                        }
                        if (state.operators.isEmpty()) {
                            item { Text("No valet operators yet.", modifier = Modifier.padding(24.dp)) }
                        }
                    }
                }
            }
        }
    }

    if (viewModel.createDialogOpen) {
        CreateOperatorDialog(
            pending = viewModel.actionPending,
            error = viewModel.actionError,
            onDismiss = viewModel::closeCreateDialog,
            onCreate = viewModel::createOperator,
        )
    }
}

@Composable
private fun OperatorCard(operator: OperatorItem, onToggleActive: () -> Unit, onDelete: () -> Unit) {
    val colors = ValetTheme.colors
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .padding(end = 12.dp)
                    .background(colors.tintBlue, RoundedCornerShape(50))
                    .padding(8.dp),
            ) {
                Icon(Icons.Outlined.Badge, contentDescription = null, tint = colors.primary)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    operator.fullName ?: operator.username,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    listOfNotNull(operator.employeeId, operator.dailyStatus).joinToString(" · ").ifBlank { operator.username },
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.inkSecondary,
                )
            }
            Switch(
                checked = operator.isActive,
                onCheckedChange = { onToggleActive() },
                colors = SwitchDefaults.colors(checkedTrackColor = colors.success),
            )
            IconButton(onClick = onDelete) {
                Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete", tint = colors.danger)
            }
        }
    }
}

@Composable
private fun CreateOperatorDialog(
    pending: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onCreate: (OperatorFormInput) -> Unit,
) {
    val colors = ValetTheme.colors
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var employeeId by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = colors.fieldFill,
        unfocusedContainerColor = colors.fieldFill,
        focusedBorderColor = colors.primary,
        unfocusedBorderColor = colors.fieldBorder,
    )

    PremiumDialog(
        icon = Icons.Outlined.Badge,
        title = "New valet operator",
        onDismissRequest = onDismiss,
        footer = {
            DialogSecondaryButton(text = "Cancel", onClick = onDismiss, modifier = Modifier.weight(1f))
            DialogPrimaryButton(
                text = if (pending) "Creating…" else "Create",
                enabled = !pending && username.isNotBlank() && password.isNotBlank(),
                onClick = {
                    onCreate(
                        OperatorFormInput(
                            username = username.trim(),
                            password = password,
                            fullName = fullName.trim().ifBlank { null },
                            employeeId = employeeId.trim().ifBlank { null },
                            phone = phone.trim().ifBlank { null },
                        )
                    )
                },
                modifier = Modifier.weight(1f),
            )
        },
    ) {
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Username") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = fullName,
            onValueChange = { fullName = it },
            label = { Text("Full name") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = employeeId,
            onValueChange = { employeeId = it },
            label = { Text("Employee ID") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Phone") },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = fieldColors,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        )
        if (error != null) {
            Spacer(Modifier.height(10.dp))
            Text(error, color = colors.danger, style = MaterialTheme.typography.bodySmall)
        }
    }
}
