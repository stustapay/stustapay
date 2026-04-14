package de.stustapay.stustapay.ui.history

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.Order
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.PencilOperatorScanContent
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorStatePanel
import de.stustapay.libssp.util.formatCurrencyValue
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter
import java.util.TimeZone

private data class SaleHistoryListEntry(
    val order: Order,
    val bookedAtLabel: String,
    val totalPriceLabel: String,
)

@Composable
fun SaleHistoryView(
    viewModel: SaleHistoryViewModel = hiltViewModel(),
    leaveView: () -> Unit
) {
    val sales by viewModel.sales.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var detailOrder by remember { mutableStateOf<Order?>(null) }
    var cancelOrder by remember { mutableStateOf(false) }
    val haptic = LocalHapticFeedback.current
    val status by viewModel.status.collectAsStateWithLifecycle()
    val cancelStatus by viewModel.cancelStatus.collectAsStateWithLifecycle()
    val canScanCustomerHistory by viewModel.canScanCustomerHistory.collectAsStateWithLifecycle()
    val historyFilter by viewModel.historyFilter.collectAsStateWithLifecycle()
    val terminalLoginState by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val scanState = rememberNfcScanDialogState()
    val timeZone = remember { TimeZone.getDefault().toZoneId() }
    val listTimeFormatter = remember { DateTimeFormatter.ofPattern("E HH:mm:ss") }
    val detailDateFormatter = remember { DateTimeFormatter.ofPattern("yyyy-MM-dd") }
    val detailTimeFormatter = remember { DateTimeFormatter.ofPattern("HH:mm:ss") }
    val historyEntries = remember(sales, timeZone, listTimeFormatter) {
        sales.map { sale ->
            SaleHistoryListEntry(
                order = sale,
                bookedAtLabel = sale.bookedAt.toZonedDateTime()
                    .withZoneSameInstant(timeZone)
                    .format(listTimeFormatter),
                totalPriceLabel = formatCurrencyValue(sale.totalPrice),
            )
        }
    }

    BackHandler {
        leaveView()
    }

    LaunchedEffect(Unit) {
        viewModel.fetchHistory()
    }

    NfcScanDialog(
        state = scanState,
        onScan = { tag ->
            scope.launch {
                detailOrder = null
                cancelOrder = false
                viewModel.fetchHistoryForCustomer(tag.uid)
            }
        }
    ) { scanStatus, compactLayout ->
        PencilOperatorScanContent(
            title = stringResource(R.string.history_scan_customer),
            subtitle = stringResource(R.string.history_scan_prompt),
            scanStatus = scanStatus,
            isSmallScreen = compactLayout,
        )
    }

    val loading = status is SaleHistoryStatus.Fetching

    OperatorScaffold(
        title = terminalLoginState.title().title,
        subtitle = when (historyFilter) {
            SaleHistoryFilter.RecentOrders -> stringResource(R.string.history_showing_recent)
            is SaleHistoryFilter.CustomerOrders -> stringResource(R.string.history_showing_customer)
        },
        icon = Icons.AutoMirrored.Filled.List,
        terminalLabel = stringResource(R.string.history_title),
        footerHint = saleHistoryFooterHint(status),
        footerSection = stringResource(R.string.history_title),
        footerStatus = saleHistoryFooterBadge(status),
        onBack = leaveView,
        headerFlowTitle = stringResource(R.string.history_title),
        headerTillLabel = terminalLoginState.title().title,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (canScanCustomerHistory) {
                OperatorActionButton(
                    text = stringResource(R.string.history_scan_customer),
                    enabled = !loading,
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        scanState.open()
                    },
                )

                if (historyFilter is SaleHistoryFilter.CustomerOrders) {
                    OperatorActionButton(
                        text = stringResource(R.string.history_show_recent),
                        enabled = !loading,
                        onClick = {
                            scope.launch {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                detailOrder = null
                                cancelOrder = false
                                viewModel.fetchHistory()
                            }
                        },
                        primary = false,
                    )
                }
            }

            OperatorPanel(backgroundColor = OperatorPalette.panelMuted) {
                if (sales.isEmpty() && status is SaleHistoryStatus.Done) {
                    Text(
                        text = stringResource(R.string.history_empty),
                        color = OperatorPalette.subtitle,
                        fontSize = 16.sp,
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(historyEntries, key = { it.order.uuid }) { entry ->
                            OperatorPanel(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        viewModel.idleStatus()
                                        detailOrder = entry.order
                                    },
                                backgroundColor = OperatorPalette.panel,
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = entry.bookedAtLabel,
                                        color = OperatorPalette.title,
                                        fontSize = 18.sp,
                                    )
                                    Text(
                                        text = entry.totalPriceLabel,
                                        color = OperatorPalette.title,
                                        fontSize = 18.sp,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (detailOrder != null) {
        val sale = detailOrder!!
        Dialog(
            onDismissRequest = { detailOrder = null },
            properties = DialogProperties(
                dismissOnBackPress = true,
                dismissOnClickOutside = true,
                usePlatformDefaultWidth = false,
            ),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentAlignment = Alignment.Center,
            ) {
                OperatorPanel(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                text = sale.bookedAt.toZonedDateTime()
                                    .withZoneSameInstant(timeZone)
                                    .format(detailDateFormatter),
                                fontSize = 20.sp,
                                color = OperatorPalette.title,
                            )
                            Text(
                                text = sale.bookedAt.toZonedDateTime()
                                    .withZoneSameInstant(timeZone)
                                    .format(detailTimeFormatter),
                                fontSize = 20.sp,
                                color = OperatorPalette.subtitle,
                            )
                        }

                        Divider()

                        for (item in sale.lineItems) {
                            OperatorOrderLineItemRow(
                                name = item.product.name,
                                quantity = item.quantity.intValue(),
                                unitPrice = item.productPrice,
                                totalPrice = item.totalPrice,
                            )
                        }

                        Divider()

                        OperatorOrderTotalRow(
                            label = stringResource(R.string.history_sum),
                            totalPrice = sale.totalPrice,
                        )

                        if (viewModel.canCancelOrder(sale)) {
                            OperatorActionButton(
                                text = stringResource(R.string.history_cancel),
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    cancelOrder = true
                                },
                                destructive = true,
                            )
                        }

                        OperatorActionButton(
                            text = stringResource(R.string.arrow_back),
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                detailOrder = null
                            },
                            primary = false,
                        )
                    }
                }
            }
        }
    }

    when (val castedStatus = cancelStatus) {
        is SaleHistoryStatus.Done -> {
            Dialog(
                onDismissRequest = { viewModel.idleCancelStatus() },
                properties = DialogProperties(
                    dismissOnBackPress = true,
                    dismissOnClickOutside = true,
                    usePlatformDefaultWidth = false,
                ),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    OperatorPanel(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            OperatorStatePanel(
                                title = stringResource(R.string.history_cancel_success),
                                message = "",
                                success = true,
                            )
                            OperatorActionButton(
                                text = stringResource(android.R.string.ok),
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    viewModel.idleCancelStatus()
                                },
                            )
                        }
                    }
                }
            }
        }
        is SaleHistoryStatus.Failed -> {
            Dialog(
                onDismissRequest = { viewModel.idleCancelStatus() },
                properties = DialogProperties(
                    dismissOnBackPress = true,
                    dismissOnClickOutside = true,
                    usePlatformDefaultWidth = false,
                ),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    OperatorPanel(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            OperatorStatePanel(
                                title = stringResource(R.string.history_cancel_error),
                                message = castedStatus.msg,
                                success = false,
                            )
                            OperatorActionButton(
                                text = stringResource(android.R.string.ok),
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    viewModel.idleCancelStatus()
                                },
                            )
                        }
                    }
                }
            }
        }
        else -> {
            // no dialog
        }
    }

    if (cancelOrder && detailOrder != null) {
        val sale = detailOrder!!
        Dialog(
            onDismissRequest = {
                detailOrder = null
                cancelOrder = false
            },
            properties = DialogProperties(
                dismissOnBackPress = true,
                dismissOnClickOutside = true,
                usePlatformDefaultWidth = false,
            ),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentAlignment = Alignment.Center,
            ) {
                OperatorPanel(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.history_confirm),
                            textAlign = TextAlign.Center,
                            fontSize = 28.sp,
                            color = OperatorPalette.title,
                        )

                        OperatorActionButton(
                            text = stringResource(R.string.history_cancel),
                            onClick = {
                                scope.launch {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    viewModel.cancelSale(sale.id.intValue())
                                    detailOrder = null
                                    cancelOrder = false
                                }
                            },
                            destructive = true,
                        )

                        OperatorActionButton(
                            text = stringResource(R.string.arrow_back),
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                cancelOrder = false
                            },
                            primary = false,
                        )
                    }
                }
            }
        }

    }
}

