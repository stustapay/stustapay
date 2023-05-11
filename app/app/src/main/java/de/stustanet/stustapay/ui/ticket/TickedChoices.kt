package de.stustanet.stustapay.ui.ticket

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.common.pay.ProductSelectionItem

/** selection which ticket to take */
@Composable
fun TicketChoices(
    modifier: Modifier = Modifier,
    viewModel: TicketViewModel
) {
    val ticketConfig by viewModel.ticketConfig.collectAsStateWithLifecycle()
    val ticketState by viewModel.ticketDraft.collectAsStateWithLifecycle()

    Column(modifier = modifier.fillMaxSize()) {
        for (ticket in ticketConfig.tickets) {
            val amount = ticketState.buttonSelection[ticket.value.id] ?: 0
            ProductSelectionItem(
                itemPrice = "%.02f".format(ticket.value.price),
                itemAmount = "%2d".format(amount),
                leftButtonText = ticket.value.caption,
                leftButtonPress = { viewModel.incrementButton(ticket.value.id) },
                rightButtonPress = { viewModel.decrementButton(ticket.value.id) },
            )
        }
    }
}