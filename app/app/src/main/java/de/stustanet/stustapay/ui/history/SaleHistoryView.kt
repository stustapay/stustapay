package de.stustanet.stustapay.ui.history

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.Order
import de.stustanet.stustapay.model.OrderType
import de.stustanet.stustapay.ui.common.pay.ProductConfirmItem
import de.stustanet.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

@Composable
fun SaleHistoryView(
    viewModel: SaleHistoryViewModel = hiltViewModel(),
    leaveView: () -> Unit
) {
    val sales by viewModel.sales.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()
    var detailDialog by remember { mutableStateOf(false) }
    var detailOrder by remember { mutableStateOf<Order?>(null) }

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
                enabled = sales.isNotEmpty() && sales.first().order_type == OrderType.Sale,
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
                            .padding(bottom = 10.dp)
                            .clickable {
                                detailOrder = sale
                                detailDialog = true
                            },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            ZonedDateTime.parse(sale.booked_at).toLocalDateTime()
                                .format(DateTimeFormatter.ofPattern("E HH:mm:ss")),
                            fontSize = 24.sp
                        )
                        Text("${sale.total_price}€", fontSize = 24.sp)
                    }
                }
            }
        }
    }

    if (detailDialog) {
        Dialog(onDismissRequest = { detailDialog = false }) {
            Card(
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.width(350.dp),
                elevation = 8.dp,
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            ZonedDateTime.parse(detailOrder!!.booked_at).toLocalDateTime()
                                .format(DateTimeFormatter.ofPattern("dd-MM-yyyy")), fontSize = 24.sp
                        )

                        Text(
                            ZonedDateTime.parse(detailOrder!!.booked_at).toLocalDateTime()
                                .format(DateTimeFormatter.ofPattern("HH:mm:ss")), fontSize = 24.sp
                        )
                    }

                    Divider()

                    for (item in detailOrder!!.line_items) {
                        ProductConfirmItem(
                            name = item.product.name,
                            price = item.product_price,
                            quantity = item.quantity
                        )
                    }

                    Divider()

                    ProductConfirmItem(
                        name = "Summe",
                        price = detailOrder!!.total_price,
                    )
                }
            }
        }
    }
}