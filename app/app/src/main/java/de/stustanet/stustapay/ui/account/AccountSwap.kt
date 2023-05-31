package de.stustanet.stustapay.ui.account

import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustanet.stustapay.R
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.TagTextField
import kotlinx.coroutines.launch

@Composable
fun AccountSwap(goBack: () -> Unit, viewModel: AccountViewModel) {
    val scanState = rememberNfcScanDialogState()
    val newTagId by viewModel.newTagId.collectAsStateWithLifecycle()
    val oldTagId by viewModel.oldTagId.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var comment by remember { mutableStateOf("") }

    NfcScanDialog(state = scanState, onScan = { tag ->
        viewModel.setOldTagId(tag.uid)
    })

    Scaffold(
        content = {
            Box(modifier = Modifier.padding(it)) {
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
                            stringResource(R.string.customer_newtag),
                            fontSize = 24.sp,
                            modifier = Modifier.padding(end = 20.dp)
                        )
                        TagTextField(
                            newTagId,
                            modifier = Modifier.fillMaxWidth(),
                        ) { id ->
                            if (id != null) {
                                scope.launch {
                                    viewModel.setNewTagId(id)
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
                            stringResource(R.string.customer_oldtag),
                            fontSize = 24.sp,
                            modifier = Modifier.padding(end = 20.dp)
                        )
                        TagTextField(
                            oldTagId,
                            modifier = Modifier.fillMaxWidth(),
                        ) { id ->
                            if (id != null) {
                                viewModel.setOldTagId(id)
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
                        Text(stringResource(R.string.customer_scanoldtag), fontSize = 24.sp)
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
                            stringResource(R.string.customer_comment),
                            fontSize = 24.sp,
                            modifier = Modifier.padding(end = 20.dp)
                        )
                        TextField(
                            value = comment,
                            onValueChange = { text -> comment = text },
                            singleLine = true
                        )
                    }
                }
            }
        },
        bottomBar = {
            Column() {
                Spacer(modifier = Modifier.height(10.dp))
                Divider()
                Spacer(modifier = Modifier.height(10.dp))
                Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                    val text = when (val state = uiState.customer) {
                        is CustomerStatusRequestState.Idle -> {
                            stringResource(R.string.common_status_idle)
                        }
                        is CustomerStatusRequestState.Fetching -> {
                            stringResource(R.string.common_status_fetching)
                        }
                        is CustomerStatusRequestState.Done -> {
                            stringResource(R.string.common_status_done)
                        }
                        is CustomerStatusRequestState.Failed -> {
                            state.msg
                        }
                    }
                    Text(text, fontSize = 24.sp)
                }
                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp)
                ) {
                    Button(
                        modifier = Modifier
                            .weight(1.0f),
                        onClick = {
                            goBack()
                        }
                    ) {
                        Text(stringResource(R.string.common_action_cancel), fontSize = 24.sp)
                    }

                    Button(
                        modifier = Modifier
                            .weight(1.0f)
                            .padding(start = 10.dp),
                        onClick = {
                            scope.launch {
                                viewModel.swap(comment)
                            }
                        }
                    ) {
                        Text(stringResource(R.string.customer_swap), fontSize = 24.sp)
                    }
                }
            }
        }
    )
}