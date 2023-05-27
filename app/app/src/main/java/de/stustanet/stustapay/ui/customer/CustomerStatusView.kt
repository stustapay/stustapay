package de.stustanet.stustapay.ui.customer

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.model.UserTag
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.TagTextField
import de.stustanet.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch
import java.text.DecimalFormat

@Preview
@Composable
fun CustomerStatusView(
    leaveView: () -> Unit = {},
    viewModel: CustomerStatusViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val swapVisible by viewModel.swapVisible.collectAsStateWithLifecycle()
    val scanState = rememberNfcScanDialogState()
    var targetId by remember { mutableStateOf(0uL) }

    val scope = rememberCoroutineScope()

    LaunchedEffect(scanState) {
        viewModel.startScan()
        scanState.open()
    }

    NavScaffold(title = { Text("Account Status") }, navigateBack = leaveView) {
        Scaffold(
            content = {
                Box(modifier = Modifier.padding(it)) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(10.dp)
                    ) {
                        when (val state = uiState.state) {
                            is CustomerStatusRequestState.Fetching -> {
                                Text("Fetching status...", fontSize = 36.sp)
                            }

                            is CustomerStatusRequestState.Done -> {
                                val customer = state.customer

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("ID", fontSize = 24.sp)
                                    Text(customer.id.toString(), fontSize = 36.sp)
                                }

                                Divider()

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Name", fontSize = 24.sp)
                                    Text(customer.name ?: "no name", fontSize = 36.sp)
                                }

                                Divider()

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Cash", fontSize = 24.sp)
                                    Text(
                                        "${DecimalFormat("#.00").format(customer.balance)}€",
                                        fontSize = 36.sp
                                    )
                                }

                                Divider()

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Coupons", fontSize = 24.sp)
                                    Text(customer.vouchers.toString(), fontSize = 36.sp)
                                }

                                Divider()

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Comment", fontSize = 24.sp)
                                }

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(customer.comment ?: "", fontSize = 36.sp)
                                }
                            }

                            is CustomerStatusRequestState.Failed -> {
                                Text("Request failed", fontSize = 36.sp)
                            }

                            is CustomerStatusRequestState.Swap -> {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        "Old Tag",
                                        fontSize = 48.sp,
                                        modifier = Modifier.padding(end = 20.dp)
                                    )
                                    TagTextField(
                                        targetId,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        if (it != null) {
                                            targetId = it
                                        }
                                    }
                                }

                                Button(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                    onClick = {
                                        scanState.open()
                                    }
                                ) {
                                    Text("Scan", fontSize = 24.sp)
                                }

                                NfcScanDialog(state = scanState, onScan = { tag ->
                                    targetId = tag.uid
                                })
                            }

                            is CustomerStatusRequestState.SwapDone -> {
                                Text("Swapped tag accounts", fontSize = 36.sp)
                            }
                        }
                    }
                }
            },
            bottomBar = {
                Spacer(modifier = Modifier.height(20.dp))
                Divider()
                Spacer(modifier = Modifier.height(20.dp))

                when (val state = uiState.state) {
                    is CustomerStatusRequestState.Done -> {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp)
                        ) {
                            Button(
                                modifier = Modifier
                                    .weight(1.0f),
                                onClick = {
                                    viewModel.startScan()
                                    scanState.open()
                                }
                            ) {
                                Text("Scan", fontSize = 24.sp)
                            }

                            if (swapVisible) {
                                Button(
                                    modifier = Modifier
                                        .padding(start = 10.dp)
                                        .weight(0.5f),
                                    onClick = {
                                        val uid = state.customer.user_tag_uid
                                        if (uid != null) {
                                            viewModel.startSwap(UserTag(uid))
                                        }
                                    }
                                ) {
                                    Text("Swap", fontSize = 24.sp)
                                }
                            }
                        }

                        NfcScanDialog(
                            state = scanState,
                            onScan = { tag ->
                                scope.launch {
                                    viewModel.completeScan(tag.uid)
                                }
                            }
                        )
                    }

                    is CustomerStatusRequestState.Swap -> {
                        Button(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            onClick = {
                                try {
                                    scope.launch {
                                        try {
                                            viewModel.completeSwap(
                                                targetId,
                                                (uiState.state as CustomerStatusRequestState.Swap).newTag
                                            )
                                            targetId = 0uL
                                        } catch (_: NumberFormatException) {
                                        }
                                    }
                                } catch (e: NumberFormatException) {
                                    e.printStackTrace()
                                }
                            }
                        ) {
                            Text("Confirm Swap", fontSize = 24.sp)
                        }
                    }

                    else -> {
                        Button(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            onClick = {
                                viewModel.startScan()
                                scanState.open()
                            }
                        ) {
                            Text("Scan", fontSize = 24.sp)
                        }

                        NfcScanDialog(
                            state = scanState,
                            onScan = { tag ->
                                scope.launch {
                                    viewModel.completeScan(tag.uid)
                                }
                            }
                        )
                    }
                }
            }
        )
    }
}
