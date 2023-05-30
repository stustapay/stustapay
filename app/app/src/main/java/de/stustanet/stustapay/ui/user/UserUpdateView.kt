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

    LaunchedEffect(currentUser, availableRoles) {
        if (currentUser != null) {
            roles = currentUser!!.role_names.mapNotNull { role ->
                val role = availableRoles.find { available -> available.name == role }
                if (role != null && !role.is_privileged) {
                    role.id
                } else {
                    null
                }
            }
        }
    }

    val isPrivileged = currentUser!!.role_names.mapNotNull { role ->
        availableRoles.find { available -> available.name == role }?.is_privileged
    }.contains(true)

    if (currentUser != null) {
        val user = currentUser!!

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
                            Text(tagIDtoString(currentTag), fontSize = 36.sp)
                        }

                        Divider()

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(stringResource(R.string.user_username), fontSize = 24.sp)
                            Text(user.login, fontSize = 36.sp)
                        }

                        Divider()

                        Row(
                            modifier = Modifier
                                .fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(stringResource(R.string.user_displayname), fontSize = 24.sp)
                            Text(user.display_name, fontSize = 36.sp)
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
}