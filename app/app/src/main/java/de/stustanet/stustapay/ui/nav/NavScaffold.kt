package de.stustanet.stustapay.ui.nav

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Scaffold
import androidx.compose.material.ScaffoldState
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier


@Composable
fun NavScaffold(
    navigateBack: () -> Unit = {},
    title: @Composable () -> Unit,
    state: ScaffoldState = rememberScaffoldState(),
    content: @Composable (PaddingValues) -> Unit
) {
    Scaffold(
        scaffoldState = state,
        topBar = {
            TopAppBar(
                title = title,
                icon = TopAppBarIcon(type = TopAppBarIcon.Type.BACK) { navigateBack() },
            )
        },

        content = { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                content(innerPadding)
            }
        }
    )
}