package de.stustanet.stustapay.ui.pref

import androidx.compose.material.Switch
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role

@Composable
fun PrefSwitch(
    modifier: Modifier = Modifier,
    state: MutableState<Boolean> = remember { mutableStateOf(true) },
    icon: @Composable (() -> Unit)? = null,
    title: @Composable () -> Unit,
    subtitle: @Composable (() -> Unit)? = null,
    onChange: (Boolean) -> Unit = {},
) {
    PrefToggleable(modifier, state, icon, title, subtitle, onChange, Role.Switch) {
        Switch(
            checked = state.value,
            onCheckedChange = null
        )
    }
}
