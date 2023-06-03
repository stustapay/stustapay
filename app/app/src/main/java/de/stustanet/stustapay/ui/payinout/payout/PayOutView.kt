package de.stustanet.stustapay.ui.payinout.payout

import android.util.Log
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.common.StatusText
import de.stustanet.stustapay.ui.common.amountselect.AmountConfig
import de.stustanet.stustapay.ui.common.pay.ProductConfirmItem
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

    if (!config.canHandleCash()) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Card(
                shape = RoundedCornerShape(10.dp),
                backgroundColor = MaterialTheme.colors.error,
                elevation = 8.dp,
            ) {
                Box(
                    modifier = Modifier
                        .padding(10.dp)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            "No cash register",
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colors.onError,
                            style = MaterialTheme.typography.h3
                        )
                    }
                }
            }
        }
        return
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
