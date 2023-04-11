package de.stustanet.stustapay.ui.debug

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustanet.stustapay.ui.barcode.QRScanView
import de.stustanet.stustapay.ui.nav.NavDest
import de.stustanet.stustapay.ui.nav.NavDestinations
import de.stustanet.stustapay.ui.nav.NavScaffold

object DevelopNavDest : NavDestinations() {
    val main = NavDest("main", title = "Development")
    val net = NavDest("net", title = "Network")
    val nfc = NavDest("nfc", title = "NFC")
    val qr = NavDest("qr", title = "QR Scan")
    val ec = NavDest("ec", title = "EC Payment")
}

@Preview
@Composable
fun DebugView(leaveView: () -> Unit = {}) {

    val nav = rememberNavController()
    val scaffoldState = rememberScaffoldState()

    NavScaffold(
        title = { Text(text = DevelopNavDest.title(nav) ?: "Development") },
        state = scaffoldState,
        navigateBack = {
            if (nav.currentDestination?.route == DevelopNavDest.main.route) {
                leaveView()
            } else {
                nav.popBackStack()
            }
        },
    ) { paddingValues ->
        NavHost(
            navController = nav,
            startDestination = DevelopNavDest.main.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = paddingValues.calculateBottomPadding())
        ) {
            composable(DevelopNavDest.main.route) {
                DebugNavView(nav)
            }
            composable(DevelopNavDest.net.route) {
                NetDebugView()
            }
            composable(DevelopNavDest.nfc.route) {
                NfcDebugView()
            }
            composable(DevelopNavDest.qr.route) {
                QRScanView()
            }
            composable(DevelopNavDest.ec.route) {
                ECDebugView()
            }
        }
    }
}