package de.stustapay.stustapay.ui.debug

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Router
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import de.stustapay.stustapay.ui.barcode.QRScanView
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.nav.NavDest
import de.stustapay.stustapay.ui.nav.NavDestinations

object DevelopNavDest : NavDestinations() {
    val main = NavDest("main", title = "Development")
    val net = NavDest("net", title = "Network")
    val qr = NavDest("qr", title = "QR Scan")
    val ec = NavDest("ec", title = "EC Payment")
}

@Preview
@Composable
fun DebugView(leaveView: () -> Unit = {}) {
    val nav = rememberNavController()

    NavHost(
        navController = nav,
        startDestination = DevelopNavDest.main.route,
        modifier = Modifier,
    ) {
        composable(DevelopNavDest.main.route) {
            DebugNavView(
                navigateBack = leaveView,
                onOpenNetwork = { nav.navigate(DevelopNavDest.net.route) },
                onOpenQr = { nav.navigate(DevelopNavDest.qr.route) },
                onOpenEc = { nav.navigate(DevelopNavDest.ec.route) },
            )
        }
        composable(DevelopNavDest.net.route) {
            NetDebugView(navigateBack = { nav.popBackStack() })
        }
        composable(DevelopNavDest.qr.route) {
            OperatorScaffold(
                title = "QR Scan",
                subtitle = "Live camera capture for registration and support codes.",
                icon = Icons.Filled.QrCodeScanner,
                terminalLabel = "Camera",
                footerHint = "The live camera preview remains unchanged; only the route shell now matches the new operator design.",
                footerSection = "Scanner",
                footerStatus = "Live",
                onBack = { nav.popBackStack() },
            ) {
                QRScanView()
            }
        }
        composable(DevelopNavDest.ec.route) {
            ECDebugView(navigateBack = { nav.popBackStack() })
        }
    }
}
