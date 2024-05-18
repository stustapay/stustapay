package de.stustapay.stustapay.ui.user

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.DropdownMenuItem
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.ExposedDropdownMenuBox
import androidx.compose.material.ExposedDropdownMenuDefaults
import androidx.compose.material.Icon
import androidx.compose.material.ListItem
import androidx.compose.material.OutlinedTextField
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.common.tagIDtoString
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
    var currentTagState: NfcTag? by remember { mutableStateOf(null) }

    val currentTag = currentTagState;
    if (currentTag == null) {
        Scaffold(content = { padding ->
            Box(
                modifier = Modifier
                    .padding(padding)
                    .padding(20.dp)
            ) {
                NfcScanCard(keepScanning = true, onScan = { tag ->
                    scope.launch {
                        currentTagState = tag
                    }
                })
            }
        }, bottomBar = {
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
        })
    } else {
        currentTag.uid
        Scaffold(content = { padding ->
            Box(modifier = Modifier.padding(padding)) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(10.dp)
                ) {
                    ListItem(text = { Text(stringResource(R.string.tag_uid)) },
                        secondaryText = { Text(tagIDtoString(currentTag.uid.ulongValue())) })

                    Divider()
                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        label = { Text(stringResource(R.string.user_username)) },
                        value = login,
                        onValueChange = { login = it },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    OutlinedTextField(
                        label = { Text(stringResource(R.string.user_displayname)) },
                        value = displayName,
                        onValueChange = { displayName = it },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    OutlinedTextField(
                        label = { Text(stringResource(R.string.user_description)) },
                        value = description,
                        onValueChange = { description = it },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        var expanded by remember { mutableStateOf(false) }

                        ExposedDropdownMenuBox(expanded = expanded,
                            onExpandedChange = { expanded = it }) {
                            OutlinedTextField(
                                label = { Text(stringResource(R.string.user_roles)) },
                                readOnly = true,
                                value = roles.map { id ->
                                    availableRoles.find { r -> r.id.ulongValue() == id }?.name ?: ""
                                }.reduceOrNull { acc, r -> "$acc, $r" }.orEmpty(),
                                onValueChange = {},
                                trailingIcon = {
                                    ExposedDropdownMenuDefaults.TrailingIcon(
                                        expanded = expanded
                                    )
                                },
                                modifier = Modifier.fillMaxWidth(),
                            )
                            ExposedDropdownMenu(expanded = expanded,
                                onDismissRequest = { expanded = false }) {
                                for (r in availableRoles) {
                                    if (!r.isPrivileged!!) {
                                        DropdownMenuItem(onClick = {
                                            roles = if (roles.contains(r.id.ulongValue())) {
                                                roles - r.id.ulongValue()
                                            } else {
                                                roles + r.id.ulongValue()
                                            }
                                            expanded = false
                                        }) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(r.name)
                                                if (roles.contains(r.id.ulongValue())) {
                                                    Icon(Icons.Filled.Check, null)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, bottomBar = {
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
                    .padding(10.dp), onClick = {
                    scope.launch {
                        viewModel.create(
                            login,
                            displayName,
                            currentTag,
                            roles.mapNotNull { roleId -> availableRoles.find { r -> r.id.ulongValue() == roleId }?.id },
                            description
                        )
                    }
                }) {
                    Text(stringResource(R.string.common_action_create), fontSize = 24.sp)
                }
            }
        })
    }
}