package de.stustanet.stustapay.ui.user

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.style.TextAlign
import de.stustanet.stustapay.model.UserRole
import de.stustanet.stustapay.model.UserRolesState
import de.stustanet.stustapay.model.UserTag


@Preview
@Composable
fun PreviewRoleSelectionDialog() {
    Box(
        contentAlignment = Alignment.Center,
    ) {
        RoleSelectionCard(
            roles = UserRolesState.OK(
                roles = listOf(
                    UserRole(
                        name = "Crazy Hacker",
                        id = 1,
                        privileges = listOf()
                    ),
                    UserRole(
                        name = "Boring Hacker",
                        id = 2,
                        privileges = listOf(),
                    ),
                    UserRole(
                        name = "Retired Hacker",
                        id = 3,
                        privileges = listOf(),
                    )
                ),
                tag = UserTag(0u),
            ),
        )
    }
}

@Composable
fun RoleSelectionDialog(
    roles: UserRolesState,
    onSelect: (roleID: Int) -> Unit = {},
    onDismiss: () -> Unit = {},
) {
    Dialog(
        onDismissRequest = {
            onDismiss()
        },
    ) {
        RoleSelectionCard(
            roles = roles,
            onSelect = onSelect,
            onDismiss = onDismiss,
        )
    }
}


@Composable
fun RoleSelectionCard(
    roles: UserRolesState,
    onSelect: (roleID: Int) -> Unit = {},
    onDismiss: () -> Unit = {},
) {
    val haptic = LocalHapticFeedback.current

    Card(
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier
            .padding(10.dp, 30.dp)
            .fillMaxWidth(),
        elevation = 8.dp,
    ) {
        Column(
            modifier = Modifier
                .padding(10.dp)
                .fillMaxWidth(),
        ) {
            Text(
                modifier = Modifier.fillMaxWidth().padding(bottom = 15.dp),
                text = "Select login role:",
                textAlign = TextAlign.Center,
                fontSize = 30.sp,
            )
            RoleButtonList(
                modifier = Modifier.fillMaxWidth(),
                roles = roles,
                onSelect = onSelect
            )
            Button(
                modifier = Modifier
                    .padding(10.dp, 0.dp)
                    .padding(top = 20.dp)
                    .fillMaxWidth(),
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onDismiss()
                }
            ) {
                // Leftwards arrow
                Text(text = "← Back", fontSize = 24.sp)
            }
        }

    }
}


@Composable
fun RoleButtonList(
    modifier: Modifier = Modifier,
    roles: UserRolesState,
    onSelect: (roleID: Int) -> Unit,
) {
    when (roles) {
        is UserRolesState.Unknown -> {
            Text("Loading roles...", fontSize = 20.sp, textAlign = TextAlign.Center)
        }

        is UserRolesState.Error -> {
            Text(roles.msg, fontSize = 20.sp)
        }

        is UserRolesState.OK -> {
            LazyColumn(modifier = modifier) {
                for (role in roles.roles) {
                    item {
                        Button(
                            modifier = Modifier.fillMaxWidth(),
                            onClick = { onSelect(role.id) }
                        ) {
                            Text(text = role.name, fontSize = 24.sp)
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                    }
                }
            }
        }
    }
}