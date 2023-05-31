package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.chipscan.NfcScanCard
import de.stustanet.stustapay.ui.common.tagIDtoString
import kotlinx.coroutines.launch

@Composable
fun UserDisplayView(viewModel: UserViewModel, goToUserDisplayView: () -> Unit) {
    val scope = rememberCoroutineScope()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val currentUser by viewModel.currentUser.collectAsStateWithLifecycle()
    val currentTag by viewModel.currentTag.collectAsStateWithLifecycle()

    if (currentUser == null) {
        Scaffold(
            content = { padding ->
                Box(modifier = Modifier.padding(20.dp)) {
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
                                .fillMaxWidth(),
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

                        Row(
                            modifier = Modifier
                                .fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(stringResource(R.string.user_roles), fontSize = 24.sp)
                            Text(
                                user.role_names.reduce { acc, r -> "$acc, $r" },
                                fontSize = 36.sp,
                                textAlign = TextAlign.Right
                            )
                        }

                        Divider()

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                stringResource(R.string.user_description),
                                fontSize = 24.sp
                            )
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(user.description ?: "", fontSize = 36.sp)
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
                                goToUserDisplayView()
                            }
                        }) {
                        Text(text = stringResource(R.string.user_update_title), fontSize = 24.sp)
                    }
                }
            }
        )
    }
}