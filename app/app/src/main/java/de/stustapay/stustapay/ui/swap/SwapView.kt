package de.stustapay.stustapay.ui.swap

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.libssp.ui.theme.MoneyAmountStyle
import de.stustapay.libssp.ui.theme.NfcScanStyle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.chipscan.NfcScanDialog
import de.stustapay.stustapay.ui.common.CloseContent
import de.stustapay.stustapay.ui.common.SuccessIcon
import de.stustapay.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch

@Preview
@Composable
fun SwapView(
    leaveView: () -> Unit = {},
    viewModel: SwapViewModel = hiltViewModel(),
) {
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    BackHandler {
        leaveView()
    }

    if (uiState.nav is SwapNavState.ScanOld) {
        NfcScanDialog(state = rememberDialogDisplayState(true),
            onDismiss = { viewModel.returnToRoot() },
            onScan = { tag ->
                viewModel.setOldTagPin(tag.pin.orEmpty())
                viewModel.returnToRoot()
            }) {
            Text(
                stringResource(R.string.nfc_scan_prompt), style = NfcScanStyle
            )
        }
    } else if (uiState.nav is SwapNavState.ScanNew) {
        NfcScanDialog(state = rememberDialogDisplayState(true),
            onDismiss = { viewModel.returnToRoot() },
            onScan = { tag ->
                scope.launch {
                    viewModel.swap(tag)
                }
            }) {
            Text(
                stringResource(R.string.nfc_scan_new_prompt), style = NfcScanStyle
            )
        }
    }

    NavScaffold(
        title = { Text(stringResource(R.string.customer_swap)) }, navigateBack = leaveView
    ) {
        Box(modifier = Modifier.padding(it)) {
            Scaffold(content = {
                Box(modifier = Modifier.padding(it)) {
                    when (uiState.nav) {
                        is SwapNavState.Root, SwapNavState.ScanNew, SwapNavState.ScanOld -> {
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
                                    Text(
                                        stringResource(R.string.customer_oldtag),
                                        fontSize = 24.sp,
                                        modifier = Modifier.padding(end = 20.dp)
                                    )
                                    TextField(value = uiState.oldTag.pin.orEmpty(),
                                        modifier = Modifier.fillMaxWidth(),
                                        onValueChange = {
                                            viewModel.setOldTagPin(it)
                                        })
                                }

                                Button(modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp),
                                    onClick = { viewModel.scanOld() }) {
                                    Text(
                                        stringResource(R.string.customer_scanoldtag),
                                        fontSize = 24.sp
                                    )
                                }

                                Divider()

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 10.dp, top = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        stringResource(R.string.customer_comment),
                                        fontSize = 24.sp,
                                        modifier = Modifier.padding(end = 20.dp)
                                    )
                                    TextField(
                                        value = uiState.comment, onValueChange = {
                                            viewModel.setComment(it)
                                        }, singleLine = true
                                    )
                                }

                                Divider()

                                Button(modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 10.dp),
                                    onClick = { viewModel.scanNew() }) {
                                    Text(stringResource(R.string.customer_swap), fontSize = 24.sp)
                                }
                            }
                        }

                        is SwapNavState.Complete -> {
                            CloseContent(modifier = Modifier.fillMaxSize(), onClose = {
                                scope.launch { viewModel.returnToRoot() }
                            }) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(top = 50.dp, start = 20.dp, end = 20.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    SuccessIcon(modifier = Modifier.size(120.dp))
                                    Text("Swap successfull", style = MaterialTheme.typography.h5)
                                }
                            }
                        }
                    }
                }
            }, bottomBar = {
                Column {
                    Spacer(modifier = Modifier.height(10.dp))
                    Divider()
                    Box(
                        modifier = Modifier.padding(
                            top = 10.dp, bottom = 10.dp, start = 10.dp, end = 10.dp
                        )
                    ) {
                        val text = when (val state = uiState.request) {
                            is SwapRequestState.Failed -> {
                                state.msg
                            }

                            is SwapRequestState.Fetching -> {
                                stringResource(R.string.common_status_fetching)
                            }

                            is SwapRequestState.Done -> {
                                stringResource(R.string.common_status_done)
                            }
                        }
                        Text(text, fontSize = 24.sp)
                    }
                }
            })
        }
    }
}