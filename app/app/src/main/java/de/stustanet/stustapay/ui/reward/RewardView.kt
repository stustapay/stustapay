package de.stustanet.stustapay.ui.reward

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.Access
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.amountselect.AmountConfig
import de.stustanet.stustapay.ui.common.amountselect.AmountSelectionDialog
import de.stustanet.stustapay.ui.common.pay.ProductSelectionItem
import de.stustanet.stustapay.ui.common.rememberDialogDisplayState
import de.stustanet.stustapay.ui.nav.NavScaffold
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

    // fetch the terminal configuration
    LaunchedEffect(Unit) {
        viewModel.fetchConfig()
    }

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
                            Text("Gutscheinanzahl", fontSize = 30.sp)
                        }

                        if (config.checkAccess { u, _ -> Access.canGiveVouchers(u) }) {
                            ProductSelectionItem(
                                itemPrice = vouchers.toString(),
                                leftButtonText = "Gutscheine",
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
                                leftButtonText = "Bändchen",
                                leftButtonPress = { viewModel.selectNewTicket() },
                                rightButtonPress = { viewModel.clearNewTicket() },
                            )
                        }
                    }
                }
            },
            bottomBar = {
                Column {
                    Divider(modifier = Modifier.padding(vertical = 10.dp))
                    Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                        Text(status, fontSize = 24.sp)
                    }
                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        onClick = {
                            scanState.open()
                        }
                    ) {

                        Text(
                            if (newTicket) {
                                "Neues Band ausgeben"
                            } else {
                                "Verteilen"
                            }, fontSize = 24.sp
                        )
                    }
                }
            }
        )
    }
}