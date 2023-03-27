package de.stustanet.stustapay.ui.pref

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@Composable
internal fun CenterIcon(
    modifier: Modifier = Modifier,
    icon: @Composable (() -> Unit)? = null,
) {
    Box(
        modifier = modifier.size(64.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (icon != null) {
            CompositionLocalProvider(LocalContentAlpha provides ContentAlpha.medium) {
                icon()
            }
        }
    }
}


@Composable
internal fun CenterPadContent(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier.size(64.dp),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}

@Composable
internal fun RowScope.PrefTitle(
    title: @Composable () -> Unit,
    subtitle: @Composable (() -> Unit)?,
) {
    Column(
        modifier = Modifier.Companion.weight(1f),
        verticalArrangement = Arrangement.Center,
    ) {
        ProvideTextStyle(value = MaterialTheme.typography.subtitle1) {
            title()
        }
        if (subtitle != null) {
            Spacer(modifier = Modifier.size(2.dp))
            ProvideTextStyle(value = MaterialTheme.typography.caption) {
                CompositionLocalProvider(
                    LocalContentAlpha provides ContentAlpha.medium, content = subtitle
                )
            }
        }
    }
}


@Composable
internal fun PrefToggleable(
    modifier: Modifier = Modifier,
    state: MutableState<Boolean> = remember { mutableStateOf(true) },
    icon: @Composable (() -> Unit)? = null,
    title: @Composable () -> Unit,
    subtitle: @Composable (() -> Unit)? = null,
    onChange: (Boolean) -> Unit = {},
    role: Role,
    RoleElement: @Composable () -> Unit,
) {
    var value by state

    Surface {
        Row(
            modifier = modifier
                .fillMaxWidth()
                .toggleable(value = value, role = role, onValueChange = {
                    value = it
                    onChange(value)
                }),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CenterIcon(icon = icon)
            PrefTitle(title = title, subtitle = subtitle)
            CenterPadContent {
                RoleElement()
            }
        }
    }
}