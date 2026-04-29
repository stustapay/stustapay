package de.stustapay.stustapay.ui.root

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.api.models.TerminalMode
import de.stustapay.libssp.ui.common.Spinner
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.selfservice.SelfServicePalette

@Composable
fun TerminalConfig(
    viewModel: TerminalConfigViewModel = hiltViewModel(),
    fetchConfig: Boolean = true,
    selfServiceMode: Boolean = false,
) {
    val loginState by viewModel.uiState.collectAsStateWithLifecycle()
    val configLoading by viewModel.configLoading.collectAsStateWithLifecycle()

    LaunchedEffect(fetchConfig) {
        if (fetchConfig) {
            viewModel.refreshAccessData()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth(),
    ) {
        IconButton(
            modifier = Modifier
                .align(alignment = Alignment.TopEnd)
                .padding(top = 15.dp, end = 20.dp)
                .size(30.dp),
            onClick = {
                viewModel.refreshAccessData()
            },
            enabled = !configLoading,
        ) {
            if (configLoading) {
                Spinner()
            } else {
                Icon(
                    imageVector = Icons.Filled.Refresh,
                    contentDescription = "Aktualisieren",
                    tint = if (selfServiceMode) SelfServicePalette.title else MaterialTheme.colors.onSurface
                )
            }
        }
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            val title = loginState.title()
            val subtitle = if (loginState.isEntryMode()) {
                when (loginState.terminalMode()) {
                    TerminalMode.entry -> stringResource(R.string.entry_direction_entry)
                    TerminalMode.exit -> stringResource(R.string.entry_direction_exit)
                    else -> null
                }
            } else {
                title.subtitle
            }
            Text(
                text = title.title,
                style = MaterialTheme.typography.h4,
                color = if (selfServiceMode) SelfServicePalette.title else MaterialTheme.colors.onSurface,
                modifier = Modifier.padding(top = 10.dp)
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.h5,
                    color = if (selfServiceMode) SelfServicePalette.title else MaterialTheme.colors.onSurface,
                    modifier = Modifier.padding(top = 10.dp)
                )
            }

            LoginProfile(
                viewModel = viewModel,
                selfServiceMode = selfServiceMode,
            )
        }
    }
}
