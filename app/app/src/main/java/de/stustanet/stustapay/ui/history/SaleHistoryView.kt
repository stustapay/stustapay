package de.stustanet.stustapay.ui.history

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.model.Order
import de.stustanet.stustapay.model.OrderType
import de.stustanet.stustapay.ui.common.pay.ProductConfirmItem
import de.stustanet.stustapay.ui.nav.NavScaffold
import de.stustanet.stustapay.ui.theme.errorButtonColors
import de.stustanet.stustapay.ui.user.UserRequestState
import de.stustanet.stustapay.util.formatCurrencyValue
import kotlinx.coroutines.launch
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.*

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
    val status by viewModel.status.collectAsStateWithLifecycle()

    LaunchedEffect(null) {
        viewModel.fetchHistory()
    }

    NavScaffold(title = { Text(stringResource(R.string.history_title)) }, navigateBack = leaveView) {
        Scaffold(
            content = { padding ->
                Column(
                    modifier = Modifier
                        .padding(padding)
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
                                    viewModel.idleStatus()
                                    detailOrder = sale
                                },
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                ZonedDateTime.parse(sale.booked_at)
                                    .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                                    .format(DateTimeFormatter.ofPattern("E HH:mm:ss")),
                                fontSize = 24.sp
                            )
                            Text(formatCurrencyValue(sale.total_price), fontSize = 24.sp)
                        }
                    }
                }
            },
            bottomBar = {
                Column {
                    Spacer(modifier = Modifier.height(10.dp))
                    Divider()
                    Spacer(modifier = Modifier.height(10.dp))
                    Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                        Column {
                            val text = when (status) {
                                is SaleHistoryStatus.Idle -> {
                                    stringResource(R.string.common_status_idle)
                                }
                                is SaleHistoryStatus.Fetching -> {
                                    stringResource(R.string.common_status_fetching)
                                }
                                is SaleHistoryStatus.Done -> {
                                    stringResource(R.string.common_status_done)
                                }
                                is SaleHistoryStatus.Failed -> {
                                    (status as SaleHistoryStatus.Failed).msg
                                }
                            }
                            Text(text, fontSize = 24.sp)
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }
            }
        )
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
                            ZonedDateTime.parse(sale.booked_at)
                                .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                                .format(DateTimeFormatter.ofPattern("dd-MM-yyyy")), fontSize = 24.sp
                        )

                        Text(
                            ZonedDateTime.parse(sale.booked_at)
                                .withZoneSameInstant(TimeZone.getDefault().toZoneId())
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
                        name = stringResource(R.string.history_sum),
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
                            Text(stringResource(R.string.history_cancel), fontSize = 24.sp)
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
                    Text(stringResource(R.string.history_confirm), textAlign = TextAlign.Center, fontSize = 48.sp)

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
                        Text(stringResource(R.string.history_cancel), fontSize = 24.sp)
                    }
                }
            }
        }

    }
}