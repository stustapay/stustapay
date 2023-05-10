package de.stustanet.stustapay.ui.topup

import android.app.Activity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.common.pay.CashECCallback
import de.stustanet.stustapay.ui.common.pay.CashECPay
import de.stustanet.stustapay.ui.priceselect.PriceSelection
import de.stustanet.stustapay.ui.priceselect.rememberPriceSelectionState
import kotlinx.coroutines.launch

@Composable
fun TopUpSelection(
    viewModel: DepositViewModel,
    leaveView: () -> Unit = {},
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val topUpState by viewModel.topUpState.collectAsStateWithLifecycle()
    val topUpConfig by viewModel.topUpConfig.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()
    val priceState = rememberPriceSelectionState()

    val context = LocalContext.current as Activity

    CashECPay(
        checkAmount = {
            viewModel.checkAmountLocal(topUpState.currentAmount.toDouble() / 100)
        },
        status = status,
        goBack = leaveView,
        title = topUpConfig.tillName,
        onPay = CashECCallback.Tag(
            onEC = {
                scope.launch {
                    viewModel.topUpWithCard(context, it)
                }
            },
            onCash = {
                scope.launch {
                    viewModel.topUpWithCash(it)
                }
            },
        ),
        ready = topUpConfig.ready,
        getAmount = { topUpState.currentAmount.toDouble() / 100 },
    ) { paddingValues ->
        PriceSelection(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 10.dp)
                .padding(bottom = paddingValues.calculateBottomPadding()),
            state = priceState,
            onEnter = { viewModel.setAmount(it) },
            onClear = { viewModel.clearDraft() },
            allowCents = false,
        )
    }
}
