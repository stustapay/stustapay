package de.stustapay.stustapay.ui.debug

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NetworkCheck
import androidx.compose.material.icons.filled.Router
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import kotlinx.coroutines.launch

@Composable
fun NetDebugView(
    navigateBack: () -> Unit,
    viewModel: NetDebugViewModel = hiltViewModel(),
) {
    val coroutineScope = rememberCoroutineScope()

    OperatorScaffold(
        title = "Network",
        subtitle = "API health test against the configured server endpoint.",
        icon = Icons.Filled.Router,
        terminalLabel = "Diagnostics",
        footerHint = "Keeps the real NetDebugView behavior: editable endpoint URL plus a single test action.",
        footerSection = "Network",
        footerStatus = "Endpoint",
        onBack = navigateBack,
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                OperatorInfoCard(
                    title = "Configured endpoint",
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    TextField(
                        value = viewModel.endpointURL,
                        onValueChange = { viewModel.endpointURL = it },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        text = "Update the target URL and run a health announcement from this screen.",
                        color = OperatorPalette.subtitle,
                    )
                }
            }
            Column(
                modifier = Modifier.fillMaxWidth(0.34f),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.End,
            ) {
                OperatorPrimaryButton(
                    text = "Run health check",
                    icon = Icons.Filled.NetworkCheck,
                    onClick = {
                        coroutineScope.launch {
                            viewModel.announceHealthStatus()
                        }
                    },
                )
            }
        }
    }
}
