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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.ui.common.Spinner
import kotlinx.coroutines.launch

@Composable
fun TerminalConfig(
    viewModel: TerminalConfigViewModel = hiltViewModel(),
    fetchConfig: Boolean = true
) {
    val loginState by viewModel.uiState.collectAsStateWithLifecycle()
    val configLoading by viewModel.configLoading.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    LaunchedEffect(fetchConfig) {
        viewModel.fetchAccessData()
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
                scope.launch {
                    viewModel.fetchAccessData()
                }
            },
            enabled = !configLoading,
        ) {
            if (configLoading) {
                Spinner()
            } else {
                Icon(Icons.Filled.Refresh, "Refresh")
            }
        }
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            val title = loginState.title()
            Text(
                text = title.title,
                style = MaterialTheme.typography.h4,
                modifier = Modifier.padding(top = 10.dp)
            )
            if (title.subtitle != null) {
                Text(
                    text = title.subtitle,
                    style = MaterialTheme.typography.h5,
                    modifier = Modifier.padding(top = 10.dp)
                )
            }

            LoginProfile(viewModel)
        }
    }
}