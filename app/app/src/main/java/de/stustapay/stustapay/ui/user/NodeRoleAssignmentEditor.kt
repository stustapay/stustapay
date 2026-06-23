package de.stustapay.stustapay.ui.user

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Card
import androidx.compose.material.Divider
import androidx.compose.material.DropdownMenuItem
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.ExposedDropdownMenuBox
import androidx.compose.material.ExposedDropdownMenuDefaults
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.ListItem
import androidx.compose.material.OutlinedTextField
import androidx.compose.material.Text
import androidx.compose.material.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ionspin.kotlin.bignum.integer.BigInteger
import de.stustapay.api.models.AssignableUserRolesAtNode
import de.stustapay.api.models.UserRole
import de.stustapay.api.models.UserRoleAssignmentPayload
import de.stustapay.api.models.UserRoleInfo
import de.stustapay.stustapay.R

typealias NodeRoleAssignments = Map<BigInteger, Set<BigInteger>>

private data class AssignmentRow(
    val nodeId: BigInteger?,
    val roleIds: Set<BigInteger>,
)

fun nodeRoleAssignmentsFromAssignedRoles(
    assignedRoles: List<UserRoleInfo>,
    editableNodeIds: Set<BigInteger>,
): NodeRoleAssignments {
    return assignedRoles
        .filter { editableNodeIds.contains(it.nodeId) }
        .groupBy { it.nodeId }
        .mapValues { (_, roles) -> roles.map { it.id }.toSet() }
}

fun NodeRoleAssignments.toRoleAssignmentPayloads(): List<UserRoleAssignmentPayload> {
    return map { (nodeId, roleIds) ->
        UserRoleAssignmentPayload(nodeId = nodeId, roleIds = roleIds.toList())
    }.filter { it.roleIds.isNotEmpty() }
}

private fun assignmentsToRows(assignments: NodeRoleAssignments): List<AssignmentRow> {
    if (assignments.isEmpty()) {
        return listOf(AssignmentRow(nodeId = null, roleIds = emptySet()))
    }
    return assignments.map { (nodeId, roleIds) ->
        AssignmentRow(nodeId = nodeId, roleIds = roleIds)
    }
}

