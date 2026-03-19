package de.stustapay.stustapay.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustapay.stustapay.BuildConfig
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold

@Preview
@Composable
fun AboutView(navigateBack: () -> Unit = {}) {
    OperatorScaffold(
        title = "About",
        subtitle = "Version and build metadata for the installed app.",
        icon = Icons.Filled.Info,
        terminalLabel = "App Info",
        footerHint = "Read-only build metadata from BuildConfig.",
        footerSection = "About",
        footerStatus = "Read only",
        onBack = navigateBack,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OperatorInfoCard(
                title = "Version name",
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = BuildConfig.VERSION_NAME,
                    color = OperatorPalette.title,
                )
            }
            OperatorInfoCard(
                title = "Version code",
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = BuildConfig.VERSION_CODE.toString(),
                    color = OperatorPalette.title,
                )
            }
        }
    }
}
