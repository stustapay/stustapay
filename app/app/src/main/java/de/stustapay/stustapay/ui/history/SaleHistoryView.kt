package de.stustapay.stustapay.ui.history

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.AlertDialog
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
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
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.Order
import de.stustapay.api.models.OrderType
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem
import de.stustapay.stustapay.ui.nav.NavScaffold
import de.stustapay.libssp.ui.theme.errorButtonColors
import de.stustapay.libssp.util.formatCurrencyValue
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter
import java.util.TimeZone

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
    val cancelStatus by viewModel.cancelStatus.collectAsStateWithLifecycle()

    BackHandler {
        leaveView()
    }

    LaunchedEffect(null) {
        viewModel.fetchHistory()
    }

    NavScaffold(
        title = { Text(stringResource(R.string.history_title)) },
        navigateBack = leaveView
    ) {
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
                                sale.bookedAt.toZonedDateTime()
                                    .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                                    .format(DateTimeFormatter.ofPattern("E HH:mm:ss")),
                                fontSize = 24.sp
                            )
                            Text(formatCurrencyValue(sale.totalPrice), fontSize = 24.sp)
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
                            sale.bookedAt.toZonedDateTime()
                                .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), fontSize = 24.sp
                        )

                        Text(
                            sale.bookedAt.toZonedDateTime()
                                .withZoneSameInstant(TimeZone.getDefault().toZoneId())
                                .format(DateTimeFormatter.ofPattern("HH:mm:ss")), fontSize = 24.sp
                        )
                    }

                    Divider()

                    for (item in sale.lineItems) {
                        ProductConfirmItem(
                            name = item.product.name,
                            price = item.productPrice,
                            quantity = item.quantity.intValue()
                        )
                    }

                    Divider()

                    ProductConfirmItem(
                        name = stringResource(R.string.history_sum),
                        price = sale.totalPrice,
                    )

                    Divider()

                    if (sale.id == sales.first().id && sale.orderType == OrderType.sale) {
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

    when (val castedStatus = cancelStatus) {
        is SaleHistoryStatus.Done -> {
            AlertDialog(
                title = { Text("Successfully canceled order") },
                onDismissRequest = { scope.launch { viewModel.idleCancelStatus() } },
                confirmButton = {
                    Button(onClick = { scope.launch { viewModel.idleCancelStatus() } }) {
                        Text("OK")
                    }
                }
            )
        }
        is SaleHistoryStatus.Failed -> {
            AlertDialog(
                title = { Text("Could not cancel order") },
                text = { Text(castedStatus.msg)},
                onDismissRequest = { scope.launch { viewModel.idleCancelStatus() } },
                confirmButton = {
                    Button(onClick = { scope.launch { viewModel.idleCancelStatus() } }) {
                        Text("OK")
                    }
                }
            )
        }
        else -> {
            // no dialog
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
                    Text(
                        stringResource(R.string.history_confirm),
                        textAlign = TextAlign.Center,
                        fontSize = 48.sp
                    )

                    Button(modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                        colors = errorButtonColors(),
                        onClick = {
                            scope.launch {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                viewModel.cancelSale(sale.id.intValue())
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