private fun rowsToAssignments(rows: List<AssignmentRow>): NodeRoleAssignments {
    return rows
        .filter { it.nodeId != null }
        .associate { row -> row.nodeId!! to row.roleIds }
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun NodeRoleAssignmentEditor(
    availableRolesByNode: List<AssignableUserRolesAtNode>,
    assignments: NodeRoleAssignments,
    onAssignmentsChange: (NodeRoleAssignments) -> Unit,
    readOnlyAssignments: List<UserRoleInfo> = emptyList(),
    modifier: Modifier = Modifier,
) {
    var rows by remember { mutableStateOf(assignmentsToRows(assignments)) }

    LaunchedEffect(assignments) {
        if (rowsToAssignments(rows) != assignments) {
            rows = assignmentsToRows(assignments)
        }
    }

    fun updateRows(newRows: List<AssignmentRow>) {
        rows = newRows
        onAssignmentsChange(rowsToAssignments(newRows))
    }

    Column(modifier = modifier) {
        Divider(modifier = Modifier.padding(top = 12.dp, bottom = 8.dp))
        Text(
            text = stringResource(R.string.user_roles),
            fontSize = 18.sp,
            modifier = Modifier.padding(bottom = 8.dp),
        )

        Card(
            shape = RoundedCornerShape(8.dp),
            elevation = 2.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                for ((index, row) in rows.withIndex()) {
                    val selectedNodeIdsInOtherRows = rows
                        .filterIndexed { rowIndex, _ -> rowIndex != index }
                        .mapNotNull { it.nodeId }
                        .toSet()
                    val selectableNodes = availableRolesByNode.filter { nodeGroup ->
                        nodeGroup.nodeId !in selectedNodeIdsInOtherRows || nodeGroup.nodeId == row.nodeId
                    }
                    val selectedNodeGroup = availableRolesByNode.find { it.nodeId == row.nodeId }

                    if (index > 0) {
                        Divider(modifier = Modifier.padding(vertical = 8.dp))
                    }

                    NodeAssignmentRow(
                        selectableNodes = selectableNodes,
                        selectedNodeName = selectedNodeGroup?.nodeName.orEmpty(),
                        roles = selectedNodeGroup?.roles.orEmpty(),
                        selectedRoleIds = row.roleIds,
                        onNodeChange = { nodeId ->
                            val updated = rows.toMutableList()
                            updated[index] = AssignmentRow(nodeId = nodeId, roleIds = emptySet())
                            updateRows(updated)
                        },
                        onRoleSelectionChange = { roleIds ->
                            val updated = rows.toMutableList()
                            updated[index] = row.copy(roleIds = roleIds)
                            updateRows(updated)
                        },
                        onRemove = if (rows.size > 1) {
                            {
                                val updated = rows.toMutableList()
                                updated.removeAt(index)
                                updateRows(updated)
                            }
                        } else {
                            null
                        },
                    )
                }

                if (rows.size < availableRolesByNode.size) {
                    TextButton(
                        onClick = {
                            updateRows(rows + AssignmentRow(nodeId = null, roleIds = emptySet()))
                        },
                        modifier = Modifier.padding(top = 4.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.user_add_node_role_assignment),
                            fontSize = 16.sp,
                        )
                    }
                }
            }
        }

        val editableNodeIds = availableRolesByNode.map { it.nodeId }.toSet()
        val lockedAssignments = readOnlyAssignments.filter { !editableNodeIds.contains(it.nodeId) }
        if (lockedAssignments.isNotEmpty()) {
            Divider(modifier = Modifier.padding(vertical = 8.dp))
            Text(
                text = stringResource(R.string.user_roles_read_only),
                fontSize = 18.sp,
                modifier = Modifier.padding(bottom = 4.dp),
            )
            for (role in lockedAssignments) {
                ListItem(
                    text = { Text(role.name) },
                    secondaryText = { Text(role.nodeName) },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
private fun NodeAssignmentRow(
    selectableNodes: List<AssignableUserRolesAtNode>,
    selectedNodeName: String,
    roles: List<UserRole>,
    selectedRoleIds: Set<BigInteger>,
    onNodeChange: (BigInteger) -> Unit,
    onRoleSelectionChange: (Set<BigInteger>) -> Unit,
    onRemove: (() -> Unit)?,
) {
    Column(modifier = Modifier.padding(bottom = 10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            NodeDropdown(
                selectableNodes = selectableNodes,
                selectedNodeName = selectedNodeName,
                onNodeChange = onNodeChange,
                modifier = Modifier.weight(1f),
            )
            if (onRemove != null) {
                IconButton(onClick = onRemove) {
                    Icon(
                        painter = painterResource(de.stustapay.libssp.R.drawable.close_24),
                        contentDescription = stringResource(R.string.user_remove_node_role_assignment),
                    )
                }
            }
        }

        if (selectedNodeName.isNotEmpty()) {
            NodeRoleDropdown(
                nodeName = selectedNodeName,
                roles = roles,
                selectedRoleIds = selectedRoleIds,
                onSelectionChange = onRoleSelectionChange,
            )
        }
    }
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
private fun NodeDropdown(
    selectableNodes: List<AssignableUserRolesAtNode>,
    selectedNodeName: String,
    onNodeChange: (BigInteger) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier.padding(bottom = 10.dp),
    ) {
        OutlinedTextField(
            label = { Text(stringResource(R.string.user_select_node)) },
            readOnly = true,
            value = selectedNodeName,
            onValueChange = {},
            trailingIcon = {
                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
            },
            modifier = Modifier.fillMaxWidth(),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            for (nodeGroup in selectableNodes) {
                DropdownMenuItem(onClick = {
                    onNodeChange(nodeGroup.nodeId)
                    expanded = false
                }) {
                    Text(nodeGroup.nodeName)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterialApi::class)
@Composable
private fun NodeRoleDropdown(
    nodeName: String,
    roles: List<UserRole>,
    selectedRoleIds: Set<BigInteger>,
    onSelectionChange: (Set<BigInteger>) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedNames = roles
        .filter { selectedRoleIds.contains(it.id) }
        .map { it.name }
        .reduceOrNull { acc, name -> "$acc, $name" }
        .orEmpty()

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = Modifier.fillMaxWidth(),
    ) {
        OutlinedTextField(
            label = { Text(stringResource(R.string.user_roles_at_node, nodeName)) },
            readOnly = true,
            value = selectedNames,
            onValueChange = {},
            trailingIcon = {
                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
            },
            modifier = Modifier.fillMaxWidth(),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            for (role in roles) {
                DropdownMenuItem(onClick = {
                    val updated = if (selectedRoleIds.contains(role.id)) {
                        selectedRoleIds - role.id
                    } else {
                        selectedRoleIds + role.id
                    }
                    onSelectionChange(updated)
                }) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(role.name)
                        if (selectedRoleIds.contains(role.id)) {
                            Icon(
                                painter = painterResource(de.stustapay.libssp.R.drawable.check_24),
                                contentDescription = null,
                            )
                        }
                    }
                }
            }
        }
    }
}
