package de.stustapay.stustapay.ui.settings

import android.app.Activity
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorSecondaryButton
import kotlinx.coroutines.launch

@Composable
fun ECSettingsView(
    navigateBack: () -> Unit = {},
    viewModel: ECSettingsViewModel = hiltViewModel(),
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val sumUpState by viewModel.sumUpState.collectAsStateWithLifecycle()
    val sumUpLoginState by viewModel.sumUpLogin.collectAsStateWithLifecycle()

    val scope = rememberCoroutineScope()

    val context = LocalActivity.current!!

    OperatorScaffold(
        title = stringResource(R.string.ec_reader_title),
        subtitle = stringResource(R.string.ec_reader_subtitle),
        icon = Icons.Filled.CreditCard,
        terminalLabel = stringResource(R.string.ec_reader_terminal_label),
        footerHint = stringResource(R.string.ec_reader_footer_hint),
        footerSection = stringResource(R.string.ec_reader_footer_section),
        footerStatus = stringResource(R.string.ec_reader_footer_status),
        onBack = navigateBack,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OperatorInfoCard(
                title = stringResource(R.string.ec_reader_state_title),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = sumUpLoginState ?: stringResource(R.string.ec_reader_no_login_info),
                    color = OperatorPalette.title,
                )
                Text(text = status, color = OperatorPalette.title)
                Text(text = sumUpState.msg(), color = OperatorPalette.subtitle)
            }

            OperatorPrimaryButton(
                text = stringResource(R.string.ec_reader_login_user_password),
                icon = Icons.Filled.Login,
                onClick = { scope.launch { viewModel.openLogin(context) } },
            )
            OperatorPrimaryButton(
                text = stringResource(R.string.ec_reader_login_token),
                icon = Icons.Filled.Key,
                onClick = { scope.launch { viewModel.performTokenLogin(context) } },
            )
            OperatorSecondaryButton(
                text = stringResource(R.string.ec_reader_settings_button),
                icon = Icons.Filled.PointOfSale,
                onClick = { scope.launch { viewModel.openCardReader(context) } },
            )
        }
    }
}
