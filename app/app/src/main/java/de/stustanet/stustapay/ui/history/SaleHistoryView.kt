package de.stustanet.stustapay.ui.history

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.Order
import de.stustanet.stustapay.model.OrderType
import de.stustanet.stustapay.ui.common.pay.ProductConfirmItem
import de.stustanet.stustapay.ui.nav.NavScaffold
import de.stustanet.stustapay.ui.theme.errorButtonColors
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
    var detailOrder by remember { mutableStateOf<Order?>(null) }
    var cancelOrder by remember { mutableStateOf(false) }
    val haptic = LocalHapticFeedback.current

    LaunchedEffect(null) {
        viewModel.fetchHistory()
    }

    NavScaffold(title = { Text("Transaction History") }, navigateBack = leaveView) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp)
                .verticalScroll(state = scrollState)
        ) {
            for (sale in sales) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp)
                        .clickable {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            detailOrder = sale
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

    if (detailOrder != null) {
        val sale = detailOrder!!
        Dialog(onDismissRequest = { detailOrder = null }) {
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
                            ZonedDateTime.parse(sale.booked_at).toLocalDateTime()
                                .format(DateTimeFormatter.ofPattern("dd-MM-yyyy")), fontSize = 24.sp
                        )

                        Text(
                            ZonedDateTime.parse(sale.booked_at).toLocalDateTime()
                                .format(DateTimeFormatter.ofPattern("HH:mm:ss")), fontSize = 24.sp
                        )
                    }

                    Divider()

                    for (item in sale.line_items) {
                        ProductConfirmItem(
                            name = item.product.name,
                            price = item.product_price,
                            quantity = item.quantity
                        )
                    }

                    Divider()

                    ProductConfirmItem(
                        name = "Summe",
                        price = sale.total_price,
                    )

                    Divider()

                    if (sale.id == sales.first().id && sale.order_type == OrderType.Sale) {
                        Button(modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                cancelOrder = true
                            }) {
                            Text("Cancel Sale", fontSize = 24.sp)
                        }
                    }
                }
            }
        }
    }

    if (cancelOrder && detailOrder != null) {
        val sale = detailOrder!!
        Dialog(onDismissRequest = {
            detailOrder = null
            cancelOrder = false
        }) {
            Card(
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.width(350.dp),
                elevation = 8.dp,
            ) {
                Column {
                    Text("Confirm cancellation", textAlign = TextAlign.Center, fontSize = 48.sp)

                    Button(modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                        colors = errorButtonColors(),
                        onClick = {
                            scope.launch {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                viewModel.cancelSale(sale.id)
                                detailOrder = null
                                cancelOrder = false
                            }
                        }) {
                        Text("Cancel Sale", fontSize = 24.sp)
                    }
                }
            }
        }

    }
}