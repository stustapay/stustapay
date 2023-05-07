package de.stustanet.stustapay.ui.history

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.OrderType
import de.stustanet.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch

@Composable
fun SaleHistoryView(
    viewModel: SaleHistoryViewModel = hiltViewModel(),
    leaveView: () -> Unit
) {
    val sales by viewModel.sales.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(null) {
        viewModel.fetchHistory()
    }

    NavScaffold(title = { Text("Transaction History") }, navigateBack = leaveView) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp)
        ) {
            Button(modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp),
                enabled = sales.isNotEmpty() && sales.first().type == OrderType.Sale,
                onClick = {
                    scope.launch {
                        if (sales.isNotEmpty()) {
                            viewModel.cancelSale(sales.first().id)
                        }
                    }
                }) {
                Text("Cancel Last Sale", fontSize = 24.sp)
            }

            Column(modifier = Modifier.verticalScroll(state = scrollState)) {
                for (sale in sales) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            "${sale.timestamp.dayOfWeek} ${sale.timestamp.toLocalTime()}",
                            fontSize = 24.sp
                        )
                        Text("${sale.amount}€", fontSize = 24.sp)
                    }
                }
            }
        }
    }
}