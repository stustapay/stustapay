package de.stustapay.stustapay.ui.ticket

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R

@Composable
fun TicketSuccess(
    onConfirm: () -> Unit,
    viewModel: TicketViewModel,
) {
    val saleCompleted by viewModel.saleCompleted.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()

    BackHandler {
        onConfirm()
    }

    val completedSale = saleCompleted ?: return

    OperatorTicketSuccess(
        terminalTitle = config.title().title,
        footerHint = status,
        completedSale = completedSale,
        onConfirm = onConfirm,
    )
}
