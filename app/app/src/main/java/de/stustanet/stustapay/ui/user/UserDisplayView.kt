package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.ListItem
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.chipscan.NfcScanCard
import de.stustanet.stustapay.ui.common.tagIDtoString
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserDisplayView(viewModel: UserViewModel, goToUserUpdateView: () -> Unit) {
    val scope = rememberCoroutineScope()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val currentUser by viewModel.currentUser.collectAsStateWithLifecycle()
    val currentTag by viewModel.currentTag.collectAsStateWithLifecycle()
    val availableRoles by viewModel.availableRoles.collectAsStateWithLifecycle()

    if (currentUser == null) {
        Scaffold(
            content = { padding ->
                Box(
                    modifier = Modifier
                        .padding(padding)
                        .padding(20.dp)
                ) {
                    NfcScanCard(
                        keepScanning = true,
                        onScan = { tag ->
                            scope.launch {
                                viewModel.display(tag.uid)
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
        val user = currentUser!!

        val isPrivileged = user.role_names.mapNotNull { role ->
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
                            secondaryText = { Text(user.login) }
                        )
                        ListItem(
                            text = { Text(stringResource(R.string.user_displayname)) },
                            secondaryText = { Text(user.display_name) }
                        )
                        ListItem(
                            text = { Text(stringResource(R.string.user_roles)) },
                            secondaryText = { Text(user.role_names.reduceOrNull { acc, r -> "$acc, $r" } ?: "") }
                        )
                        ListItem(
                            text = { Text(stringResource(R.string.user_description)) },
                            secondaryText = { Text(user.description ?: "") }
                        )
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

                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        enabled = !isPrivileged,
                        onClick = {
                            scope.launch {
                                goToUserUpdateView()
                            }
                        }) {
                        Text(text = stringResource(R.string.user_update_title), fontSize = 24.sp)
                    }
                }
            }
        )
    }
}