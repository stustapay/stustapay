package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.stustanet.stustapay.model.UserKind
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserCreateView(
    viewModel: UserViewModel,
    goBack: () -> Unit
) {
    val scanState = rememberNfcScanDialogState()
    var id by remember { mutableStateOf("0") }
    var login by remember { mutableStateOf("user") }
    var kind by remember { mutableStateOf(UserKind.Cashier) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(10.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("ID", fontSize = 48.sp, modifier = Modifier.padding(end = 20.dp))
            TextField(
                value = id,
                onValueChange = { id = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
        }

        Button(modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp), onClick = { scanState.open() }) {
            Text(text = "Scan", fontSize = 24.sp)
        }

        NfcScanDialog(state = scanState, onScan = { tag ->
            id = tag.uid.toString()
        })

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Login", fontSize = 48.sp, modifier = Modifier.padding(end = 20.dp))
            TextField(
                value = login,
                onValueChange = { login = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            var expanded by remember { mutableStateOf(false) }

            Text("Kind", fontSize = 48.sp, modifier = Modifier.padding(end = 20.dp))
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                TextField(
                    readOnly = true,
                    value = kind.label,
                    onValueChange = {},
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(
                            expanded = expanded
                        )
                    },
                    colors = ExposedDropdownMenuDefaults.textFieldColors()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    for (k in UserKind.values()) {
                        DropdownMenuItem(onClick = {
                            kind = k
                            expanded = false
                        }) {
                            Text(k.label)
                        }
                    }
                }
            }
        }

        Button(modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp),
            onClick = {
                scope.launch {
                    viewModel.create(login, UserTag(id.toULong()), kind)
                    goBack()
                }
            }) {
            Text(text = "Create", fontSize = 24.sp)
        }
    }
}