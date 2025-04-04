package de.stustapay.stustapay.ui.payinout.topup

import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.ui.common.ErrorDialog
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelection
import de.stustapay.stustapay.ui.common.pay.CashECCallback
import de.stustapay.stustapay.ui.common.pay.CashECPay
import de.stustapay.stustapay.ui.common.pay.NoCashRegisterWarning
import kotlinx.coroutines.launch


@Composable
fun TopUpSelection(
    viewModel: TopUpViewModel,
) {

    val status by viewModel.status.collectAsStateWithLifecycle()
    val topUpState by viewModel.topUpState.collectAsStateWithLifecycle()
    val topUpConfig by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val requestActive by viewModel.requestActive.collectAsStateWithLifecycle()
    val errorMessage_ by viewModel.errorMessage.collectAsStateWithLifecycle()
    val errorMessage = errorMessage_
    val scope = rememberCoroutineScope()
    val context = LocalActivity.current!!

    if (errorMessage != null) {
        ErrorDialog(onDismiss = { scope.launch { viewModel.dismissError() } }) {
            Text(errorMessage, style = MaterialTheme.typography.h4)
        }
    }

    CashECPay(
        modifier = Modifier.fillMaxSize(),
        checkAmount = {
            viewModel.checkAmountLocal(topUpState.currentAmount.toDouble() / 100.0)
        },
        status = { StatusText(status) },
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
        ready = topUpConfig.hasConfig() && !requestActive,
        getAmount = { topUpState.currentAmount },
    ) { paddingValues ->
        val scrollState = rememberScrollState()
        Column(modifier = Modifier.verticalScroll(scrollState, reverseScrolling = true)) {
            if (!topUpConfig.canHandleCash()) {
                NoCashRegisterWarning(modifier = Modifier.padding(4.dp))
            }
            AmountSelection(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 10.dp)
                    .padding(bottom = paddingValues.calculateBottomPadding()),
                initialAmount = { topUpState.currentAmount },
                onAmountUpdate = { viewModel.setAmount(it) },
                onClear = { viewModel.clearDraft() },
                config = AmountConfig.Money(
                    limit = 150u,
                    cents = false,
                )
            )
        }
    }
}