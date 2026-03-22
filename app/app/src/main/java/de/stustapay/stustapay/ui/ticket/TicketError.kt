package de.stustapay.stustapay.ui.ticket

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun TicketError(
    onDismiss: () -> Unit,
    viewModel: TicketViewModel,
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()

    OperatorTicketError(
        terminalTitle = config.title().title,
        footerHint = status,
        onDismiss = onDismiss,
    )
}
