package de.stustapay.stustapay.ui.cashiermanagement

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.net.Response
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun CashierManagementEquipView(viewModel: CashierManagementViewModel) {
    val scope = rememberCoroutineScope()
    val scanState = rememberNfcScanDialogState()
    val stockings by viewModel.stockings.collectAsStateWithLifecycle()
    val registers by viewModel.registers.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    var selectedStocking by remember { mutableStateOf(0) }
    var selectedRegister by remember { mutableStateOf(0) }

    NfcScanDialog(state = scanState, onScan = {
        scope.launch {
            viewModel.equip(it.uid, registers[selectedRegister].id, stockings[selectedStocking].id)
        }
    })

    Scaffold(
        content = { padding ->
            Box(modifier = Modifier.padding(padding)) {
                Column(modifier = Modifier.padding(10.dp)) {
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
                            value = stockings.getOrNull(selectedStocking)?.name.orEmpty(),
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
                            for (i in stockings.indices) {
                                DropdownMenuItem(onClick = {
                                    selectedStocking = i
                                    stockingExpanded = false
                                }, modifier = Modifier.fillMaxWidth()) {
                                    Text(stockings[i].name)
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
                            value = registers.getOrNull(selectedRegister)?.name.orEmpty(),
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
                            for (i in registers.indices) {
                                DropdownMenuItem(onClick = {
                                    selectedRegister = i
                                    registerExpanded = false
                                }, modifier = Modifier.fillMaxWidth()) {
                                    Text(registers[i].name)
                                }
                            }
                        }
                    }
                }
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

                Button(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                    onClick = {
                        if (0 <= selectedStocking && selectedStocking < stockings.size) {
                            if (0 <= selectedRegister && selectedRegister < registers.size) {
                                scanState.open()
                            }
                        }
                    }
                ) {
                    Text(stringResource(R.string.management_equip_equip), fontSize = 24.sp)
                }
            }
        }
    )
}