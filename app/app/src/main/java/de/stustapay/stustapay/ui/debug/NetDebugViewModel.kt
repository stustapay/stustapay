package de.stustapay.stustapay.ui.debug

import android.content.Context
import android.widget.Toast
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import de.stustapay.libssp.net.Response
import de.stustapay.stustapay.net.TerminalApiAccessor
import javax.inject.Inject

@HiltViewModel
class NetDebugViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val terminalApiAccessor: TerminalApiAccessor
) : ViewModel() {
    var endpointURL: String = "http://10.0.2.2:8080/"

    suspend fun announceHealthStatus() {
        val msg = when (val health = terminalApiAccessor.execute { it.base()?.health() }) {
            is Response.OK -> "Ok"
            is Response.Error -> health.msg()
        }

        Toast.makeText(
            context,
            msg,
            Toast.LENGTH_LONG
        ).show()
    }
}