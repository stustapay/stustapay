package de.stustapay.stustapay.ui.cashier

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
import androidx.compose.material.DropdownMenuItem
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.ExposedDropdownMenuBox
import androidx.compose.material.ExposedDropdownMenuDefaults
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
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

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun CashierView(
    viewModel: CashierViewModel = hiltViewModel(), leaveView: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    val userInfo = uiState.userInfo
    val hasRegister = userInfo?.cashRegisterId != null

    BackHandler {
        leaveView()
    }

    LaunchedEffect(null) {
        viewModel.reset()
    }

    NavScaffold(navigateBack = leaveView,
        title = { Text(stringResource(R.string.management_title)) }) {
        Box(modifier = Modifier.padding(it)) {
            Scaffold(content = {
                Box(modifier = Modifier.padding(it)) {
                    if (uiState.nav is CashierNavState.Scan) {
                        NfcScanDialog(state = uiState.scanState,
                            onDismiss = leaveView,
                            onScan = { tag ->
                                scope.launch {
                                    viewModel.fetchTag(tag)
                                }
                            }) {
                            Text(
                                stringResource(R.string.nfc_scan_cashier_prompt),
                                style = NfcScanStyle
                            )
                        }
                    } else if (uiState.nav is CashierNavState.Transfer) {
                        NfcScanDialog(state = uiState.scanState,
                            onDismiss = { viewModel.returnToRoot() },
                            onScan = { tag ->
                                scope.launch {
                                    viewModel.completeTransfer(tag)
                                }
                            }) {
                            Text(
                                stringResource(R.string.nfc_scan_transfer_prompt),
                                style = NfcScanStyle
                            )
                        }
                    }

                    when (uiState.nav) {
                        CashierNavState.Scan, CashierNavState.Root, CashierNavState.Transfer -> {
                            CloseContent(icon = if (uiState.privileged) {
                                Icons.Filled.Clear
                            } else {
                                Icons.Filled.Refresh
                            }, modifier = Modifier.fillMaxSize(), onClose = {
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
                                            "Register: ${
                                                if (hasRegister) {
                                                    userInfo.cashRegisterName
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

                                        if (hasRegister) {
                                            Text(
                                                "%.02f€".format(userInfo.cashDrawerBalance),
                                                modifier = Modifier.padding(
                                                    top = 20.dp, bottom = 10.dp
                                                ),
                                                style = MoneyAmountStyle,
                                            )

                                            Text(
                                                "in cash register", fontSize = 36.sp
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
                                                "no cash register", fontSize = 36.sp
                                            )
                                        }

                                    }
                                }
                            }
                        }

                        CashierNavState.Equip -> {
                            CloseContent(modifier = Modifier.fillMaxSize(), onClose = {
                                scope.launch { viewModel.reset() }
                            }) {
                                Column(
                                    modifier = Modifier.padding(
                                        top = 70.dp, start = 10.dp, end = 10.dp
                                    )
                                ) {
                                    var stockingExpanded by remember { mutableStateOf(false) }
                                    ExposedDropdownMenuBox(
                                        expanded = stockingExpanded,
                                        onExpandedChange = { stockingExpanded = it },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(bottom = 10.dp)
                                    ) {
                                        TextField(
                                            readOnly = true,
                                            value = uiState.stockings.getOrNull(uiState.selectedStocking)?.name.orEmpty(),
                                            onValueChange = {},
                                            trailingIcon = {
                                                ExposedDropdownMenuDefaults.TrailingIcon(
                                                    expanded = stockingExpanded
                                                )
                                            },
                                            colors = ExposedDropdownMenuDefaults.textFieldColors(),
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                        ExposedDropdownMenu(
                                            expanded = stockingExpanded,
                                            onDismissRequest = { stockingExpanded = false },
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            for (i in uiState.stockings.indices) {
                                                DropdownMenuItem(onClick = {
                                                    viewModel.setStocking(i)
                                                    stockingExpanded = false
                                                }, modifier = Modifier.fillMaxWidth()) {
                                                    Text(uiState.stockings[i].name)
                                                }
                                            }
                                        }
                                    }

                                    var registerExpanded by remember { mutableStateOf(false) }
                                    ExposedDropdownMenuBox(
                                        expanded = registerExpanded,
                                        onExpandedChange = { registerExpanded = it },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(bottom = 10.dp)
                                    ) {
                                        TextField(
                                            readOnly = true,
                                            value = uiState.registers.getOrNull(uiState.selectedRegister)?.name.orEmpty(),
                                            onValueChange = {},
                                            trailingIcon = {
                                                ExposedDropdownMenuDefaults.TrailingIcon(
                                                    expanded = registerExpanded
                                                )
                                            },
                                            colors = ExposedDropdownMenuDefaults.textFieldColors(),
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                        ExposedDropdownMenu(
                                            expanded = registerExpanded,
                                            onDismissRequest = { registerExpanded = false },
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            for (i in uiState.registers.indices) {
                                                DropdownMenuItem(onClick = {
                                                    viewModel.setRegister(i)
                                                    registerExpanded = false
                                                }, modifier = Modifier.fillMaxWidth()) {
                                                    Text(uiState.registers[i].name)
                                                }
                                            }
                                        }
                                    }

                                    Button(modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                        onClick = {
                                            if (0 <= uiState.selectedStocking && uiState.selectedStocking < uiState.stockings.size) {
                                                if (0 <= uiState.selectedRegister && uiState.selectedRegister < uiState.registers.size) {
                                                    scope.launch {
                                                        viewModel.completeEquip()
                                                    }
                                                }
                                            }
                                        }) {
                                        Text(
                                            stringResource(R.string.management_equip_equip),
                                            fontSize = 24.sp
                                        )
                                    }
                                }
                            }
                        }

                        CashierNavState.Withdraw -> {
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

                        CashierNavState.Deposit -> {
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

                        CashierNavState.EquipComplete -> {
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
                                    Text("Equip successfull", style = MaterialTheme.typography.h5)
                                    Text(
                                        "%.02f€".format(uiState.userInfo?.cashDrawerBalance),
                                        modifier = Modifier.padding(
                                            top = 20.dp, bottom = 10.dp
                                        ),
                                        style = MoneyAmountStyle,
                                    )
                                    Text("in cash register", fontSize = 36.sp)
                                }
                            }
                        }

                        CashierNavState.WithdrawComplete -> {
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
                                        "%.02f€".format(uiState.userInfo?.cashDrawerBalance),
                                        modifier = Modifier.padding(
                                            top = 20.dp, bottom = 10.dp
                                        ),
                                        style = MoneyAmountStyle,
                                    )
                                    Text("in cash register", fontSize = 36.sp)
                                }
                            }
                        }

                        CashierNavState.DepositComplete -> {
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
                                        "%.02f€".format(uiState.userInfo?.cashDrawerBalance),
                                        modifier = Modifier.padding(
                                            top = 20.dp, bottom = 10.dp
                                        ),
                                        style = MoneyAmountStyle,
                                    )
                                    Text("in cash register", fontSize = 36.sp)
                                }
                            }
                        }

                        CashierNavState.TransferComplete -> {
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
                                        "Transfer successfull", style = MaterialTheme.typography.h5
                                    )
                                }
                            }
                        }
                    }
                }
            }, bottomBar = {
                Column {
                    when (uiState.nav) {
                        CashierNavState.Root, CashierNavState.Transfer -> {
                            Column(
                                modifier = Modifier.padding(
                                    top = 10.dp, start = 10.dp, end = 10.dp
                                )
                            ) {
                                Divider()
                                Spacer(modifier = Modifier.height(10.dp))

                                Button(modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 5.dp),
                                    enabled = !hasRegister and uiState.privileged,
                                    onClick = {
                                        scope.launch {
                                            viewModel.equip()
                                        }
                                    }) {
                                    Text(stringResource(R.string.management_equip_equip))
                                }

                                Button(modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 5.dp),
                                    enabled = hasRegister and uiState.privileged,
                                    onClick = {
                                        scope.launch {
                                            viewModel.transfer()
                                        }
                                    }) {
                                    Text(stringResource(R.string.transfer_cash_register))
                                }

                                Row(modifier = Modifier.fillMaxWidth()) {
                                    Button(modifier = Modifier
                                        .weight(1.0f)
                                        .padding(end = 5.dp)
                                        .height(80.dp),
                                        enabled = hasRegister and uiState.privileged,
                                        onClick = {
                                            viewModel.withdraw()
                                        }) {
                                        Text(
                                            stringResource(R.string.management_transport_withdraw),
                                            fontSize = 18.sp,
                                            textAlign = TextAlign.Center
                                        )
                                    }

                                    Button(modifier = Modifier
                                        .weight(1.0f)
                                        .padding(start = 5.dp)
                                        .height(80.dp),
                                        enabled = hasRegister and uiState.privileged,
                                        onClick = {
                                            viewModel.deposit()
                                        }) {
                                        Text(
                                            stringResource(R.string.management_transport_deposit),
                                            fontSize = 18.sp,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            }
                        }

                        CashierNavState.Scan, CashierNavState.Equip, CashierNavState.Withdraw, CashierNavState.Deposit, CashierNavState.EquipComplete, CashierNavState.WithdrawComplete, CashierNavState.DepositComplete, CashierNavState.TransferComplete -> {}
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Divider()
                    Box(
                        modifier = Modifier.padding(
                            top = 10.dp, bottom = 10.dp, start = 10.dp, end = 10.dp
                        )
                    ) {
                        val text = when (val state = uiState.request) {
                            is CashierRequestState.Failed -> {
                                state.msg
                            }

                            is CashierRequestState.Fetching -> {
                                stringResource(R.string.common_status_fetching)
                            }

                            is CashierRequestState.Done -> {
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