package de.stustanet.stustapay.ui.debug

import android.content.Context
import android.widget.Toast
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import de.stustanet.stustapay.net.Response
import de.stustanet.stustapay.net.TerminalAPI
import javax.inject.Inject

@HiltViewModel
class DebugViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val terminalAPI: TerminalAPI
) : ViewModel() {
    var endpointURL: String = "http://10.0.2.2:8080/"

    suspend fun announceHealthStatus() {
        val health = terminalAPI.getHealthStatus(endpointURL)

        val msg = when (health) {
            is Response.OK -> health.data.status
            is Response.Error -> health.msg()
        }

        Toast.makeText(
            context,
            msg,
            Toast.LENGTH_LONG
        ).show()
    }
}