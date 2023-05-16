package de.stustanet.stustapay.ui.ticket

import android.app.Activity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.PaymentMethod
import de.stustanet.stustapay.ui.common.pay.CashECCallback
import de.stustanet.stustapay.ui.common.pay.CashECPay
import de.stustanet.stustapay.ui.common.pay.ProductConfirmItem
import de.stustanet.stustapay.ui.common.pay.ProductConfirmLineItem
import de.stustanet.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch

@Composable
fun TicketConfirm(
    goBack: () -> Unit,
    viewModel: TicketViewModel
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val ticketConfig by viewModel.ticketConfig.collectAsStateWithLifecycle()
    val ticketDraft by viewModel.ticketDraft.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()
    val context = LocalContext.current as Activity

    val checkedSale = ticketDraft.checkedSale
    if (checkedSale == null) {
        Column {
            Text(status)
            Text("no sale check present!")
        }
        return
    }

    NavScaffold(
        title = { Text(ticketConfig.tillName) },
        navigateBack = goBack
    ) { pv ->
        CashECPay(
            modifier = Modifier.padding(pv),
            status = { Text(status, fontSize = 32.sp) },
            onPaymentRequested = CashECCallback.NoTag(
                onEC = {
                    scope.launch {
                        viewModel.processSale(
                            context = context,
                            paymentMethod = PaymentMethod.SumUp
                        )
                    }
                },
                onCash = {
                    scope.launch {
                        viewModel.processSale(
                            context = context,
                            paymentMethod = PaymentMethod.Cash
                        )
                    }
                },
            ),
            ready = ticketConfig.ready,
            getAmount = { viewModel.getPrice() },
        ) { paddingValues ->
            // TODO: pending ticket sale display

            LazyColumn(
                modifier = Modifier
                    .padding(bottom = paddingValues.calculateBottomPadding())
                    .padding(horizontal = 10.dp)
                    .fillMaxSize()
            ) {

                item {
                    ProductConfirmItem(
                        name = "Preis",
                        price = checkedSale.total_price,
                        fontSize = 35.sp,
                    )
                    Divider(thickness = 2.dp)
                }

                for (lineItem in checkedSale.line_items) {
                    item {
                        ProductConfirmLineItem(lineItem = lineItem)
                    }
                }
            }
        }
    }
}