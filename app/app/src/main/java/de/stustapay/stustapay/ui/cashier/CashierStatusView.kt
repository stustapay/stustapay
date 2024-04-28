package de.stustapay.stustapay.ui.cashier

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.ListItem
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.ui.common.tagIDtoString
import de.stustapay.stustapay.ui.nav.NavScaffold
import de.stustapay.libssp.util.formatCurrencyValue
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun CashierStatusView(
    viewModel: CashierStatusViewModel = hiltViewModel(),
    leaveView: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scanState = rememberDialogDisplayState()

    BackHandler {
        leaveView()
    }

    LaunchedEffect(null) {
        viewModel.fetchLocal()
    }

    NfcScanDialog(state = scanState, onScan = { tag ->
        scope.launch {
            viewModel.fetchTag(tag)
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
                                    ListItem(
                                        text = {
                                            Text(
                                                stringResource(R.string.tag_uid),
                                            )
                                        },
                                        secondaryText = {
                                            Text(
                                                tagIDtoString(state.userInfo.userTagUid.ulongValue()),
                                            )
                                        }
                                    )

                                    if (state.userInfo.cashRegisterName != null ||
                                        state.userInfo.cashDrawerBalance != 0.0
                                    ) {
                                        Divider()
                                        Spacer(modifier = Modifier.height(10.dp))

                                        ListItem(
                                            text = {
                                                Text(
                                                    stringResource(R.string.cashier_drawer),
                                                )
                                            },
                                            secondaryText = {
                                                Text(
                                                    state.userInfo.cashRegisterName ?: "",
                                                )
                                            }
                                        )

                                        Spacer(modifier = Modifier.height(10.dp))
                                        Divider()

                                        ListItem(
                                            text = {
                                                Text(
                                                    stringResource(R.string.cashier_drawer_cash),
                                                )
                                            },
                                            secondaryText = {
                                                Text(
                                                    formatCurrencyValue(state.userInfo.cashDrawerBalance),
                                                )
                                            }
                                        )
                                    }

                                    if (state.userInfo.transportAccountBalance != null) {
                                        Spacer(modifier = Modifier.height(10.dp))
                                        Divider()
                                        ListItem(
                                            text = {
                                                Text(
                                                    stringResource(R.string.cashier_bag),
                                                )
                                            },
                                            secondaryText = {
                                                Text(
                                                    formatCurrencyValue(state.userInfo.transportAccountBalance),
                                                )
                                            }
                                        )
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