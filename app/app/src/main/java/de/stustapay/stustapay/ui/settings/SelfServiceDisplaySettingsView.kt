package de.stustapay.stustapay.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Brightness2
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorActionCard
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.selfservice.AppDisplayMode
import de.stustapay.stustapay.ui.common.selfservice.AppDisplayModeManager
import de.stustapay.stustapay.ui.common.selfservice.AppDisplayModeState

@Preview
@Composable
fun SelfServiceDisplaySettingsView(
    navigateBack: () -> Unit = {},
) {
    val context = LocalContext.current
    val currentMode = AppDisplayModeState.current
    val isManaged = AppDisplayModeState.isManaged
    val currentModeLabel = when (currentMode) {
        AppDisplayMode.Day -> stringResource(R.string.settings_selfservice_display_day)
        AppDisplayMode.Night -> stringResource(R.string.settings_selfservice_display_night)
    }

    OperatorScaffold(
        title = stringResource(R.string.settings_selfservice_display_title),
        subtitle = stringResource(
            if (isManaged) {
                R.string.settings_selfservice_display_subtitle_managed
            } else {
                R.string.settings_selfservice_display_subtitle
            }
        ),
        icon = Icons.Filled.WbSunny,
        terminalLabel = stringResource(R.string.settings_selfservice_display_terminal_label),
        footerHint = stringResource(R.string.settings_selfservice_display_footer_hint),
        footerSection = stringResource(R.string.settings_selfservice_display_footer_section),
        footerStatus = stringResource(
            if (isManaged) {
                R.string.settings_selfservice_display_footer_status_managed
            } else {
                R.string.settings_selfservice_display_footer_status
            }
        ),
        onBack = navigateBack,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OperatorInfoCard(
                title = stringResource(R.string.settings_selfservice_display_title),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = stringResource(R.string.settings_selfservice_display_current, currentModeLabel),
                    color = OperatorPalette.title,
                )
                Text(
                    text = stringResource(
                        if (isManaged) {
                            R.string.settings_selfservice_display_remote_notice
                        } else {
                            R.string.settings_selfservice_display_footer_hint
                        }
                    ),
                    color = OperatorPalette.subtitle,
                )
            }

            OperatorActionCard(
                title = stringResource(R.string.settings_selfservice_display_day),
                description = stringResource(R.string.settings_selfservice_display_day_desc),
                icon = Icons.Filled.WbSunny,
                emphasized = currentMode == AppDisplayMode.Day,
                onClick = if (isManaged) {
                    null
                } else {
                    {
                        AppDisplayModeManager.persistDisplayMode(context, AppDisplayMode.Day)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )

            OperatorActionCard(
                title = stringResource(R.string.settings_selfservice_display_night),
                description = stringResource(R.string.settings_selfservice_display_night_desc),
                icon = Icons.Filled.Brightness2,
                emphasized = currentMode == AppDisplayMode.Night,
                onClick = if (isManaged) {
                    null
                } else {
                    {
                        AppDisplayModeManager.persistDisplayMode(context, AppDisplayMode.Night)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
