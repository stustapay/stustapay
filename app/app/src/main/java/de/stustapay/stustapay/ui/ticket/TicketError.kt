package de.stustapay.stustapay.ui.ticket

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.FailureIcon
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold

@Composable
fun TicketError(
    onDismiss: () -> Unit,
    viewModel: TicketViewModel
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()

    OperatorScaffold(
        title = config.title().title,
        subtitle = "Ticket flow failed before completion.",
        icon = Icons.Filled.ErrorOutline,
        terminalLabel = "Error",
        footerHint = status,
        footerSection = "Tickets",
        footerStatus = "Failed",
        onBack = onDismiss,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp, androidx.compose.ui.Alignment.CenterVertically),
        ) {
            FailureIcon(modifier = Modifier.size(64.dp))
            Text(text = stringResource(R.string.ticket_error_preambel), fontSize = 30.sp)
            Text(text = status, fontSize = 24.sp)
            OperatorPrimaryButton(
                text = stringResource(R.string.done),
                icon = Icons.Filled.ErrorOutline,
                onClick = onDismiss,
            )
        }
    }
}
