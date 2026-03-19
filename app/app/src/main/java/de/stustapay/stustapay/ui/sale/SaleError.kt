package de.stustapay.stustapay.ui.sale

import androidx.compose.foundation.layout.*
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.FailureIcon
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold

@Composable
fun SaleError(
    onDismiss: () -> Unit,
    viewModel: SaleViewModel,
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val haptic = LocalHapticFeedback.current
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
        Column(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    FailureIcon(modifier = Modifier.size(60.dp))

                    Text(text = stringResource(R.string.sale_check_error), fontSize = 30.sp)

                    Text(status, fontSize = 24.sp)
                }
            }

            OperatorPrimaryButton(
                text = "Back",
                icon = Icons.Filled.ErrorOutline,
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onDismiss()
                },
            )
        }
    }
}
