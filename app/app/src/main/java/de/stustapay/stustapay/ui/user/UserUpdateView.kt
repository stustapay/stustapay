package de.stustapay.stustapay.ui.user

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.tagIDtoString
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun UserUpdateView(viewModel: UserViewModel, goToUserDisplayView: () -> Unit) {
    var assignments by remember { mutableStateOf<NodeRoleAssignments>(emptyMap()) }
    val scope = rememberCoroutineScope()
    val availableRolesByNode by viewModel.availableRolesByNode.collectAsStateWithLifecycle()
    val status by viewModel.status.collectAsStateWithLifecycle()
    val currentUser by viewModel.currentUser.collectAsStateWithLifecycle()
    val currentTag by viewModel.currentTag.collectAsStateWithLifecycle()
    val isEditingSelf by viewModel.isEditingSelf.collectAsStateWithLifecycle()
    val currentTagV = currentTag

    val currentUserV = currentUser
    if (currentUserV == null) {
        Text("current user is null")
        return
    }

    val editableNodeIds = availableRolesByNode.map { it.nodeId }.toSet()

    LaunchedEffect(currentUserV, availableRolesByNode) {
        assignments = nodeRoleAssignmentsFromAssignedRoles(
            assignedRoles = currentUserV.assignedRoles,
            editableNodeIds = editableNodeIds,
        )
    }

    val readOnlyAssignments = currentUserV.assignedRoles.filter { !editableNodeIds.contains(it.nodeId) }

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
                    text = { Text(stringResource(R.string.common_tag_id)) },
                    secondaryText = {
                        Text(
                            if (currentTagV != null) {
                                tagIDtoString(currentTagV.uid.ulongValue(true))
                            } else {
                                "unknown"
                            }
                        )
                    })
                ListItem(
                    text = { Text(stringResource(R.string.user_username)) },
                    secondaryText = { Text(currentUserV.login) })
                ListItem(
                    text = { Text(stringResource(R.string.user_displayname)) },
                    secondaryText = { Text(currentUserV.displayName) })
                if (!currentUserV.description.isNullOrEmpty()) {
                ListItem(
                    text = { Text(stringResource(R.string.user_description)) },
                    secondaryText = { Text(currentUserV.description ?: "") })
                }

                if (isEditingSelf) {
                    Divider(modifier = Modifier.padding(top = 12.dp, bottom = 8.dp))
                    Text(
                        text = stringResource(R.string.user_roles),
                        fontSize = 18.sp,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    for (role in currentUserV.assignedRoles) {
                        ListItem(
                            text = { Text(role.name) },
                            secondaryText = { Text(role.nodeName) },
                        )
                    }
                    Text(
                        text = stringResource(R.string.user_roles_self_read_only),
                        fontSize = 16.sp,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                } else {
                    NodeRoleAssignmentEditor(
                        availableRolesByNode = availableRolesByNode,
                        assignments = assignments,
                        onAssignmentsChange = { assignments = it },
                        readOnlyAssignments = readOnlyAssignments,
                    )
                }
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
                Spacer(modifier = Modifier.height(10.dp))
            }
            Spacer(modifier = Modifier.height(10.dp))

            if (!isEditingSelf) {
                Button(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(10.dp),
                    onClick = {
                        scope.launch {
                            if (viewModel.update(
                                    currentTagV,
                                    assignments.toRoleAssignmentPayloads(),
                                )
                            ) {
                                goToUserDisplayView()
                            }
                        }
                    }) {
                    Text(text = stringResource(R.string.common_action_update), fontSize = 24.sp)
                }
            }
        }
    })
}
