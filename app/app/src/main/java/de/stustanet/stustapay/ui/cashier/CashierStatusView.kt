package de.stustanet.stustapay.ui.cashier

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.common.rememberDialogDisplayState
import de.stustanet.stustapay.ui.common.tagIDtoString
import de.stustanet.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch

@Composable
fun CashierStatusView(
    viewModel: CashierStatusViewModel = hiltViewModel(),
    leaveView: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scanState = rememberDialogDisplayState()

    LaunchedEffect(null) {
        viewModel.fetchLocal()
    }

    NfcScanDialog(state = scanState, onScan = { tag ->
        scope.launch {
            viewModel.fetchTag(tag.uid)
        }
    })

    NavScaffold(
        navigateBack = leaveView,
        title = { Text(stringResource(R.string.cashier_title)) }
    ) {
        Box(modifier = Modifier.padding(it)) {
            Scaffold(
                content = {
                    Box(modifier = Modifier.padding(it)) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(10.dp)
                        ) {
                            when (val state = uiState.state) {
                                is CashierStatusRequestState.Fetching -> {
                                    Text(
                                        stringResource(R.string.common_status_fetching),
                                        fontSize = 36.sp
                                    )
                                }

                                is CashierStatusRequestState.Done -> {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("ID", fontSize = 24.sp)
                                        Text(
                                            tagIDtoString(state.userInfo.user_tag_uid),
                                            fontSize = 36.sp
                                        )
                                    }

                                    if (state.userInfo.cash_drawer_balance != null) {
                                        Divider()

                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                stringResource(R.string.cashier_drawer),
                                                fontSize = 24.sp
                                            )
                                            Text(
                                                "${state.userInfo.cash_drawer_balance}€",
                                                fontSize = 36.sp
                                            )
                                        }
                                    }


                                    if (state.userInfo.transport_account_balance != null) {
                                        Divider()

                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                stringResource(R.string.cashier_bag),
                                                fontSize = 24.sp
                                            )
                                            Text(
                                                "${state.userInfo.transport_account_balance}€",
                                                fontSize = 36.sp
                                            )
                                        }
                                    }
                                }

                                is CashierStatusRequestState.Failed -> {
                                    Text(
                                        stringResource(R.string.common_status_failed),
                                        fontSize = 36.sp
                                    )
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
                            val text = when (val state = uiState.state) {
                                is CashierStatusRequestState.Failed -> {
                                    state.msg
                                }

                                is CashierStatusRequestState.Fetching -> {
                                    stringResource(R.string.common_status_fetching)
                                }

                                is CashierStatusRequestState.Done -> {
                                    stringResource(R.string.common_status_done)
                                }
                            }
                            Text(text, fontSize = 24.sp)
                        }
                        Spacer(modifier = Modifier.height(10.dp))

                        Button(
                            onClick = {
                                scanState.open()
                            }, modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp)
                        ) {
                            Text(stringResource(R.string.common_action_scan), fontSize = 24.sp)
                        }
                    }
                }
            )
        }
    }
}