@Composable
private fun saleHistoryFooterHint(status: SaleHistoryStatus): String {
    return when (status) {
        is SaleHistoryStatus.Idle -> stringResource(R.string.common_status_idle)
        is SaleHistoryStatus.Fetching -> stringResource(R.string.common_status_fetching)
        is SaleHistoryStatus.Done -> stringResource(R.string.common_status_done)
        is SaleHistoryStatus.Failed -> status.msg
    }
}

@Composable
private fun saleHistoryFooterBadge(status: SaleHistoryStatus): String {
    return when (status) {
        is SaleHistoryStatus.Fetching -> stringResource(R.string.common_status_fetching)
        is SaleHistoryStatus.Failed -> stringResource(R.string.failed_fetching)
        else -> stringResource(R.string.common_status_done)
    }
}

@Composable
private fun OperatorOrderLineItemRow(
    name: String,
    quantity: Int,
    unitPrice: Double,
    totalPrice: Double,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = name,
            color = OperatorPalette.title,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.weight(1f),
        )
        Spacer(modifier = Modifier.padding(horizontal = 6.dp))
        Text(
            text = "×%d".format(quantity),
            color = OperatorPalette.subtitle,
            fontSize = 14.sp,
        )
        Spacer(modifier = Modifier.padding(horizontal = 6.dp))
        Text(
            text = formatCurrencyValue(unitPrice),
            color = OperatorPalette.subtitle,
            fontSize = 14.sp,
        )
        Spacer(modifier = Modifier.padding(horizontal = 6.dp))
        Text(
            text = formatCurrencyValue(totalPrice),
            color = OperatorPalette.title,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun OperatorOrderTotalRow(
    label: String,
    totalPrice: Double,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            color = OperatorPalette.subtitle,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = formatCurrencyValue(totalPrice),
            color = OperatorPalette.success,
            fontSize = 18.sp,
            fontWeight = FontWeight.ExtraBold,
        )
    }
}
