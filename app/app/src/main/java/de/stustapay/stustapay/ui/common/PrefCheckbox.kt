package de.stustapay.stustapay.ui.common

import androidx.compose.material.Checkbox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role

@Composable
fun PrefCheckbox(
    modifier: Modifier = Modifier,
    state: MutableState<Boolean> = remember { mutableStateOf(true) },
    icon: @Composable (() -> Unit)? = null,
    title: @Composable () -> Unit,
    subtitle: @Composable (() -> Unit)? = null,
    onChange: (Boolean) -> Unit = {},
) {
    PrefToggleable(modifier, state, icon, title, subtitle, onChange, Role.Checkbox) {
        Checkbox(
            checked = state.value,
            onCheckedChange = null
        )
    }
}

