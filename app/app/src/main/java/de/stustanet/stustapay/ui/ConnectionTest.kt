package de.stustanet.stustapay.ui

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import de.stustanet.stustapay.net.Network
import kotlinx.coroutines.runBlocking

@Composable
fun TestConnectionButton() {
    val ctx = LocalContext.current
    Button(onClick = {
        runBlocking {
            testConnection(ctx)
        }
    }) {
        Text(text = "Test Connection")
    }
}

@Preview
@Composable
fun TestConnectionView() {
    Row(
        modifier = Modifier.fillMaxSize(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        TestConnectionButton()
    }
}

suspend fun testConnection(ctx: Context) {
    Toast.makeText(ctx, Network.getHealthStatus(), Toast.LENGTH_SHORT).show()
}