package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorActionButton
import de.stustapay.stustapay.ui.common.operator.OperatorAdaptivePaymentLayout
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorStatePanel

@Composable
fun SaleError(
    onDismiss: () -> Unit,
    viewModel: SaleViewModel,
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val config = saleConfig

    OperatorScaffold(
        title = if (config is SaleConfig.Ready) config.tillName else "No Till",
        subtitle = "Sale validation or booking failed.",
        icon = Icons.Filled.ErrorOutline,
        terminalLabel = "Error",
        footerHint = status,
        footerSection = "Sale",
        footerStatus = "Failed",
        onBack = onDismiss,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = {
                OperatorStatePanel(
                    title = stringResource(R.string.sale_check_error),
                    message = status,
                    success = false,
                )
            },
            railContent = {
                OperatorPanel {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OperatorActionButton(
                            text = "Back to basket",
                            onClick = onDismiss,
                            destructive = true,
                        )
                    }
                }
            },
        )
    }
}
