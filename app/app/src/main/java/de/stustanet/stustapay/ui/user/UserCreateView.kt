package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.chipscan.NfcScanCard
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.TagTextField
import de.stustanet.stustapay.ui.common.tagIDtoString
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserCreateView(viewModel: UserViewModel) {
    var login by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var roles by remember { mutableStateOf(listOf<ULong>()) }
    var description by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val availableRoles by viewModel.availableRoles.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    var currentTag: ULong? by remember { mutableStateOf(null) }

    if (currentTag == null) {
        Scaffold(
            content = { padding ->
                Box(modifier = Modifier.padding(20.dp)) {
                    NfcScanCard(
                        keepScanning = true,
                        onScan = { tag ->
                            scope.launch {
                                currentTag = tag.uid
                            }
                        }
                    )
                }
            },
            bottomBar = {
                Column {
                    Spacer(modifier = Modifier.height(10.dp))
                    Divider()
                    Spacer(modifier = Modifier.height(10.dp))
                    Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                        val text = when (status) {
                            is UserRequestState.Idle -> {
                                stringResource(R.string.common_status_idle)
                            }
                            is UserRequestState.Fetching -> {
                                stringResource(R.string.common_status_fetching)
                            }
                            is UserRequestState.Done -> {
                                stringResource(R.string.common_status_done)
                            }
                            is UserRequestState.Failed -> {
                                (status as UserRequestState.Failed).msg
                            }
                        }
                        Text(text, fontSize = 24.sp)
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }
            }
        )
    } else {
        Scaffold(
            content = { padding ->
                Box(modifier = Modifier.padding(padding)) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(10.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(stringResource(R.string.user_id), fontSize = 24.sp)
                            Text(tagIDtoString(currentTag!!), fontSize = 36.sp)
                        }

                        Divider()
                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                stringResource(R.string.user_username),
                                fontSize = 24.sp,
                                modifier = Modifier.padding(end = 20.dp)
                            )
                            TextField(
                                value = login,
                                placeholder = { Text(stringResource(R.string.user_username)) },
                                onValueChange = { login = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                        }

                        Divider()
                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                stringResource(R.string.user_displayname),
                                fontSize = 24.sp,
                                modifier = Modifier.padding(end = 20.dp)
                            )
                            TextField(
                                value = displayName,
                                placeholder = { Text(stringResource(R.string.user_displayname)) },
                                onValueChange = { displayName = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                        }

                        Divider()
                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            var expanded by remember { mutableStateOf(false) }

                            Text(
                                stringResource(R.string.user_roles),
                                fontSize = 24.sp,
                                modifier = Modifier.padding(end = 20.dp)
                            )
                            ExposedDropdownMenuBox(
                                expanded = expanded,
                                onExpandedChange = { expanded = it }) {
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
                                ExposedDropdownMenu(
                                    expanded = expanded,
                                    onDismissRequest = { expanded = false }) {
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

                        Divider()
                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                stringResource(R.string.user_description),
                                fontSize = 24.sp,
                                modifier = Modifier.padding(end = 20.dp)
                            )
                            TextField(
                                value = description,
                                placeholder = { Text(stringResource(R.string.user_description)) },
                                onValueChange = { description = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
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
                        val text = when (status) {
                            is UserRequestState.Idle -> {
                                stringResource(R.string.common_status_idle)
                            }
                            is UserRequestState.Fetching -> {
                                stringResource(R.string.common_status_fetching)
                            }
                            is UserRequestState.Done -> {
                                stringResource(R.string.common_status_done)
                            }
                            is UserRequestState.Failed -> {
                                (status as UserRequestState.Failed).msg
                            }
                        }
                        Text(text, fontSize = 24.sp)
                    }
                    Spacer(modifier = Modifier.height(10.dp))

                    Button(modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                        onClick = {
                            scope.launch {
                                viewModel.create(
                                    login,
                                    displayName,
                                    currentTag!!,
                                    roles.mapNotNull { roleId -> availableRoles.find { r -> r.id == roleId } },
                                    description
                                )
                            }
                        }) {
                        Text(stringResource(R.string.common_action_create), fontSize = 24.sp)
                    }
                }
            }
        )
    }
}