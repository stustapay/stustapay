package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.TagTextField
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserUpdateView(
    viewModel: UserViewModel,
    goBack: () -> Unit
) {
    val scanState = rememberNfcScanDialogState()
    var roles by remember { mutableStateOf(listOf<ULong>()) }
    var newTagId by remember { mutableStateOf<ULong?>(null) }
    val scope = rememberCoroutineScope()
    val availableRoles by viewModel.availableRoles.collectAsStateWithLifecycle()

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
            TagTextField(
                newTagId,
                modifier = Modifier.fillMaxWidth(),
            ) {
                newTagId = it
            }
        }

        Button(modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp), onClick = { scanState.open() }) {
            Text(text = "Scan", fontSize = 24.sp)
        }

        NfcScanDialog(state = scanState, onScan = { tag ->
            newTagId = tag.uid
        })

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            var expanded by remember { mutableStateOf(false) }

            Text("Roles", fontSize = 48.sp, modifier = Modifier.padding(end = 20.dp))
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                TextField(
                    readOnly = true,
                    value = roles.map { id ->
                        availableRoles.find { r -> r.id == id }?.name ?: ""
                    }.reduceOrNull() { acc, r -> "$acc, $r" }.orEmpty(),
                    onValueChange = {},
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(
                            expanded = expanded
                        )
                    },
                    colors = ExposedDropdownMenuDefaults.textFieldColors()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    for (r in availableRoles) {
                        if (!r.is_privileged) {
                            DropdownMenuItem(onClick = {
                                roles = if (roles.contains(r.id)) {
                                    roles - r.id
                                } else {
                                    roles + r.id
                                }
                                expanded = false
                                println(roles)
                            }) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(r.name)
                                    if (roles.contains(r.id)) {
                                        Icon(Icons.Filled.Check, null)
                                    }
                                }
                            }
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
                    val id = newTagId
                    if (id != null) {
                        viewModel.update(id, roles.mapNotNull { roleId -> availableRoles.find { r -> r.id == roleId } })
                        goBack()
                    }
                }
            }) {
            Text(text = "Update", fontSize = 24.sp)
        }
    }
}