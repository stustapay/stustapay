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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustapay.stustapay.BuildConfig
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold

@Preview
@Composable
fun AboutView(navigateBack: () -> Unit = {}) {
    OperatorScaffold(
        title = stringResource(R.string.about_title),
        subtitle = stringResource(R.string.about_subtitle),
        icon = Icons.Filled.Info,
        terminalLabel = stringResource(R.string.about_terminal_label),
        footerHint = stringResource(R.string.about_footer_hint),
        footerSection = stringResource(R.string.about_footer_section),
        footerStatus = stringResource(R.string.about_footer_status),
        onBack = navigateBack,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OperatorInfoCard(
                title = stringResource(R.string.about_version_name),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = BuildConfig.VERSION_NAME,
                    color = OperatorPalette.title,
                )
            }
            OperatorInfoCard(
                title = stringResource(R.string.about_version_code),
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
