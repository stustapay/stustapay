package de.stustapay.stustapay.ui.sale

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorAdaptivePaymentLayout
import de.stustapay.stustapay.ui.common.operator.OperatorPanel
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold

@Composable
fun SaleError(
    onDismiss: () -> Unit,
    viewModel: SaleViewModel,
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val saleConfig by viewModel.saleConfig.collectAsStateWithLifecycle()
    val config = saleConfig

    OperatorScaffold(
        title = if (config is SaleConfig.Ready) config.tillName else stringResource(R.string.sale_no_till),
        subtitle = stringResource(R.string.sale_error_subtitle),
        icon = Icons.Filled.ErrorOutline,
        terminalLabel = stringResource(R.string.sale_terminal_error),
        footerHint = status,
        footerSection = stringResource(R.string.sale_compact_title),
        footerStatus = stringResource(R.string.sale_footer_failed),
        showFooter = false,
        onBack = onDismiss,
        headerFlowTitle = stringResource(R.string.sale_compact_title),
        headerTillLabel = if (config is SaleConfig.Ready) config.tillName else null,
    ) {
        OperatorAdaptivePaymentLayout(
            mainContent = {
                SaleErrorMessagePanel(status = status)
            },
            railContent = {
                OperatorPanel {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Button(
                            onClick = onDismiss,
                            modifier = Modifier
                                .widthIn(max = 220.dp)
                                .fillMaxWidth()
                                .height(44.dp),
                            colors = ButtonDefaults.buttonColors(
                                backgroundColor = OperatorPalette.danger,
                                contentColor = OperatorPalette.title,
                            ),
                        ) {
                            Text(
                                text = stringResource(R.string.sale_back_to_basket),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            },
        )
    }
}

@Composable
private fun SaleErrorMessagePanel(
    status: String,
) {
    OperatorPanel(
        backgroundColor = OperatorPalette.dangerPanel,
        borderColor = OperatorPalette.danger,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = status,
                color = OperatorPalette.title,
                fontSize = 28.sp,
                lineHeight = 34.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
