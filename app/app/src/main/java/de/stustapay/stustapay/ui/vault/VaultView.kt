package de.stustapay.stustapay.ui.vault

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.theme.MoneyAmountStyle
import de.stustapay.libssp.ui.theme.NfcScanStyle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.common.CloseContent
import de.stustapay.stustapay.ui.common.SuccessIcon
import de.stustapay.stustapay.ui.common.amountselect.AmountConfig
import de.stustapay.stustapay.ui.common.amountselect.AmountSelection
import de.stustapay.stustapay.ui.common.pay.ProductConfirmItem
import de.stustapay.stustapay.ui.common.tagIDtoString
import de.stustapay.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch

@Composable
fun VaultView(
    viewModel: VaultViewModel = hiltViewModel(), leaveView: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    val userInfo = uiState.userInfo
    val hasTransportAccount = userInfo?.transportAccountId != null

    BackHandler {
        leaveView()
    }

    LaunchedEffect(null) {
        viewModel.initialReset()
    }

    NavScaffold(navigateBack = leaveView,
        title = { Text(stringResource(R.string.management_vault_title)) }) {
        Box(modifier = Modifier.padding(it)) {
            Scaffold(content = {
                Box(modifier = Modifier.padding(it)) {
                    if (uiState.nav is VaultNavState.Scan) {
                        NfcScanDialog(state = uiState.scanState,
                            onDismiss = leaveView,
                            onScan = { tag ->
                                scope.launch {
                                    viewModel.fetchTag(tag)
                                }
                            }) {
                            Text(
                                stringResource(R.string.nfc_scan_prompt), style = NfcScanStyle
                            )
                        }
                    }

                    when (uiState.nav) {
                        VaultNavState.Scan, VaultNavState.Root -> {
                            CloseContent(modifier = Modifier.fillMaxSize(), onClose = {
                                scope.launch { viewModel.reset() }
                            }) {
                                if (userInfo != null) {
                                    Column(
                                        modifier = Modifier.fillMaxSize(),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            "ID: ${tagIDtoString(userInfo.userTagUid.ulongValue())}",
                                            style = MaterialTheme.typography.h5,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(start = 20.dp, top = 20.dp),
                                        )
                                        Text(
                                            "Account: ${
                                                if (hasTransportAccount) {
                                                    userInfo.transportAccountId
                                                } else {
                                                    "None"
                                                }
                                            }",
                                            style = MaterialTheme.typography.h5,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(start = 20.dp),
                                        )
                                        Text(
                                            "Name: ${userInfo.displayName}",
                                            style = MaterialTheme.typography.h5,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(start = 20.dp),
                                        )

                                        if (hasTransportAccount) {
                                            Text(
                                                "%.02f€".format(userInfo.transportAccountBalance),
                                                modifier = Modifier.padding(
                                                    top = 20.dp, bottom = 10.dp
                                                ),
                                                style = MoneyAmountStyle,
                                            )

                                            Text(
                                                "in transport account", fontSize = 36.sp
                                            )
                                        } else {
                                            Text(
                                                "-",
                                                modifier = Modifier.padding(
                                                    top = 20.dp, bottom = 10.dp
                                                ),
                                                style = MoneyAmountStyle,
                                            )

                                            Text(
                                                "no transport account", fontSize = 36.sp
                                            )
                                        }

                                    }
                                }
                            }
                        }

                        VaultNavState.Withdraw -> {
                            CloseContent(modifier = Modifier.fillMaxSize(), onClose = {
                                scope.launch { viewModel.reset() }
                            }) {
                                Column(modifier = Modifier.fillMaxSize()) {
                                    Spacer(modifier = Modifier.height(40.dp))
                                    AmountSelection(
                                        config = AmountConfig.Money(
                                            limit = 9999999u,
                                        ),
                                        amount = uiState.amount,
                                        onAmountUpdate = { amount -> viewModel.setAmount(amount) },
                                        onClear = { viewModel.setAmount(0u) },
                                    )
                                    Button(modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(start = 10.dp, end = 10.dp, top = 10.dp),
                                        onClick = {
                                            scope.launch {
                                                viewModel.completeWithdraw()
                                            }
                                        }) {
                                        Text("Withdraw")
                                    }
                                }
                            }
                        }

                        VaultNavState.Deposit -> {
                            CloseContent(modifier = Modifier.fillMaxSize(), onClose = {
                                scope.launch { viewModel.reset() }
                            }) {
                                Column(modifier = Modifier.fillMaxSize()) {
                                    Spacer(modifier = Modifier.height(40.dp))
                                    AmountSelection(
                                        config = AmountConfig.Money(
                                            limit = 9999999u,
                                        ),
                                        amount = uiState.amount,
                                        onAmountUpdate = { amount -> viewModel.setAmount(amount) },
                                        onClear = { viewModel.setAmount(0u) },
                                    )
                                    Button(modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(start = 10.dp, end = 10.dp, top = 10.dp),
                                        onClick = {
                                            scope.launch {
                                                viewModel.completeDeposit()
                                            }
                                        }) {
                                        Text("Deposit")
                                    }
                                }
                            }
                        }

                        VaultNavState.WithdrawComplete -> {
                            CloseContent(modifier = Modifier.fillMaxSize(), onClose = {
                                scope.launch { viewModel.reset() }
                            }) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(top = 50.dp, start = 20.dp, end = 20.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    SuccessIcon(modifier = Modifier.size(120.dp))
                                    Text(
                                        "Withdrawal successfull",
                                        style = MaterialTheme.typography.h5
                                    )
                                    ProductConfirmItem(
                                        name = "Withdrawn",
                                        price = uiState.amount.toDouble() / 100.0,
                                        bigStyle = true,
                                    )
                                    Text(
                                        "%.02f€".format(uiState.userInfo?.transportAccountBalance),
                                        modifier = Modifier.padding(
                                            top = 20.dp, bottom = 10.dp
                                        ),
                                        style = MoneyAmountStyle,
                                    )
                                    Text("in transport account", fontSize = 30.sp)
                                }
                            }
                        }

                        VaultNavState.DepositComplete -> {
                            CloseContent(modifier = Modifier.fillMaxSize(), onClose = {
                                scope.launch { viewModel.reset() }
                            }) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(top = 50.dp, start = 20.dp, end = 20.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    SuccessIcon(modifier = Modifier.size(120.dp))
                                    Text("Deposit successfull", style = MaterialTheme.typography.h5)
                                    ProductConfirmItem(
                                        name = "Deposited",
                                        price = uiState.amount.toDouble() / 100.0,
                                        bigStyle = true,
                                    )
                                    Text(
                                        "%.02f€".format(uiState.userInfo?.transportAccountBalance),
                                        modifier = Modifier.padding(
                                            top = 20.dp, bottom = 10.dp
                                        ),
                                        style = MoneyAmountStyle,
                                    )
                                    Text("in transport account", fontSize = 30.sp)
                                }
                            }
                        }
                    }
                }
            }, bottomBar = {
                Column {
                    when (uiState.nav) {
                        VaultNavState.Root -> {
                            Column(
                                modifier = Modifier.padding(
                                    top = 10.dp, start = 10.dp, end = 10.dp
                                )
                            ) {
                                Divider()
                                Spacer(modifier = Modifier.height(10.dp))

                                Row(modifier = Modifier.fillMaxWidth()) {
                                    Button(modifier = Modifier
                                        .weight(1.0f)
                                        .padding(end = 5.dp)
                                        .height(80.dp),
                                        enabled = hasTransportAccount,
                                        onClick = {
                                            viewModel.withdraw()
                                        }) {
                                        Text(
                                            stringResource(R.string.management_vault_take),
                                            fontSize = 18.sp,
                                            textAlign = TextAlign.Center
                                        )
                                    }

                                    Button(modifier = Modifier
                                        .weight(1.0f)
                                        .padding(start = 5.dp)
                                        .height(80.dp),
                                        enabled = hasTransportAccount,
                                        onClick = {
                                            viewModel.deposit()
                                        }) {
                                        Text(
                                            stringResource(R.string.management_vault_return),
                                            fontSize = 18.sp,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }
                        }

                        VaultNavState.Scan, VaultNavState.Withdraw, VaultNavState.Deposit, VaultNavState.WithdrawComplete, VaultNavState.DepositComplete -> {}
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Divider()
                    Box(
                        modifier = Modifier.padding(
                            top = 10.dp, bottom = 10.dp, start = 10.dp, end = 10.dp
                        )
                    ) {
                        val text = when (val state = uiState.request) {
                            is VaultRequestState.Failed -> {
                                state.msg
                            }

                            is VaultRequestState.Fetching -> {
                                stringResource(R.string.common_status_fetching)
                            }

                            is VaultRequestState.Done -> {
                                stringResource(R.string.common_status_done)
                            }
                        }
                        Text(text, fontSize = 24.sp)
                    }
                }
            })
        }
    }
}