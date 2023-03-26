package de.stustanet.stustapay.ui.debug

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import kotlinx.coroutines.launch

@Composable
fun EndpointInput(viewModel: DebugViewModel?) {
    TextField(value = viewModel?.endpointURL ?: "asdf", onValueChange = {
        viewModel!!.endpointURL = it
    })
}

@Composable
fun TestConnectionButton(viewModel: DebugViewModel?) {
    val coroutineScope = rememberCoroutineScope()

    Button(onClick = {
        coroutineScope.launch {
            viewModel!!.announceHealthStatus()
        }
    }) {
        Text(text = "Test Connection")
    }
}

@Preview
@Composable
fun DebugView(viewModel: DebugViewModel? = null) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        EndpointInput(viewModel = viewModel)
        TestConnectionButton(viewModel)
    }
}