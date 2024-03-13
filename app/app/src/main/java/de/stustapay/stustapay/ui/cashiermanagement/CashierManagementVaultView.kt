package de.stustapay.stustapay.ui.cashiermanagement

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelection
import kotlinx.coroutines.launch

enum class VaultBookingType {
    Take,
    Return
}

@Composable
fun CashierManagementVaultView(viewModel: CashierManagementViewModel) {
    val scope = rememberCoroutineScope()
    var amount by remember { mutableStateOf(0u) }
    val scanState = rememberNfcScanDialogState()
    var bookingType by remember { mutableStateOf(VaultBookingType.Take) }
    val status by viewModel.status.collectAsStateWithLifecycle()

    NfcScanDialog(state = scanState, onScan = { tag ->
        when (bookingType) {
            VaultBookingType.Take -> {
                scope.launch {
                    viewModel.bookVaultToBag(tag.uid.ulongValue(), amount.toDouble() / 100.0)
                }
            }
            VaultBookingType.Return -> {
                scope.launch {
                    viewModel.bookBagToVault(tag.uid.ulongValue(), amount.toDouble() / 100.0)
                }
            }
        }
    })

    Scaffold(
        content = {
            Box(modifier = Modifier.padding(it)) {
                AmountSelection(
                    config = AmountConfig.Money(
                        limit = 9999999u,
                    ),
                    onAmountUpdate = { newAmount -> amount = newAmount },
                    onClear = { amount = 0u },
                )
            }
        },
        bottomBar = {
            Column {
                Spacer(modifier = Modifier.height(10.dp))
                Divider()
                Spacer(modifier = Modifier.height(10.dp))
                Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                    if (status is CashierManagementStatus.Done) {
                        when (val res = (status as CashierManagementStatus.Done).res) {
                            is Response.OK -> {
                                Text(stringResource(R.string.common_status_done), fontSize = 24.sp)
                            }

                            is Response.Error -> {
                                Text(res.msg(), fontSize = 24.sp)
                            }
                        }
                    } else {
                        Text(stringResource(R.string.common_status_idle), fontSize = 24.sp)
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = {
                            bookingType = VaultBookingType.Take
                            scanState.open()
                        }, modifier = Modifier
                            .weight(1.0f)
                            .padding(5.dp)
                            .height(80.dp)
                    ) {
                        Text(
                            stringResource(R.string.management_vault_take),
                            fontSize = 24.sp,
                            textAlign = TextAlign.Center
                        )
                    }

                    Button(
                        onClick = {
                            bookingType = VaultBookingType.Return
                            scanState.open()
                        }, modifier = Modifier
                            .weight(1.0f)
                            .padding(5.dp)
                            .height(80.dp)
                    ) {
                        Text(
                            stringResource(R.string.management_vault_return),
                            fontSize = 24.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    )
}