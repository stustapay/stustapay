package de.stustanet.stustapay.ui

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material.Scaffold
import androidx.compose.material.ScaffoldState
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch


@Composable
fun NavScaffold(
    navigateTo: (NavDest) -> Unit = {},
    navigateBack: () -> Unit = {},
    title: @Composable () -> Unit,
    state: ScaffoldState = rememberScaffoldState(),
    hasDrawer: Boolean = false,
    content: @Composable (PaddingValues) -> Unit
) {
    val scope = rememberCoroutineScope()

    Scaffold(
        scaffoldState = state,
        topBar = {
            TopAppBar(
                title = title,
                iconType = if (hasDrawer) TopAppBarIcon.MENU else TopAppBarIcon.BACK,
            ) {
                if (hasDrawer) {
                    scope.launch {
                        state.drawerState.open()
                    }
                } else {
                    navigateBack()
                }
            }
        },

        drawerContent = {
            NavDrawer { navTo ->
                scope.launch {
                    state.drawerState.close()
                }
                navigateTo(navTo)
            }
        },

        content = content
    )
}