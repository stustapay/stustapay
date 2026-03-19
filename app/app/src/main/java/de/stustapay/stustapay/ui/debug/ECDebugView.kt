package de.stustapay.stustapay.ui.debug

import android.app.Activity
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.stustapay.ui.common.operator.OperatorInfoCard
import de.stustapay.stustapay.ui.common.operator.OperatorPalette
import de.stustapay.stustapay.ui.common.operator.OperatorPrimaryButton
import de.stustapay.stustapay.ui.common.operator.OperatorScaffold
import de.stustapay.stustapay.ui.common.operator.OperatorSecondaryButton
import kotlinx.coroutines.launch

@Preview
@Composable
fun ECDebugView(
    navigateBack: () -> Unit = {},
    viewModel: ECDebugViewModel = hiltViewModel(),
) {
    val status by viewModel.status.collectAsStateWithLifecycle()
    val sumUpState by viewModel.sumUpState.collectAsStateWithLifecycle()

    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()

    val context = LocalActivity.current!!

    OperatorScaffold(
        title = "EC Payment",
        subtitle = "Internal SumUp login, reader, and checkout diagnostics.",
        icon = Icons.Filled.CreditCard,
        terminalLabel = "SumUp",
        footerHint = "Preserves the real debug actions: login, token login, logout, reader settings, deprecated settings, and test checkout.",
        footerSection = "Payments",
        footerStatus = "6 actions",
        onBack = navigateBack,
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState),
            horizontalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                OperatorInfoCard(
                    title = "Current integration state",
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(text = status, color = OperatorPalette.title)
                    Text(text = sumUpState.msg(), color = OperatorPalette.subtitle)
                }
                OperatorInfoCard(
                    title = "Test checkout flow",
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = "Use this route to validate that SumUp returns to the app after a live checkout or cancellation.",
                        color = OperatorPalette.subtitle,
                    )
                }
            }
            Column(
                modifier = Modifier.fillMaxWidth(0.34f),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                OperatorPrimaryButton(
                    text = "User/password login",
                    icon = Icons.Filled.Login,
                    onClick = { scope.launch { viewModel.openLogin(context) } },
                )
                OperatorPrimaryButton(
                    text = "Token login",
                    icon = Icons.Filled.Key,
                    onClick = { scope.launch { viewModel.tokenLogin(context) } },
                )
                OperatorPrimaryButton(
                    text = "Open test checkout",
                    icon = Icons.Filled.ReceiptLong,
                    onClick = { scope.launch { viewModel.openCheckout(context) } },
                )
                OperatorSecondaryButton(
                    text = "Reader settings",
                    icon = Icons.Filled.PointOfSale,
                    onClick = { scope.launch { viewModel.openCardReader(context) } },
                )
            }
        }
    }
}
