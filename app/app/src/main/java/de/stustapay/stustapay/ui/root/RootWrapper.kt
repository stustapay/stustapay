package de.stustapay.stustapay.ui.root
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.ui.common.selfservice.ObserveAppDisplayMode


@Composable
fun RootWrapper(
    viewModel: RootWrapperViewModel = hiltViewModel(), content: @Composable () -> Unit
) {
    val infallibleVisible by viewModel.infallibleVisible.collectAsStateWithLifecycle()
    val managedAppDisplayMode by viewModel.managedAppDisplayMode.collectAsStateWithLifecycle()
    ObserveAppDisplayMode(managedDisplayMode = managedAppDisplayMode)
    RootWrapperContent(infallibleVisible, content)
}


@Composable
fun RootWrapperContent(infallibleVisible: Boolean, content: @Composable () -> Unit) {
    if (infallibleVisible) {
        InfallibleError()
    } else {
        content()
    }
}
