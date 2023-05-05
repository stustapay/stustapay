package de.stustanet.stustapay.ui.ticket

import android.app.Activity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.common.pay.CashECPay
import kotlinx.coroutines.launch

@Composable
fun TicketSelection(
    leaveView: () -> Unit,
    viewModel: TicketViewModel
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val ticketState by viewModel.ticketState.collectAsStateWithLifecycle()
    val ticketConfig by viewModel.ticketConfig.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()

    val context = LocalContext.current as Activity

    CashECPay(
        status = status,
        leaveView = leaveView,
        title = ticketConfig.tillName,
        onEC = {
            scope.launch {
                viewModel.buyTicketWithCard(context, it)
            }
        },
        ready = ticketConfig.ready,
        getAmount = { ticketState.payAmount.toDouble() / 100 },
        onCash = { scope.launch { viewModel.buyTicketWithCash(it) } },
    ) { paddingValues ->
        TicketVariant(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 10.dp)
                .padding(bottom = paddingValues.calculateBottomPadding()),
            viewModel = viewModel,
        )
    }
}