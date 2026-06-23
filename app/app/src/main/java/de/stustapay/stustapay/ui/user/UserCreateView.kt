package de.stustapay.stustapay.ui.user

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.ListItem
import androidx.compose.material.OutlinedTextField
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.model.NfcTag
import de.stustapay.libssp.ui.barcode.QRScanDialog
import de.stustapay.libssp.ui.common.rememberDialogDisplayState
import de.stustapay.stustapay.R
import de.stustapay.stustapay.model.UserCreateQRContent
import de.stustapay.stustapay.ui.chipscan.NfcScanCard
import de.stustapay.stustapay.ui.chipscan.rememberNfcScanDialogState
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserCreateView(viewModel: UserViewModel, goToUserDisplayView: () -> Unit) {
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var assignments by remember { mutableStateOf<NodeRoleAssignments>(emptyMap()) }
    var description by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val availableRolesByNode by viewModel.availableRolesByNode.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    var currentTagState: NfcTag? by remember { mutableStateOf(null) }
    val nfcScanState = rememberNfcScanDialogState()

    val _firstName = firstName.lowercase().replace(" ", "")
    val _lastName = lastName.lowercase().replace(" ", "")
    val userName = _firstName.replace("ü", "ue").replace("ö", "oe").replace("ä", "ae")
        .replace("ß", "ss") + "." + _lastName.replace("ü", "ue").replace("ö", "oe")
        .replace("ä", "ae").replace("ß", "ss")
    val displayName =
        _firstName.replaceFirstChar { it.uppercase() } + " " + _lastName.replaceFirstChar { it.uppercase() }

    val registerScanState = rememberDialogDisplayState()
    val context = LocalContext.current
    QRScanDialog(
        state = registerScanState, onScan = { qrcode ->
            try {
                val obj = Json.decodeFromString(UserCreateQRContent.serializer(), qrcode)
                firstName = obj.firstName ?: ""
                lastName = obj.lastName ?: ""
                description = obj.description ?: ""
            } catch (e: Exception) {
                Log.e("UserCreateView", "Failed to parse QR code: $qrcode", e)
                Toast.makeText(context, "QR has wrong format!", Toast.LENGTH_SHORT).show()
            }
        })

    val currentTag = currentTagState
    if (currentTag == null) {
        Scaffold(content = { padding ->
            Box(
                modifier = Modifier
                    .padding(padding)
                    .padding(20.dp)
            ) {
                NfcScanCard(
                    keepScanning = true, onScan = { tag ->
                        scope.launch {
                            if (viewModel.checkCreate(tag)) {
                                goToUserDisplayView()
                            } else {
                                currentTagState = tag
                            }
                        }
                    })
            }
        }, bottomBar = {
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
        })
    } else {
        nfcScanState.close()

        Scaffold(content = { padding ->
            Box(modifier = Modifier.padding(padding)) {
                val scroll = rememberScrollState()
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(state = scroll)
                        .padding(10.dp)
                ) {
                    ListItem(
                        text = { Text(stringResource(R.string.common_tag_pin)) },
                        secondaryText = { Text(currentTag.pin.orEmpty()) })

                    Divider()
                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        label = { Text(stringResource(R.string.user_firstname)) },
                        value = firstName,
                        onValueChange = { firstName = it },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    OutlinedTextField(
                        label = { Text(stringResource(R.string.user_lastname)) },
                        value = lastName,
                        onValueChange = { lastName = it },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    OutlinedTextField(
                        label = { Text(stringResource(R.string.user_username)) },
                        value = userName,
                        onValueChange = {},
                        modifier = Modifier.fillMaxWidth(),
                        enabled = false
                    )

                    OutlinedTextField(
                        label = { Text(stringResource(R.string.user_description)) },
                        value = description,
                        onValueChange = { description = it },
                        modifier = Modifier.fillMaxWidth(),
                    )

                    NodeRoleAssignmentEditor(
                        availableRolesByNode = availableRolesByNode,
                        assignments = assignments,
                        onAssignmentsChange = { assignments = it },
                    )
                }
            }
        }, bottomBar = {
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
                        .padding(horizontal = 10.dp), onClick = {
                        registerScanState.open()
                    }) {
                    Text(stringResource(R.string.user_load_data_from_qr), fontSize = 24.sp)
                }

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp), onClick = {
                        scope.launch {
                            viewModel.create(
                                userName,
                                displayName,
                                currentTag,
                                assignments.toRoleAssignmentPayloads(),
                                description
                            )
                            goToUserDisplayView()
                        }
                    }) {
                    Text(stringResource(R.string.common_action_create), fontSize = 24.sp)
                }
            }
        })
    }
}
