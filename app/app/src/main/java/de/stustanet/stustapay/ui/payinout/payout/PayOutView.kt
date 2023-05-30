package de.stustanet.stustapay.ui.payinout.payout

import android.util.Log
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.common.StatusText
import de.stustanet.stustapay.ui.common.amountselect.AmountConfig
import de.stustanet.stustapay.ui.common.rememberDialogDisplayState
import kotlinx.coroutines.launch


@Composable
fun PayOutView(
    viewModel: PayOutViewModel = hiltViewModel(),
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val payOutState by viewModel.payOutState.collectAsStateWithLifecycle()
    val showPayOutConfirm by viewModel.showPayOutConfirm.collectAsStateWithLifecycle()
    val completedPayOut by viewModel.completedPayOut.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()

    val confirmState = rememberDialogDisplayState()
    LaunchedEffect(showPayOutConfirm) {
        if (showPayOutConfirm) {
            confirmState.open()
        } else {
            confirmState.close()
        }
    }

    PayOutConfirmDialog(
        state = confirmState,
        onConfirm = { scope.launch { viewModel.confirmPayOut() } },
        onAbort = { viewModel.dismissPayOutConfirm() },
        getAmount = { payOutState.getAmount() },
        status = { StatusText(status) }
    )

    val completedPayOutV = completedPayOut
    if (completedPayOutV != null) {
        PayOutSuccessDialog(
            onDismiss = {
                viewModel.dismissPayOutSuccess()
            },
            completedPayOut = completedPayOutV
        )
    }

    val checkedPayOut = payOutState.getCheckedPayout()
    if (checkedPayOut == null) {
        PayOutScan(
            onScan = { tag ->
                scope.launch {
                    viewModel.tagScanned(tag)
                }
            },
            status = status,
        )
    } else {
        PayOutSelection(
            status = status,
            payout = checkedPayOut,
            amount = payOutState.getAmount(),
            onAmountUpdate = { viewModel.setAmount(it) },
            onAmountClear = { viewModel.clearAmount() },
            onClear = { viewModel.clearDraft() },
            amountConfig = AmountConfig.Money(
                limit = payOutState.getMaxAmount(),
            ),
            ready = config.hasConfig(),
            onPayout = { scope.launch { viewModel.requestPayOut() } },
        )
    }
}
