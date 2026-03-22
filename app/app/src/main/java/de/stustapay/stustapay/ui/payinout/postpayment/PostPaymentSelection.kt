package de.stustapay.stustapay.ui.payinout.postpayment

import androidx.activity.compose.BackHandler
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.ErrorDialog
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.payinout.payout.CheckedPayOut
import de.stustapay.stustapay.ui.payinout.payout.PayOutConfirmDialog
import de.stustapay.stustapay.ui.payinout.payout.PayOutSelection
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import kotlinx.coroutines.launch

@Composable
fun PostPaymentSelection(
    leaveView: () -> Unit = {},
    viewModel: PostPaymentViewModel,
    payout: CheckedPayOut,
    onClear: () -> Unit,
) {
    val loginState by viewModel.terminalLoginState.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val payOutState by viewModel.payOutState.collectAsStateWithLifecycle()
    val requestActive by viewModel.requestActive.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    BackHandler {
        leaveView()
    }

    if (errorMessage != null) {
        ErrorDialog(
            onDismiss = {
                scope.launch {
                    viewModel.dismissError()
                }
            }
        ) {
            Text(errorMessage.orEmpty(), style = MaterialTheme.typography.h4)
        }
    }

    val showPayOutConfirm by viewModel.showPayOutConfirm.collectAsStateWithLifecycle()
    val confirmState = rememberDialogDisplayState()
    LaunchedEffect(showPayOutConfirm) {
        if (showPayOutConfirm) {
            confirmState.open()
        } else {
            confirmState.close()
        }
    }

    if (showPayOutConfirm) {
        PayOutConfirmDialog(
            state = confirmState,
            onConfirm = { scope.launch { viewModel.confirmPayOut() } },
            onAbort = { viewModel.dismissPayOutConfirm() },
            getAmount = { payOutState.getAmount() },
            status = { StatusText(status) }
        )
    }

    if (payout.maxAmount < 0.0) {
        OperatorPostPaymentSelection(
            leaveView = leaveView,
            viewModel = viewModel,
            payout = payout,
            requestActive = requestActive,
            status = status,
            onClear = onClear,
        )
        return
    }

    PayOutSelection(
        status = status,
        payout = payout,
        amount = payOutState.getAmount(),
        onAmountUpdate = { viewModel.setAmount(it.toDouble() * 100) },
        onAmountClear = { viewModel.clearAmount() },
        onClear = { viewModel.clearDraft() },
        amountConfig = AmountConfig.Money(
            limit = payOutState.getMaxAmount(),
        ),
        ready = loginState.hasConfig(),
        onPayout = { scope.launch { viewModel.requestPayOut() } },
    )
}
