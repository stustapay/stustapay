package de.stustapay.stustapay.ui.root
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle


@Composable
fun RootWrapper(
    viewModel: RootWrapperViewModel = hiltViewModel(), content: @Composable () -> Unit
) {
    val infallibleVisible by viewModel.infallibleVisible.collectAsStateWithLifecycle()
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
