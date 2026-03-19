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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
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
        title = "EC Reader",
        subtitle = "SumUp configuration and maintenance for the configured terminal.",
        icon = Icons.Filled.CreditCard,
        terminalLabel = "Settings",
        footerHint = "Keeps the existing SumUp login, logout, and reader maintenance actions.",
        footerSection = "Reader",
        footerStatus = "Settings",
        onBack = navigateBack,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OperatorInfoCard(
                title = "Current reader state",
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(text = sumUpLoginState ?: "No login info", color = OperatorPalette.title)
                Text(text = status, color = OperatorPalette.title)
                Text(text = sumUpState.msg(), color = OperatorPalette.subtitle)
            }

            OperatorPrimaryButton(
                text = "User/password login",
                icon = Icons.Filled.Login,
                onClick = { scope.launch { viewModel.openLogin(context) } },
            )
            OperatorPrimaryButton(
                text = "Token login",
                icon = Icons.Filled.Key,
                onClick = { scope.launch { viewModel.performTokenLogin(context) } },
            )
            OperatorSecondaryButton(
                text = "Card reader settings",
                icon = Icons.Filled.PointOfSale,
                onClick = { scope.launch { viewModel.openCardReader(context) } },
            )
        }
    }
}
