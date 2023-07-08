package de.stustapay.stustapay.ui.nav

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Scaffold
import androidx.compose.material.ScaffoldState
import androidx.compose.material.Text
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview


@Composable
fun NavScaffold(
    navigateBack: () -> Unit = {},
    title: @Composable () -> Unit,
    state: ScaffoldState = rememberScaffoldState(),
    bottomBar: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        scaffoldState = state,
        topBar = {
            TopAppBar(
                title = title,
                icon = TopAppBarIcon(type = TopAppBarIcon.Type.BACK) {
                    navigateBack()
                },
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
        },
        
        bottomBar = bottomBar,
    )
}

@Preview
@Composable
fun PreviewNavScaffold() {
    var counter by remember { mutableStateOf(0) }

    NavScaffold(
        navigateBack = {
            counter += 1
        },
        title = {
            Text("stuff")
        }
    ) {
        Text("content: $counter")
    }
}