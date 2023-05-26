package de.stustanet.stustapay.ui.payinout.topup

import android.app.Activity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.common.amountselect.AmountConfig
import de.stustanet.stustapay.ui.common.amountselect.AmountSelection
import de.stustanet.stustapay.ui.common.pay.CashECCallback
import de.stustanet.stustapay.ui.common.pay.CashECPay
import kotlinx.coroutines.launch


@Composable
fun TopUpSelection(
    viewModel: TopUpViewModel,
) {

    val status by viewModel.status.collectAsStateWithLifecycle()
    val topUpState by viewModel.topUpState.collectAsStateWithLifecycle()
    val topUpConfig by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current as Activity

    CashECPay(
        modifier = Modifier.fillMaxSize(),
        checkAmount = {
            viewModel.checkAmountLocal(topUpState.currentAmount.toDouble() / 100.0)
        },
        status = { Text(status, fontSize = 32.sp) },
        onPaymentRequested = CashECCallback.Tag(
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
        ready = topUpConfig.hasConfig(),
        getAmount = { topUpState.currentAmount },
    ) { paddingValues ->
        AmountSelection(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 10.dp)
                .padding(bottom = paddingValues.calculateBottomPadding()),
            onAmountUpdate = { viewModel.setAmount(it) },
            onClear = { viewModel.clearDraft() },
            config = AmountConfig.Money(
                limit = 30000u,
                cents = false,
            )
        )
    }
}