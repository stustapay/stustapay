package de.stustapay.stustapay.ui.user

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Button
import androidx.compose.material.Card
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.ionspin.kotlin.bignum.integer.BigInteger
import com.ionspin.kotlin.bignum.integer.toBigInteger
import de.stustapay.stustapay.R
import de.stustapay.api.models.UserRole
import de.stustapay.stustapay.model.UserRolesState
import de.stustapay.api.models.UserTag


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
                        id = 1.toBigInteger(),
                        privileges = listOf(),
                        nodeId = 0.toBigInteger()
                    ),
                    UserRole(
                        name = "Boring Hacker",
                        id = 2.toBigInteger(),
                        privileges = listOf(),
                        nodeId = 0.toBigInteger()
                    ),
                    UserRole(
                        name = "Retired Hacker",
                        id = 3.toBigInteger(),
                        privileges = listOf(),
                        nodeId = 0.toBigInteger()
                    )
                ),
                tag = UserTag(0u.toBigInteger()),
            ),
        )
    }
}

@Composable
fun RoleSelectionDialog(
    roles: UserRolesState,
    onSelect: (roleID: BigInteger) -> Unit = {},
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
    onSelect: (roleID: BigInteger) -> Unit = {},
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
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 15.dp),
                text = stringResource(R.string.user_role_select),
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
                Text(stringResource(R.string.common_action_cancel), fontSize = 24.sp)
            }
        }

    }
}


@Composable
fun RoleButtonList(
    modifier: Modifier = Modifier,
    roles: UserRolesState,
    onSelect: (roleID: BigInteger) -> Unit,
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