package de.stustanet.stustapay.ui.ticket

import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.common.pay.ErrorScreen

@Composable
fun TicketError(
    onDismiss: () -> Unit,
    viewModel: TicketViewModel
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()

    ErrorScreen(
        onDismiss = onDismiss,
        topBarTitle = config.title().title,
    ) {
        Text(text = stringResource(R.string.ticket_error_preambel), fontSize = 30.sp)
        Text(status, fontSize = 24.sp)
    }
}