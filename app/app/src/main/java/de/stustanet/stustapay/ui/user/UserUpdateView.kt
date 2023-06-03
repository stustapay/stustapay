package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.common.tagIDtoString
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserUpdateView(viewModel: UserViewModel) {
    var roles by remember { mutableStateOf(listOf<ULong>()) }
    val scope = rememberCoroutineScope()
    val availableRoles by viewModel.availableRoles.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val currentUser by viewModel.currentUser.collectAsStateWithLifecycle()
    val currentTag by viewModel.currentTag.collectAsStateWithLifecycle()

    val currentUserV = currentUser
    if (currentUserV == null) {
        Text("current user is null")
        return
    }

    LaunchedEffect(currentUserV, availableRoles) {
        roles = currentUserV.role_names.mapNotNull { it ->
            val role = availableRoles.find { available -> available.name == it }
            if (role != null && !role.is_privileged) {
                role.id
            } else {
                null
            }
        }
    }

    val isPrivileged = currentUserV.role_names.mapNotNull { role ->
        availableRoles.find { available -> available.name == role }?.is_privileged
    }.contains(true)

    Scaffold(
        content = { padding ->
            Box(modifier = Modifier.padding(padding)) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(10.dp)
                ) {
                    ListItem(
                        text = { Text(stringResource(R.string.tag_uid)) },
                        secondaryText = { Text(tagIDtoString(currentTag)) }
                    )
                    ListItem(
                        text = { Text(stringResource(R.string.user_username)) },
                        secondaryText = { Text(currentUserV.login) }
                    )
                    ListItem(
                        text = { Text(stringResource(R.string.user_displayname)) },
                        secondaryText = { Text(currentUserV.display_name) }
                    )
                    ListItem(
                        text = { Text(stringResource(R.string.user_description)) },
                        secondaryText = { Text(currentUserV.description ?: "") }
                    )

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

                        ExposedDropdownMenuBox(
                            expanded = expanded,
                            onExpandedChange = { expanded = it }) {
                            OutlinedTextField(
                                label = { Text(stringResource(R.string.user_roles)) },
                                readOnly = true,
                                value = roles.map { id ->
                                    availableRoles.find { r -> r.id == id }?.name ?: ""
                                }.reduceOrNull { acc, r -> "$acc, $r" }.orEmpty(),
                                onValueChange = {},
                                trailingIcon = {
                                    ExposedDropdownMenuDefaults.TrailingIcon(
                                        expanded = expanded
                                    )
                                },
                                modifier = Modifier.fillMaxWidth()
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
                }
            }
        },
        bottomBar = {
            Column {
                Spacer(modifier = Modifier.height(10.dp))
                Divider()
                Spacer(modifier = Modifier.height(10.dp))
                Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                    Column {
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
                        Spacer(modifier = Modifier.height(10.dp))
                        if (isPrivileged) {
                            Text(
                                stringResource(R.string.user_privileged),
                                fontSize = 24.sp,
                                color = Color.Red
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))

                Button(modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp),
                    enabled = !isPrivileged,
                    onClick = {
                        scope.launch {
                            viewModel.update(
                                currentTag,
                                roles.mapNotNull { roleId -> availableRoles.find { r -> r.id == roleId } }
                            )
                        }
                    }) {
                    Text(text = stringResource(R.string.common_action_update), fontSize = 24.sp)
                }
            }
        }
    )
}