package de.stustanet.stustapay.ui.cashiermanagement

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun CashierManagementEquipView(viewModel: CashierManagementViewModel) {
    val scope = rememberCoroutineScope()
    val scanState = rememberNfcScanDialogState()
    val stockings by viewModel.stockings.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    var selected by remember { mutableStateOf(0) }

    NfcScanDialog(state = scanState, onScan = {
        scope.launch {
            viewModel.equip(it.uid, stockings[selected].id)
        }
    })

    Scaffold(
        content = { padding ->
            Box(modifier = Modifier.padding(padding)) {
                Column(modifier = Modifier.padding(10.dp)) {
                    var expanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = it },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        TextField(
                            readOnly = true,
                            value = stockings.getOrNull(selected)?.name.orEmpty(),
                            onValueChange = {},
                            trailingIcon = {
                                ExposedDropdownMenuDefaults.TrailingIcon(
                                    expanded = expanded
                                )
                            },
                            colors = ExposedDropdownMenuDefaults.textFieldColors(),
                            modifier = Modifier.fillMaxWidth()
                        )
                        ExposedDropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            for (i in stockings.indices) {
                                DropdownMenuItem(onClick = {
                                    selected = i
                                    expanded = false
                                }, modifier = Modifier.fillMaxWidth()) {
                                    Text(stockings[i].name)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    if (status is CashierManagementStatus.Done) {
                        when ((status as CashierManagementStatus.Done).res) {
                            is Response.OK -> {
                                Text("Success", fontSize = 24.sp)
                            }
                            is Response.Error -> {
                                Text(((status as CashierManagementStatus.Done).res as Response.Error).msg(), fontSize = 24.sp)
                            }
                        }
                    }
                }
            }
        },
        bottomBar = {
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp),
                onClick = {
                    if (0 < selected && selected < stockings.size) {
                        scanState.open()
                    }
                }
            ) {
                Text("Equip", fontSize = 24.sp)
            }
        }
    )
}