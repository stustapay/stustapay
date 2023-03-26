package de.stustanet.stustapay.ui

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import de.stustanet.stustapay.net.HttpClient
import de.stustanet.stustapay.net.Response
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

@Composable
fun TestConnectionButton() {
    val ctx = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    Button(onClick = {
        coroutineScope.launch {
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
    val httpClient = HttpClient() { null }

    @Serializable
    data class HealthStatus(val status: String)

    val health: Response<HealthStatus> =
        httpClient.get("health", basePath = "http://10.150.9.92:8080")

    val result = when (health) {
        is Response.OK -> {
            "Status: ${health.data.status}"
        }
        is Response.Error.Msg -> {
            "Error: ${health.msg}"
        }
        is Response.Error.Exception -> {
            "Exception: ${health.throwable.localizedMessage}"
        }
    }

    Toast.makeText(ctx, result, Toast.LENGTH_LONG).show()
}