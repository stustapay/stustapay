package de.stustapay.stustapay.ui.ticket

import androidx.compose.runtime.Composable

@Composable
fun TicketScan(
    leaveView: () -> Unit,
    viewModel: TicketViewModel,
) {
    OperatorTicketScan(
        leaveView = leaveView,
        viewModel = viewModel,
    )
}
