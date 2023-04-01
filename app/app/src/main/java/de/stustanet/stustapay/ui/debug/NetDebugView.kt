package de.stustanet.stustapay.ui.debug

import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch

@Composable
fun NetDebugView(viewModel: NetDebugViewModel = hiltViewModel()) {
    val coroutineScope = rememberCoroutineScope()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(text = "API Health Status", fontSize = 24.sp)

        Row(
            modifier = Modifier.fillMaxWidth().padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextField(
                value = viewModel.endpointURL,
                onValueChange = {
                    viewModel.endpointURL = it
                }
            )
            Button(
                modifier = Modifier.padding(8.dp),
                onClick = {
                    coroutineScope.launch {
                        viewModel.announceHealthStatus()
                    }
                }
            ) {
                Text(text = "Test")
            }
        }
    }
}