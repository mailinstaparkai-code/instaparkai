package ai.instapark.valet.ui.reports

import ai.instapark.valet.data.remote.dto.TransactionRow
import ai.instapark.valet.data.remote.dto.VehicleTransactionsResponse
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.components.GlassCard
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
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
fun ReportsScreen() {
    val container = appContainer()
    val viewModel: ReportsViewModel = viewModel(factory = ReportsViewModelFactory(container.reportsRepository))

    when (val state = viewModel.uiState) {
        is ReportsUiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        is ReportsUiState.Error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(state.message)
                Spacer(Modifier.height(8.dp))
                Button(onClick = { viewModel.load() }) { Text("Retry") }
            }
        }
        is ReportsUiState.Success -> ReportsContent(state.response, viewModel)
    }
}

@Composable
private fun ReportsContent(response: VehicleTransactionsResponse, viewModel: ReportsViewModel) {
    val colors = ValetTheme.colors
    Column(modifier = Modifier.fillMaxSize().valetAppCanvas(colors.isDark)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Vehicle Transaction Report", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                "Last 30 days · ${response.totalCount} transaction(s)" +
                    (response.cappedAt?.let { " (capped at $it)" } ?: ""),
                style = MaterialTheme.typography.bodySmall,
                color = colors.inkSecondary,
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                ReportStat(response.stats.checkIns.toString(), "Check-ins", Modifier)
                ReportStat(response.stats.handovers.toString(), "Handovers", Modifier)
                ReportStat(response.stats.activeOperators.toString(), "Operators", Modifier)
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(response.transactions, key = { it.key }) { row -> TransactionCard(row) }
            if (response.transactions.isEmpty()) {
                item { Text("No transactions for this range.", modifier = Modifier.padding(24.dp)) }
            }
        }

        if (response.totalPages > 1) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
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
private fun ReportStat(value: String, label: String, modifier: Modifier = Modifier) {
    val colors = ValetTheme.colors
    GlassCard(modifier = modifier, cornerRadius = 16.dp) {
        Column {
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.labelSmall, color = colors.inkSecondary)
        }
    }
}

@Composable
private fun TransactionCard(row: TransactionRow) {
    val colors = ValetTheme.colors
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(row.vehicleNumber, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                Text(row.operatorLabel, style = MaterialTheme.typography.bodySmall, color = colors.inkSecondary)
            }
            Column(horizontalAlignment = Alignment.End) {
                Box(
                    modifier = Modifier
                        .background(colors.tintBlue, RoundedCornerShape(50))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                ) {
                    Text(row.label, style = MaterialTheme.typography.labelSmall, color = colors.primary, fontWeight = FontWeight.SemiBold)
                }
                if (row.fare != null) {
                    Text(
                        "₹${row.fare} ${if (row.paymentCollected == true) "paid" else "pending"}",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (row.paymentCollected == true) colors.success else colors.warning,
                    )
                }
            }
        }
    }
}
