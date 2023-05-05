package de.stustanet.stustapay.ui.cashiermanagement

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.model.UserKind
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun CashierManagementEquipView(viewModel: CashierManagementViewModel, navigateBack: () -> Unit) {
    val scanState = rememberNfcScanDialogState()

    NfcScanDialog(state = scanState, onScan = {
        navigateBack()
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
                            value = "",
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
                            for (k in UserKind.values()) {
                                DropdownMenuItem(onClick = {
                                    expanded = false
                                }, modifier = Modifier.fillMaxWidth()) {
                                    Text(k.label)
                                }
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
                    scanState.open()
                }
            ) {
                Text("Equip", fontSize = 24.sp)
            }
        }
    )
}