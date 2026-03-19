package de.stustapay.stustapay.ui.debug

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Router
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.stustapay.stustapay.ui.common.operator.OperatorActionCard
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold

@Composable
fun DebugNavView(
    navigateBack: () -> Unit,
    onOpenNetwork: () -> Unit,
    onOpenQr: () -> Unit,
    onOpenEc: () -> Unit,
) {
    OperatorScaffold(
        title = "Development",
        subtitle = "Diagnostics menu for internal tools and hardware checks.",
        icon = Icons.Filled.Router,
        terminalLabel = "Internal",
        footerHint = "Routes into Network, QR Scan, and EC Payment tools without changing the underlying diagnostics.",
        footerSection = "Tools",
        footerStatus = "3 routes",
        onBack = navigateBack,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                OperatorActionCard(
                    title = "Network",
                    description = "Edit the endpoint URL and run a health test against the configured backend.",
                    icon = Icons.Filled.Router,
                    onClick = onOpenNetwork,
                    modifier = Modifier.weight(1f),
                )
                OperatorActionCard(
                    title = "QR Scan",
                    description = "Open the live camera scanner used for registration and debug payloads.",
                    icon = Icons.Filled.QrCodeScanner,
                    onClick = onOpenQr,
                    modifier = Modifier.weight(1f),
                )
            }
            OperatorActionCard(
                title = "EC Payment",
                description = "Test SumUp login, reader settings, and checkout return handling.",
                icon = Icons.Filled.CreditCard,
                onClick = onOpenEc,
                modifier = Modifier.fillMaxWidth(),
                emphasized = true,
            )
        }
    }
}
