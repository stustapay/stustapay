package de.stustapay.stustapay.ui.reward

import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.Access
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.FailureIcon
import de.stustapay.stustapay.ui.common.StatusText
import de.stustapay.stustapay.ui.common.SuccessIcon
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelectionDialog
import de.stustapay.stustapay.ui.common.pay.ProductSelectionItem
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch


@Composable
fun RewardView(
    viewModel: RewardViewModel = hiltViewModel(),
    leaveView: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val scanState = rememberNfcScanDialogState()

    val vouchers by viewModel.vouchers.collectAsStateWithLifecycle()
    val newTicket by viewModel.newTicket.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val config by viewModel.terminalLoginState.collectAsStateWithLifecycle()

    val vibrator = LocalContext.current.getSystemService(Vibrator::class.java)

    NfcScanDialog(state = scanState, onScan = { tag ->
        scope.launch {
            viewModel.tagScanned(tag)
        }
    })

    NavScaffold(
        title = { Text(config.title().title) },
        navigateBack = leaveView,
    ) { _ ->
        Scaffold(
            content = { paddingValues ->
                Box(modifier = Modifier.padding(paddingValues)) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(10.dp)
                    ) {

                        val selectVoucherAmount = rememberDialogDisplayState()
                        AmountSelectionDialog(
                            state = selectVoucherAmount,
                            config = AmountConfig.Number(limit = 100u),
                            initialAmount = { viewModel.getVoucherAmount() },
                            onEnter = { viewModel.vouchersChanged(it) },
                            onClear = { viewModel.vouchersCleared() }
                        ) {
                            Text(stringResource(R.string.common_voucher_amount), fontSize = 30.sp)
                        }

                        if (config.checkAccess { u, _ -> Access.canGiveVouchers(u) }) {
                            ProductSelectionItem(
                                itemPrice = vouchers.toString(),
                                leftButtonText = stringResource(R.string.common_vouchers),
                                leftButtonPress = { selectVoucherAmount.open() },
                                rightButtonPress = { viewModel.vouchersCleared() },
                            )
                        }

                        if (config.checkAccess { u, _ -> Access.canGiveFreeTickets(u) }) {
                            ProductSelectionItem(
                                itemPrice = if (newTicket) {
                                    "✅"
                                } else {
                                    ""
                                },
                                leftButtonText = stringResource(R.string.common_wristband),
                                leftButtonPress = { viewModel.selectNewTicket() },
                                rightButtonPress = { viewModel.clearNewTicket() },
                            )
                        }
                    }
                }
            },
            bottomBar = {
                Column(modifier = Modifier.padding(horizontal = 10.dp)) {
                    Divider()
                    when (val statusV = status) {
                        is RewardStatus.Idle -> {}
                        is RewardStatus.Error -> {

                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                FailureIcon(
                                    modifier = Modifier
                                        .size(60.dp)
                                )
                                StatusText(statusV.msg)
                            }
                        }

                        is RewardStatus.Success -> {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                LaunchedEffect(Unit) {
                                    vibrator.vibrate(VibrationEffect.createOneShot(600, 200))
                                }
                                SuccessIcon(
                                    modifier = Modifier
                                        .size(60.dp)
                                        .padding(bottom = 5.dp)
                                )
                                Text(statusV.msg, style = MaterialTheme.typography.h5)
                            }
                        }
                    }
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        onClick = {
                            scanState.open()
                        },
                        enabled = (vouchers > 0u || newTicket)
                    ) {

                        Text(
                            if (newTicket) {
                                stringResource(R.string.reward_grant_wristband)
                            } else {
                                stringResource(R.string.reward_grant)
                            }, fontSize = 24.sp
                        )
                    }
                }
            }
        )
    }
}
