package de.stustapay.stustapay.ui.common

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.WindowManager
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

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

@Composable
fun KeepScreenOn() {
    val context = LocalContext.current
    DisposableEffect(Unit) {
        val window = context.findActivity()?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose {
            window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }
}

fun Context.findActivity(): Activity? {
    var context = this
    while (context is ContextWrapper) {
        if (context is Activity) return context
        context = context.baseContext
    }
    return null
}


open class MutexStateFlow {
    private val _status = MutableStateFlow(false)
    private val _lock = Mutex()

    val stateFlow = _status.asStateFlow()

    val isLocked get() = _lock.isLocked

    fun asStateFlow(): StateFlow<Boolean> {
        return stateFlow
    }

    protected open suspend fun <T> intercept(action: suspend () -> T): T {
        return action()
    }

    /** wait until lock is freed */
    suspend fun <T> withLock(action: suspend () -> T): T {
        return _lock.withLock {
            try {
                _status.value = true

                // Calls either the default execution or your overridden wrapper
                intercept(action)

            } finally {
                _status.value = false
            }
        }
    }
}