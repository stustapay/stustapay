package de.stustapay.stustapay.ui.ticket

import androidx.compose.runtime.Composable

@Composable
fun TicketConfirm(
    goBack: () -> Unit,
    viewModel: TicketViewModel,
) {
    OperatorTicketConfirm(
        goBack = goBack,
        viewModel = viewModel,
    )
}
