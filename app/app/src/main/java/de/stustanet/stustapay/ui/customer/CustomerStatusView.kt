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
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.chipscan.NfcScanCard
import de.stustanet.stustapay.ui.chipscan.NfcScanDialog
import de.stustanet.stustapay.ui.chipscan.rememberNfcScanDialogState
import de.stustanet.stustapay.ui.common.TagTextField
import de.stustanet.stustapay.ui.nav.NavScaffold
import de.stustanet.stustapay.ui.nav.navigateTo
import kotlinx.coroutines.launch
import java.text.DecimalFormat

@Preview
@Composable
fun CustomerStatusView(
    leaveView: () -> Unit = {},
    viewModel: CustomerStatusViewModel = hiltViewModel(),
) {
    val nav = rememberNavController()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val swapVisible by viewModel.swapVisible.collectAsStateWithLifecycle()
    val scanState = rememberNfcScanDialogState()
    val newTagId by viewModel.newTagId.collectAsStateWithLifecycle()
    val oldTagId by viewModel.oldTagId.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    NavScaffold(title = { Text("Account Status") }, navigateBack = leaveView) {
        NavHost(navController = nav, startDestination = CustomerStatusNavDests.Scan.route) {
            composable(CustomerStatusNavDests.Scan.route) {
                Box(modifier = Modifier.padding(20.dp)) {
                    NfcScanCard(onScan = {
                        scope.launch {
                            viewModel.setNewTagId(it.uid)
                            nav.navigateTo(CustomerStatusNavDests.Display.route)
                        }
                    })
                }
            }

            composable(CustomerStatusNavDests.Display.route) {
                Scaffold(
                    content = {
                        Box(modifier = Modifier.padding(it)) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(10.dp)
                            ) {
                                if (uiState.customer is CustomerStatusRequestState.Done) {
                                    val customer = (uiState.customer as CustomerStatusRequestState.Done).customer

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
                            }
                        }
                    },
                    bottomBar = {
                        Column {
                            Spacer(modifier = Modifier.height(20.dp))
                            Divider()
                            Spacer(modifier = Modifier.height(20.dp))
                            Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                                val text = when (val state = uiState.customer) {
                                    is CustomerStatusRequestState.Idle -> {
                                        "idle"
                                    }
                                    is CustomerStatusRequestState.Fetching -> {
                                        "fetching"
                                    }
                                    is CustomerStatusRequestState.Done -> {
                                        "done"
                                    }
                                    is CustomerStatusRequestState.Failed -> {
                                        state.msg
                                    }
                                }
                                Text(text, fontSize = 24.sp)
                            }
                            Spacer(modifier = Modifier.height(20.dp))

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp)
                            ) {
                                Button(
                                    modifier = Modifier
                                        .weight(1.0f),
                                    onClick = {
                                        viewModel.idleState()
                                        nav.navigateTo(CustomerStatusNavDests.Scan.route)
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
                                            viewModel.idleState()
                                            nav.navigateTo(CustomerStatusNavDests.Swap.route)
                                        }
                                    ) {
                                        Text("Swap", fontSize = 24.sp)
                                    }
                                }
                            }
                        }
                    }
                )
            }

            composable(CustomerStatusNavDests.Swap.route) {
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
                                        "New Tag",
                                        fontSize = 48.sp,
                                        modifier = Modifier.padding(end = 20.dp)
                                    )
                                    TagTextField(
                                        newTagId,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {id ->
                                        if (id != null) {
                                            scope.launch {
                                                viewModel.setNewTagId(id)
                                            }
                                        }
                                    }
                                }

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
                                        oldTagId,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {id ->
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
                                    Text("Scan Old Tag", fontSize = 24.sp)
                                }

                                NfcScanDialog(state = scanState, onScan = { tag ->
                                    viewModel.setOldTagId(tag.uid)
                                })
                            }
                        }
                    },
                    bottomBar = {
                        Column() {
                            Spacer(modifier = Modifier.height(20.dp))
                            Divider()
                            Spacer(modifier = Modifier.height(20.dp))
                            Box(modifier = Modifier.padding(start = 10.dp, end = 10.dp)) {
                                val text = when (val state = uiState.customer) {
                                    is CustomerStatusRequestState.Idle -> {
                                        "idle"
                                    }
                                    is CustomerStatusRequestState.Fetching -> {
                                        "swapping"
                                    }
                                    is CustomerStatusRequestState.Done -> {
                                        "done"
                                    }
                                    is CustomerStatusRequestState.Failed -> {
                                        state.msg
                                    }
                                }
                                Text(text, fontSize = 24.sp)
                            }
                            Spacer(modifier = Modifier.height(20.dp))

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp)
                            ) {
                                Button(
                                    modifier = Modifier
                                        .weight(1.0f),
                                    onClick = {
                                        viewModel.idleState()
                                        nav.navigateTo(CustomerStatusNavDests.Scan.route)
                                    }
                                ) {
                                    Text("Cancel", fontSize = 24.sp)
                                }

                                Button(
                                    modifier = Modifier
                                        .weight(1.0f)
                                        .padding(start = 10.dp),
                                    onClick = {
                                        scope.launch {
                                            viewModel.swap()
                                        }
                                    }
                                ) {
                                    Text("Swap", fontSize = 24.sp)
                                }
                            }
                        }
                    }
                )
            }
        }
    }
}

enum class CustomerStatusNavDests(val route: String) {
    Scan("scan"),
    Display("display"),
    Swap("swap"),
}
